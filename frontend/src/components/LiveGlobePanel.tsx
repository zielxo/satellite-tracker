"use client";

import GlobeClient from "./GlobeClient";
import { useLivePosition } from "./LivePositionContext";

export default function LiveGlobePanel() {
  const { setPosition } = useLivePosition();

  return (
    <div className="absolute inset-0 z-10">
      <GlobeClient onPosition={setPosition} />
    </div>
  );
}
