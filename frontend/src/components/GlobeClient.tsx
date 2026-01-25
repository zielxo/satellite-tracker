"use client";

import dynamic from "next/dynamic";
import type { CurrentPosition } from "../lib/api";

type GlobeClientProps = {
  onPosition?: (pos: CurrentPosition) => void;
};

const CesiumGlobe = dynamic(() => import("./CesiumGlobe"), { ssr: false });

export default function GlobeClient({ onPosition }: GlobeClientProps) {
  return <CesiumGlobe onPosition={onPosition} />;
}