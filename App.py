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

if __name__ == "__main__":

    # TLE for ISS test
    name = "ISS (ZARYA)"
    l1 = "1 25544U 98067A   24004.88295602  .00016717  00000-0  30143-3 0  9990"
    l2 = "2 25544  51.6416 253.3087 0005528  71.5033 288.5913 15.49815774432921"
    calc = OrbitCalculator()
    sat = calc.parse_tle(name, l1, l2)

    
    user_lat = 40.7128
    user_lng = 74.0060

    passes = calc.predict_passes(sat, user_lat, user_lng)

    for p in passes:
        print(
            "Rise:", p["rise_time"],
            "Max:", p["culmination_time"],
            "Set:", p["set_time"],
            "Max El:", round(p["max_elevation_deg"], 1)
        )