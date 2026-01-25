"use client";

import { useEffect, useState } from "react";
import { fetchPassFinder, type PassFinderResponse } from "../lib/api";

export default function PassFinderClient() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");
  const [utcOffsetHours, setUtcOffsetHours] = useState("0");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<PassFinderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const offset = -new Date().getTimezoneOffset() / 60;
    setUtcOffsetHours(String(offset));
  }, []);

  const nextPass = result?.next_pass;

  const handleFind = async () => {
    setError(null);
    setResult(null);

    const latProvided = latitude.trim().length > 0;
    const lngProvided = longitude.trim().length > 0;
    const addressProvided = address.trim().length > 0;

    if (!latProvided && !lngProvided && !addressProvided) {
      setError("Provide latitude/longitude or an address.");
      return;
    }

    let latValue: number | undefined;
    let lngValue: number | undefined;
    if (latProvided !== lngProvided) {
      setError("Provide both latitude and longitude.");
      return;
    }
    if (latProvided && lngProvided) {
      latValue = Number(latitude);
      lngValue = Number(longitude);
      if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
        setError("Latitude and longitude must be valid numbers.");
        return;
      }
    }

    const offsetHours = Number(utcOffsetHours);
    if (!Number.isFinite(offsetHours)) {
      setError("UTC offset must be a number.");
      return;
    }
    if (offsetHours < -14 || offsetHours > 14) {
      setError("UTC offset must be between -14 and 14.");
      return;
    }
    const utcOffsetMinutes = Math.round(offsetHours * 60);

    setLoading(true);
    try {
      const response = await fetchPassFinder({
        user_lat: latValue,
        user_lng: lngValue,
        address: addressProvided ? address.trim() : undefined,
        utc_offset_minutes: utcOffsetMinutes,
        email: email.trim() || undefined,
      });
      setResult(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setLatitude("");
    setLongitude("");
    setAddress("");
    setEmail("");
    setResult(null);
    setError(null);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      () => {
        setError("Unable to retrieve your location.");
      }
    );
  };

  return (
    <div className="lg:grid-cols-12 lg:gap-8 grid grid-cols-1 gap-6">
      <div className="lg:col-span-7 relative">
        <div className="rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="bg-zinc-50 dark:bg-black absolute inset-0 opacity-60"></div>
          <div className="relative p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">Your Location</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Enter coordinates or a place name.</p>
              </div>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="text-xs font-semibold tracking-wider uppercase text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Use My Location
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="grid gap-2 text-xs font-bold tracking-widest text-zinc-500 uppercase">
                  Latitude
                  <input
                    type="text"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="40.7128"
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-200/20"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold tracking-widest text-zinc-500 uppercase">
                  Longitude
                  <input
                    type="text"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="-74.0060"
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-200/20"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-xs font-bold tracking-widest text-zinc-500 uppercase">
                City or Address (optional)
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Austin, TX"
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-200/20"
                />
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="grid gap-2 text-xs font-bold tracking-widest text-zinc-500 uppercase">
                  UTC Offset (hours)
                  <input
                    type="number"
                    step="0.5"
                    value={utcOffsetHours}
                    onChange={(event) => setUtcOffsetHours(event.target.value)}
                    placeholder="-5"
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-200/20"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold tracking-widest text-zinc-500 uppercase">
                  Email (optional)
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-200/20"
                  />
                </label>
              </div>
              {error ? (
                <div className="text-sm text-red-500 font-medium">{error}</div>
              ) : null}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={handleFind}
                  disabled={loading}
                  className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-2 rounded-full text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-60"
                >
                  {loading ? "Searching..." : "Find Next Pass"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="border border-zinc-200 dark:border-zinc-800 px-5 py-2 rounded-full text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-lg font-bold text-zinc-900 dark:text-white">Next Pass</p>
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">Preview</span>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Rise</span>
              <span className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                {nextPass?.rise_time_local ?? "--"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Peak Elevation</span>
              <span className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                {nextPass ? `${nextPass.max_elevation_deg.toFixed(1)} deg` : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Duration</span>
              <span className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                {nextPass ? `${nextPass.duration_minutes} min` : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Visibility</span>
              <span className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                {nextPass?.visibility ?? "--"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-zinc-500 font-bold tracking-widest">UTC Offset</span>
              <span className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                {result?.query.timezone_label ?? "--"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <p className="text-sm font-bold tracking-widest text-zinc-500 mb-4 uppercase">Email Notice</p>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {result?.email_scheduled
              ? `Email scheduled for ${result.notify_at_local} (${result.query.timezone_label}). Make sure to check the spam folder!`
              : "Provide an email to schedule a reminder."}
          </div>
        </div>
      </div>
    </div>
  );
}
