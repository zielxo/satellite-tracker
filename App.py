import os
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional
from dotenv import load_dotenv
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from geopy.exc import GeocoderRateLimited, GeocoderUnavailable

from orbital_tracker import OrbitCalculator

app = FastAPI()
calc = OrbitCalculator()

load_dotenv()

DB_PATH = os.environ.get("DATABASE_PATH", "data/satellite.db")
MAILGUN_DOMAIN = os.environ.get("MAILGUN_DOMAIN")
MAILGUN_API_KEY = os.environ.get("MAILGUN_API_KEY")
MAILGUN_FROM = os.environ.get("MAILGUN_FROM")

_geocoder = Nominatim(user_agent="satellite-tracker", timeout=10)
_geocode = RateLimiter(_geocoder.geocode, min_delay_seconds=1.0)
_geocode_cache: Dict[str, Dict[str, object]] = {}
_geocode_cache_ttl = 60 * 60 * 12

_stop_event = threading.Event()

## Init SQLite table if there isn't an exisiting one.
## Used for scheduling emails
def init_db() -> None:
    dir_name = os.path.dirname(DB_PATH)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pass_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                timezone TEXT NOT NULL,
                rise_time_utc TEXT NOT NULL,
                culmination_time_utc TEXT NOT NULL,
                set_time_utc TEXT NOT NULL,
                max_elevation_deg REAL NOT NULL,
                notify_at_utc TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at_utc TEXT NOT NULL,
                last_error TEXT
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

## Checks if Mailgun credentials are provided
def mailgun_configured() -> bool:
    return bool(MAILGUN_DOMAIN and MAILGUN_API_KEY and MAILGUN_FROM)

## Mailgun API call
def send_mailgun_email(to_email: str, subject: str, body: str) -> Optional[str]:
    if not mailgun_configured():
        return "Mailgun not configured"
    response = requests.post(
        f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
        auth=("api", MAILGUN_API_KEY),
        data={
            "from": MAILGUN_FROM,
            "to": to_email,
            "subject": subject,
            "text": body,
        },
        timeout=15,
    )
    if response.status_code >= 400:
        return response.text
    return None

