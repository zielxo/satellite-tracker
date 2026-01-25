import os

from skyfield.api import load, EarthSatellite, Topos
from typing import Dict, List
from datetime import datetime, timedelta

class OrbitCalculator:
    def __init__(self):
        ## Load map of the solar system / timescale.
        self.ts = load.timescale()
        ephemeris_path = os.environ.get("EPHEMERIS_PATH", "de421.bsp")
        self.planets = load(ephemeris_path)
        self.earth = self.planets['earth']

        ## Cache trajectory so its not recomputed unnecessarily.
        self._last_traj_at = None
        self._last_trajectory = []
    
    def parse_tle(self, name: str, line1: str, line2: str) -> EarthSatellite:
        # Initalize satellite object from TLE lines
        line1 = line1.strip()
        line2 = line2.strip()

        # TLE Standard Verification
        if not line1.startswith("1") or not line2.startswith("2"):
            raise ValueError("Invalid TLE")
        
        return EarthSatellite(line1, line2, name, self.ts)

    def get_current_location(self, satellite: EarthSatellite) -> Dict[str, float]:
        ## Returns the current lat/lng/alt/vel and the future trajectory line.
        t = self.ts.now()
        geocentric = satellite.at(t)
        subpoint = geocentric.subpoint()

        ## Km/s -> km/h
        vx, vy, vz = geocentric.velocity.km_per_s
        speed_km_h = (vx * vx + vy * vy + vz * vz) ** 0.5 * 3600

        ## Trajectory cached for 30min to avoid the costly recompute.
        now = datetime.utcnow()
        if not self._last_traj_at or (now - self._last_traj_at) > timedelta(minutes=30):
            trajectory = self.get_trajectory(satellite, minutes_ahead=60, step_minutes=2)
            self._last_traj_at = now
            self._last_trajectory = trajectory
        else:
            trajectory = self._last_trajectory

        return {
            "latitude": subpoint.latitude.degrees,
            "longitude": subpoint.longitude.degrees,
            "altitude": subpoint.elevation.km,
            "velocity_kmh": speed_km_h,
            "trajectory": trajectory,
        }

    def get_trajectory(
        self, satellite: EarthSatellite, minutes_ahead: int = 60, step_minutes: int = 2
    ) -> List[Dict[str, object]]:
        
        ## Generate future lat/lng/alt points to create the path line.
        base_dt = self.ts.now().utc_datetime()
        points: List[Dict[str, object]] = []
        for offset in range(0, minutes_ahead + 1, step_minutes):
            t = self.ts.utc(base_dt + timedelta(minutes=offset))
            subpoint = satellite.at(t).subpoint()
            points.append(
                {
                    "time": t.utc_datetime().isoformat(),
                    "latitude": subpoint.latitude.degrees,
                    "longitude": subpoint.longitude.degrees,
                    "altitude": subpoint.elevation.km,
                }
            )
        return points
    
    def predict_passes(self, satellite: EarthSatellite, user_lat: float, user_lng: float) -> List[Dict]:
        
        # Observer's Location
        observerLoc = Topos(latitude_degrees=user_lat, longitude_degrees=user_lng)

        # Time Window of Observation (48h)
        t0 = self.ts.now()
        t0_dt = t0.utc_datetime()
        t1 = self.ts.utc(t0_dt.year, t0_dt.month, t0_dt.day + 4)

        # 0 = rising, 1 = highest point reached by satellite, 2 = set
        times, events = satellite.find_events(observerLoc, t0, t1, altitude_degrees=0.0)

        passes: List[Dict] = []
        current_pass: Dict[str, object] = {}

        for t, event in zip(times, events):
            if event == 0:
                current_pass = {"rise_time": t.utc_datetime(), "rise_t": t}
            elif event == 1:
                
                # Max elevation / visibility check
                topocentric = (satellite - observerLoc).at(t)
                alt, _, _ = topocentric.altaz()
                max_elevation_deg = alt.degrees

                # Sun altitude at observer's location
                sun = self.planets["sun"]
                sun_alt, _, _ = (self.earth + observerLoc).at(t).observe(sun).apparent().altaz()
                sun_alt_deg = sun_alt.degrees

                # Satellite illuminated by sun (y/n?)
                is_sunlit = satellite.at(t).is_sunlit(self.planets)

                current_pass.update({
                    "culmination_time": t.utc_datetime(),
                    "max_elevation_deg": max_elevation_deg,
                    "sun_altitude_deg": sun_alt_deg,
                    "is_sunlit": is_sunlit,
                })
            elif event == 2:
                current_pass["set_time"] = t.utc_datetime()

                # Visibility Thresholds
                min_elevation_degrees = 10.0
                max_sun_alt = -6.0

                if current_pass:
                    if (current_pass.get("max_elevation_deg", 0.0) >= min_elevation_degrees
                            and current_pass.get("sun_altitude_deg", 90.0) <= max_sun_alt
                            and current_pass.get("is_sunlit", False)):
                        passes.append({
                            "rise_time": current_pass["rise_time"],
                            "culmination_time": current_pass["culmination_time"],
                            "set_time": current_pass["set_time"],
                            "max_elevation_deg": current_pass["max_elevation_deg"],
                        })

                current_pass = {}

        return passes

if __name__ == "__main__":
    """
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
    """