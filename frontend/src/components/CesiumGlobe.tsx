"use client";

import { useEffect, useMemo, useState } from "react";
import { Viewer, Entity } from "resium";
import {
  Cartesian3,
  Color,
  Ion,
  JulianDate,
  SampledPositionProperty,
  ExtrapolationType,
} from "cesium";

import { fetchCurrentPosition, type CurrentPosition } from "../lib/api";

const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

type CesiumGlobeProps = {
  onPosition?: (pos: CurrentPosition) => void;
};

// Cesium static asset load location
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
}

if (ionToken) {
  Ion.defaultAccessToken = ionToken;
}

export default function CesiumGlobe({ onPosition }: CesiumGlobeProps) {
  if (!ionToken) {
    return <p>Missing NEXT_PUBLIC_CESIUM_ION_TOKEN in .env.local</p>;
  }

  // Motion interpolation via Cesium time-sampled position property.
  const sampledPosition = useMemo(() => {
    const prop = new SampledPositionProperty();
    prop.forwardExtrapolationType = ExtrapolationType.HOLD;
    prop.backwardExtrapolationType = ExtrapolationType.HOLD;
    return prop;
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [trajectoryPositions, setTrajectoryPositions] = useState<Cartesian3[]>([]);

  useEffect(() => {
    let alive = true;

    // Get real time position + trajectory.
    async function tick() {
      try {
        const data = await fetchCurrentPosition();
        if (!alive) {
          return;
        }
        onPosition?.(data);
        const altitudeMeters = data.altitude * 1000;

        // New time sample for moving satellite display
        sampledPosition.addSample(
          JulianDate.now(),
          Cartesian3.fromDegrees(data.longitude, data.latitude, altitudeMeters)
        );

        // Trajectory conversion -> Cesium world coordinates
        const trajectory = data.trajectory ?? [];
        if (trajectory.length) {
          setTrajectoryPositions(
            trajectory.map((point) =>
              Cartesian3.fromDegrees(
                point.longitude,
                point.latitude,
                point.altitude * 1000
              )
            )
          );
        } else {
          setTrajectoryPositions([]);
        }
        setError(null);
      } catch (err) {
        if (alive) {
          setError((err as Error).message);
        }
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [sampledPosition]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <Viewer
        style={{ width: "100%", height: "100%" }}
        shouldAnimate
        timeline={false}
        animation={true}
      >
        <Entity
          name="Trajectory"
          polyline={{
            positions: trajectoryPositions,
            width: 2,
            material: Color.CYAN.withAlpha(0.6),
          }}
        />
        <Entity
          name="Satellite"
          position={sampledPosition}
          point={{ pixelSize: 8, color: Color.CYAN }}
        />
      </Viewer>
    </div>
  );
}