## Inserts new emails schedule rows into SQLite.
def schedule_notification(
    email: str,
    latitude: float,
    longitude: float,
    tz_label: str,
    rise_time_utc: datetime,
    culmination_time_utc: datetime,
    set_time_utc: datetime,
    max_elevation_deg: float,
    notify_at_utc: datetime,
) -> int:
    conn = get_db()
    try:
        cur = conn.execute(
            """
            INSERT INTO pass_notifications (
                email,
                latitude,
                longitude,
                timezone,
                rise_time_utc,
                culmination_time_utc,
                set_time_utc,
                max_elevation_deg,
                notify_at_utc,
                status,
                created_at_utc
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email,
                latitude,
                longitude,
                tz_label,
                rise_time_utc.isoformat(),
                culmination_time_utc.isoformat(),
                set_time_utc.isoformat(),
                max_elevation_deg,
                notify_at_utc.isoformat(),
                "PENDING",
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()

## Background check every minute for upcoming due emails to be sent out.
def notifier_loop(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        conn = get_db()
        try:
            rows = conn.execute(
                """
                SELECT *
                FROM pass_notifications
                WHERE status = 'PENDING'
                  AND notify_at_utc <= ?
                """,
                (now.isoformat(),),
            ).fetchall()
            for row in rows:
                subject = "ISS pass reminder"
                body = (
                    f"Upcoming ISS pass for your location.\n\n"
                    f"Rise (UTC): {row['rise_time_utc']}\n"
                    f"Culmination (UTC): {row['culmination_time_utc']}\n"
                    f"Set (UTC): {row['set_time_utc']}\n"
                    f"Max Elevation: {row['max_elevation_deg']:.1f} deg\n"
                )
                error = send_mailgun_email(row["email"], subject, body)
                if error:
                    conn.execute(
                        "UPDATE pass_notifications SET status = ?, last_error = ? WHERE id = ?",
                        ("ERROR", error, row["id"]),
                    )
                else:
                    conn.execute(
                        "UPDATE pass_notifications SET status = ?, last_error = NULL WHERE id = ?",
                        ("SENT", row["id"]),
                    )
            conn.commit()
        finally:
            conn.close()
        stop_event.wait(60)

## Nominatim used to convert user address into lat/lng.
## Cached for 12 hours
def geocode_address(address: str) -> Dict[str, object]:
    key = address.strip().lower()
    if not key:
        raise HTTPException(status_code=400, detail="Address is empty")
    cached = _geocode_cache.get(key)
    if cached and cached["expires_at"] > time.time():
        return cached
    try:
        location = _geocode(address)
    except (GeocoderUnavailable, GeocoderRateLimited, Exception) as exc:
        raise HTTPException(status_code=502, detail=f"Geocoding failed: {exc}")
    if not location:
        raise HTTPException(status_code=404, detail="Address not found")
    result = {
        "latitude": float(location.latitude),
        "longitude": float(location.longitude),
        "address": location.address,
        "expires_at": time.time() + _geocode_cache_ttl,
    }
    _geocode_cache[key] = result
    return result

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    thread = threading.Thread(target=notifier_loop, args=(_stop_event,), daemon=True)
    thread.start()


@app.on_event("shutdown")
def on_shutdown() -> None:
    _stop_event.set()

## Request Models
class TLEPayload(BaseModel):
    name: str
    line1: str
    line2: str

class CurrentRequest(TLEPayload):
    pass

class PassesRequest(TLEPayload):
    user_lat: float
    user_lng: float

class PassFinderRequest(TLEPayload):
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    address: Optional[str] = None
    utc_offset_minutes: int
    email: Optional[EmailStr] = None

## Convert pass objects to JSON safe format
def serialize_passes(passes: List[Dict]) -> List[Dict]:
    out = []
    for p in passes:
        out.append({
            "rise_time": p["rise_time"].isoformat(),
            "culmination_time": p["culmination_time"].isoformat(),
            "set_time": p["set_time"].isoformat(),
            "max_elevation_deg": p["max_elevation_deg"],
        })
    return out

## Guarantee that a datetime is timezone aware in UTC.
def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

## Format pass into UTC + local time strings + metadata
def format_pass(pass_info: Dict, tz: timezone) -> Dict[str, object]:
    rise_utc = ensure_utc(pass_info["rise_time"])
    culmination_utc = ensure_utc(pass_info["culmination_time"])
    set_utc = ensure_utc(pass_info["set_time"])
    duration_seconds = int((set_utc - rise_utc).total_seconds())
    return {
        "rise_time_utc": rise_utc.isoformat(),
        "culmination_time_utc": culmination_utc.isoformat(),
        "set_time_utc": set_utc.isoformat(),
        "rise_time_local": rise_utc.astimezone(tz).strftime("%Y-%m-%d %H:%M"),
        "culmination_time_local": culmination_utc.astimezone(tz).strftime("%Y-%m-%d %H:%M"),
        "set_time_local": set_utc.astimezone(tz).strftime("%Y-%m-%d %H:%M"),
        "duration_minutes": round(duration_seconds / 60),
        "max_elevation_deg": pass_info["max_elevation_deg"],
        "visibility": "Visible",
    }

## Convert minutes offset to UTC+
def format_offset_label(offset_minutes: int) -> str:
    sign = "+" if offset_minutes >= 0 else "-"
    abs_minutes = abs(offset_minutes)
    hours = abs_minutes // 60
    minutes = abs_minutes % 60
    return f"UTC{sign}{hours:02d}:{minutes:02d}"

## Returns the current satellite position + trajectory.
@app.post("/current")
def current_location(req: CurrentRequest):
    try:
        sat = calc.parse_tle(req.name, req.line1, req.line2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return calc.get_current_location(sat)

## Returns the next visible pass for the users provided location.
@app.post("/passes")
def predict_passes(req: PassesRequest):
    try:
        sat = calc.parse_tle(req.name, req.line1, req.line2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    passes = calc.predict_passes(sat, req.user_lat, req.user_lng)
    return {"passes": serialize_passes(passes)}

## Gets location, computes the next pass, and if provided schedules an email noti for the user.
@app.post("/pass-finder")
def pass_finder(req: PassFinderRequest):
    try:
        sat = calc.parse_tle(req.name, req.line1, req.line2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    offset_minutes = int(req.utc_offset_minutes)
    if offset_minutes < -14 * 60 or offset_minutes > 14 * 60:
        raise HTTPException(status_code=400, detail="Invalid UTC offset")
    tz = timezone(timedelta(minutes=offset_minutes))
    offset_label = format_offset_label(offset_minutes)

    resolved_address = None
    if req.user_lat is not None and req.user_lng is not None:
        latitude = float(req.user_lat)
        longitude = float(req.user_lng)
    elif req.address:
        geo = geocode_address(req.address)
        latitude = float(geo["latitude"])
        longitude = float(geo["longitude"])
        resolved_address = geo["address"]
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide latitude/longitude or an address",
        )

    passes = calc.predict_passes(sat, latitude, longitude)
    if not passes:
        return {
            "query": {
                "latitude": latitude,
                "longitude": longitude,
                "address": resolved_address,
                "utc_offset_minutes": offset_minutes,
                "timezone_label": offset_label,
            },
            "next_pass": None,
            "email_scheduled": False,
            "notify_at_utc": None,
            "notify_at_local": None,
            "message": "No visible passes in the next few days.",
        }

    next_pass = passes[0]
    pass_data = format_pass(next_pass, tz)

    email_scheduled = False
    notify_at_utc = None
    notify_at_local = None

    if req.email:
        if not mailgun_configured():
            raise HTTPException(
                status_code=400,
                detail="Mailgun is not configured on the server",
            )
        rise_utc = ensure_utc(next_pass["rise_time"])
        notify_at = rise_utc - timedelta(days=2)
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        if notify_at < now:
            notify_at = now
        schedule_notification(
            email=str(req.email),
            latitude=latitude,
            longitude=longitude,
            tz_label=offset_label,
            rise_time_utc=rise_utc,
            culmination_time_utc=ensure_utc(next_pass["culmination_time"]),
            set_time_utc=ensure_utc(next_pass["set_time"]),
            max_elevation_deg=next_pass["max_elevation_deg"],
            notify_at_utc=notify_at,
        )
        email_scheduled = True
        notify_at_utc = notify_at.isoformat()
        notify_at_local = notify_at.astimezone(tz).strftime("%Y-%m-%d %H:%M")

    return {
        "query": {
            "latitude": latitude,
            "longitude": longitude,
            "address": resolved_address,
            "utc_offset_minutes": offset_minutes,
            "timezone_label": offset_label,
        },
        "next_pass": pass_data,
        "email_scheduled": email_scheduled,
        "notify_at_utc": notify_at_utc,
        "notify_at_local": notify_at_local,
        "message": "Next pass calculated.",
    }