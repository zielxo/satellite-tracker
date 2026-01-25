"use client";

import { useState } from "react";
import GlobeClient from "./GlobeClient";

export default function GlobePanel() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Orbit</h2>
        <button
          type="button"
          className="rounded-md border px-3 py-1 text-sm"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "Hide globe" : "Show globe"}
        </button>
      </div>
      {open ? (
        <div className="aspect-[16/9] w-full">
          <GlobeClient />
        </div>
      ) : null}
    </section>
  );
}
