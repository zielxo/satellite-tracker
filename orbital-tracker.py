from skyfield.api import load, EarthSatellite, Topos
from typing import Dict, Tuple, List
from datetime import datetime

class OrbitCalculator:
    def __init__(self):
        # Load map of the solar system
        self.ts = load.timescale()
        self.planets = load('de421.bsp')
        self.earth = self.planets['earth']
    
    def parse_tle(self, name: str, line1: str, line2: str) -> EarthSatellite:
        # Initalize satellite object from TLE lines
        line1 = line1.strip()
        line2 = line2.strip()

        # TLE Standard Verification
        if not line1.startswith("1") or not line2.startswith("2"):
            raise ValueError("Invalid TLE")
        
        return EarthSatellite(line1, line2, name, self.ts)

    def get_current_location(self, satellite: EarthSatellite) -> Dict[str, float]:
        t = self.ts.now()
        subpoint = satellite.at(t).subpoint();
        return {
            "latitude": subpoint.latitude.degrees, 
            "longitude": subpoint.longitude.degrees, 
            "altitude": subpoint.elevation.km
        }
    
    def predict_passes(self, satellite: EarthSatellite, user_lat: float, user_lng: float) -> List[Dict]:
        
        # Observer's Location
        observerLoc = Topos(latitude_degrees=user_lat, longitutde_degrees=user_lng)

        # Time Window of Observation (24h)
        t0 = self.ts.now()
        t1 = self.ts.utc(t0.utc_datetime.year, t0.utc_datetime().month, t0.utc_datetime().day + 1)

        # 0 = rising, 1 = highest point reached by satellite, 2 = set
        times, events = satellite.find_events(observerLoc, t0, t1, altitude_degrees=0.0)

        passes = []
        current_pass = {}

        for t, event in zip(times, events):
            if event == 0:
                current_pass = {"rise_time": t.utc_datetime()}
            elif event == 1:
                current_pass["culmination_time"] = t.utc_datetime()
                current_pass["max_elevation_deg"] = satellite.at(t).altaz(observerLoc)[0].degrees
            elif event == 2:
                current_pass["set_time"] = t.utc_datetime()
                if current_pass:
                    passes.append(current_pass)
                    current_pass = {}

        pass

if __name__ == "__main__":
    # TLE for ISS test
    name = "ISS (ZARYA)"
    l1 = "1 25544U 98067A   24004.88295602  .00016717  00000-0  30143-3 0  9990"
    l2 = "2 25544  51.6416 253.3087 0005528  71.5033 288.5913 15.49815774432921"