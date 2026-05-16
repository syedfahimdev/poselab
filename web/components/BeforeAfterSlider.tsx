"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
};

/**
 * A pointer-driven before/after slider. Mobile + desktop friendly.
 * The "after" image is clipped via inset() to the right of the slider position.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Original",
  afterAlt = "Enhanced",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50); // 0..100

  const move = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  function start(e: PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    move(e.clientX);
  }
  function drag(e: PointerEvent<HTMLDivElement>) {
    if (e.buttons === 0) return; // only when pressed
    move(e.clientX);
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={start}
      onPointerMove={drag}
      role="slider"
      tabIndex={0}
      aria-label="Before / after"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
        if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
      }}
      className="
        relative w-full select-none touch-none
        rounded-2xl overflow-hidden border border-border
        bg-black
        aspect-[4/5] sm:aspect-[3/2]
        cursor-ew-resize
      "
    >
      {/* Before is the base layer */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeSrc}
        alt={beforeAlt}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      {/* After is clipped */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterSrc}
        alt={afterAlt}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        draggable={false}
      />
      {/* Slider line + handle */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 w-px bg-white/80"
        style={{ left: `${pos}%` }}
      />
      <div
        aria-hidden="true"
        className="
          absolute top-1/2 -translate-y-1/2 -translate-x-1/2
          w-10 h-10 rounded-full bg-white/95 shadow-lg
          flex items-center justify-center
        "
        style={{ left: `${pos}%` }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
          <polyline points="9 18 15 12 9 6" transform="translate(0,0)" />
        </svg>
      </div>

      <span className="absolute top-3 left-3 text-xs uppercase tracking-widest text-white/90 bg-black/40 px-2 py-1 rounded">
        Before
      </span>
      <span className="absolute top-3 right-3 text-xs uppercase tracking-widest text-white/90 bg-black/40 px-2 py-1 rounded">
        After
      </span>
    </div>
  );
}
