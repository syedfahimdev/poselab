"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEVICE_LABELS,
  DEVICE_SHORT,
  type Card,
  type Device,
  type Scenario,
} from "@/lib/settingsCards";

type Props = {
  cards: { device: Device; card: Card }[];
  initialDevice: Device;
  scenario: Scenario;
};

export function CardDeck({ cards, initialDevice, scenario }: Props) {
  const [active, setActive] = useState<Device>(initialDevice);
  const router = useRouter();
  const params = useSearchParams();

  // Reflect ?device= changes when the user clicks browser back/forward
  useEffect(() => {
    const q = params.get("device");
    if (q && q !== active && cards.some((c) => c.device === q)) {
      setActive(q as Device);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function select(d: Device) {
    setActive(d);
    // Update URL without a full navigation so deep-links work
    const next = new URLSearchParams(params.toString());
    next.set("device", d);
    router.replace(`/settings/${scenario}?${next.toString()}`, { scroll: false });
  }

  const activeCard = cards.find((c) => c.device === active)?.card;
  if (!activeCard) return null;

  const isPhone = active !== "dslr";

  return (
    <div className="flex flex-col gap-5">
      {/* Device tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 scrollbar-hide">
        {cards.map(({ device }) => (
          <button
            key={device}
            type="button"
            onClick={() => select(device)}
            aria-pressed={device === active}
            className={[
              "shrink-0 inline-flex items-center justify-center",
              "h-10 px-4 min-w-[80px]",
              "rounded-full text-sm font-medium",
              "transition-colors border",
              device === active
                ? "bg-accent text-black border-accent"
                : "bg-surface text-foreground border-border hover:border-accent/60",
            ].join(" ")}
          >
            {DEVICE_SHORT[device]}
          </button>
        ))}
      </div>

      {/* The active card */}
      <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{DEVICE_LABELS[active]}</span>
          {isPhone && (
            <span className="text-xs text-muted bg-background border border-border rounded-full px-2.5 py-1">
              Aperture is fixed
            </span>
          )}
        </div>

        <Field label="Mode" value={activeCard.mode} mono />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="ISO" value={activeCard.iso} mono compact />
          <Field
            label="Shutter"
            value={activeCard.shutter}
            mono
            compact
          />
          <Field
            label={isPhone ? "Blur" : "Aperture"}
            value={activeCard.aperture}
            mono
            compact
          />
        </div>
        <Field label="Focus" value={activeCard.focus} />
        <Field label="Pro tip" value={activeCard.tip} accent />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  accent,
  compact,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-widest text-muted">
        {label}
      </span>
      <span
        className={[
          mono ? "font-mono text-sm" : "text-sm sm:text-base",
          "leading-6",
          accent ? "text-accent" : "text-foreground",
          compact ? "" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
