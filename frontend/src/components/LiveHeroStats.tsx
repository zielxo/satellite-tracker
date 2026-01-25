"use client";

import { useLivePosition } from "./LivePositionContext";

export default function LiveHeroStats() {
  // Pull latest state
  const { position } = useLivePosition();
  
  // Values formatted for display ("--" default for null position)
  const alt = position ? position.altitude.toFixed(1) : "--";
  const lat = position ? position.latitude.toFixed(2) : "--";
  const lng = position ? position.longitude.toFixed(2) : "--";
  const vel = position ? position.velocity_kmh.toFixed() : "--";

  return (
    <div className="items-end flex flex-col gap-2">
      <div className="flex gap-4">
        <div className="items-end flex flex-col">
          <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-500">
            Altitude
          </span>
          <span className="text-2xl font-medium text-zinc-900 font-mono dark:text-white">
            {alt}
            <span className="text-sm text-zinc-400">km</span>
          </span>
        </div>
        <div className="w-px h-10 bg-zinc-200 dark:bg-zinc-800"></div>
        <div className="items-end flex flex-col">
          <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-500">
            Velocity
          </span>
          <span className="text-2xl font-medium text-zinc-900 font-mono dark:text-white">
            {vel}
            <span className="text-sm text-zinc-400">km/h</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500 uppercase dark:text-zinc-500">
        <span className="font-bold tracking-widest">Lat</span>
        <span className="font-mono text-zinc-700 dark:text-zinc-200">{lat}</span>
        <span className="font-bold tracking-widest">Lng</span>
        <span className="font-mono text-zinc-700 dark:text-zinc-200">{lng}</span>
      </div>
    </div>
  );
}
