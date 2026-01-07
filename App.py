from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict

from orbital_tracker import OrbitCalculator

app = FastAPI()
calc = OrbitCalculator()

class TLEPayload(BaseModel):
    name: str
    line1: str
    line2: str

class CurrentRequest(TLEPayload):
    pass

class PassesRequest(TLEPayload):
    user_lat: float
    user_lng: float

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

@app.post("/current")
def current_location(req: CurrentRequest):
    try:
        sat = calc.parse_tle(req.name, req.line1, req.line2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return calc.get_current_location(sat)

@app.post("/passes")
def predict_passes(req: PassesRequest):
    try:
        sat = calc.parse_tle(req.name, req.line1, req.line2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    passes = calc.predict_passes(sat, req.user_lat, req.user_lng)
    return {"passes": serialize_passes(passes)}
