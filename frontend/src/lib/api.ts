export type TrajectoryPoint = {
  time: string;
  latitude: number;
  longitude: number;
  altitude: number;
};

export type CurrentPosition = {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity_kmh: number;
  trajectory: TrajectoryPoint[];
};

export type PassInfo = {
  rise_time_utc: string;
  culmination_time_utc: string;
  set_time_utc: string;
  rise_time_local: string;
  culmination_time_local: string;
  set_time_local: string;
  duration_minutes: number;
  max_elevation_deg: number;
  visibility: string;
};

export type PassFinderResponse = {
  query: {
    latitude: number;
    longitude: number;
    address: string | null;
    utc_offset_minutes: number;
    timezone_label: string;
  };
  next_pass: PassInfo | null;
  email_scheduled: boolean;
  notify_at_utc: string | null;
  notify_at_local: string | null;
  message: string;
};

export type PassItem = {
  rise_time: string;
  culmination_time: string;
  set_time: string;
  max_elevation_deg: number;
};

type TlePayload = {
  name: string;
  line1: string;
  line2: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const DEFAULT_TLE: TlePayload = {
  name: "ISS (ZARYA)",
  line1: "1 25544U 98067A   26008.88709191  .00008359  00000-0  15864-3 0  9991",
  line2: "2 25544  51.6333   8.0698 0007663 356.5554   3.5381 15.49180370547069",
};

async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  if (!BASE_URL) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export function fetchCurrentPosition(tle: TlePayload = DEFAULT_TLE) {
  return apiPost<CurrentPosition>("/current", tle);
}

export function fetchPassFinder(payload: {
  user_lat?: number;
  user_lng?: number;
  address?: string;
  utc_offset_minutes: number;
  email?: string;
}) {
  return apiPost<PassFinderResponse>("/pass-finder", { ...DEFAULT_TLE, ...payload });
}

export async function fetchPasses(payload: { user_lat: number; user_lng: number }) {
  const tle = DEFAULT_TLE;
  return apiPost<{ passes: PassItem[] }>("/passes", { ...tle, ...payload });
}
