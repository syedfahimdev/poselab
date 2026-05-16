"use client";

import { useId, useMemo, useState } from "react";

type Props = {
  label: string;
  /** The AI's top recommendation for this photo + category. */
  recommended: string;
  /** AI-generated options for this photo + category (4-5 strings, dynamic). */
  options: string[];
  value: string;
  onChange: (next: string) => void;
};

/**
 * A single category section in the enhance form. Options come from the AI
 * (photo-grounded) — not from a hardcoded preset list. The recommended one
 * is highlighted in accent.
 */
export function CategoryGroup({
  label,
  recommended,
  options,
  value,
  onChange,
}: Props) {
  const groupId = useId();

  // Build a deduped, ordered chip list: recommended first, then the rest.
  // We always end with the "Other…" chip for custom freeform input.
  const chips = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    if (recommended && !seen.has(recommended)) {
      out.push(recommended);
      seen.add(recommended);
    }
    for (const o of options) {
      if (!o) continue;
      if (!seen.has(o)) {
        out.push(o);
        seen.add(o);
      }
    }
    return out;
  }, [recommended, options]);

  // Are we in "Other" / custom-text mode? (current value isn't one of the chips)
  const isChip = chips.includes(value);
  const [customMode, setCustomMode] = useState(!isChip && !!value);
  const [customText, setCustomText] = useState(!isChip ? value : "");

  function select(next: string) {
    setCustomMode(false);
    onChange(next);
  }

  function selectCustom() {
    setCustomMode(true);
    onChange(customText);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-foreground">{label}</legend>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isRecommended = chip === recommended;
          return (
            <Chip
              key={`${groupId}-${chip}`}
              label={isRecommended ? `✨ ${chip}` : chip}
              active={!customMode && value === chip}
              accent={isRecommended}
              onClick={() => select(chip)}
            />
          );
        })}
        <Chip
          key={`${groupId}-other`}
          label="Other…"
          active={customMode}
          onClick={selectCustom}
        />
      </div>

      {customMode && (
        <input
          type="text"
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Describe what you want…"
          className="
            h-11 px-4
            rounded-xl
            bg-background border border-border
            text-foreground placeholder:text-muted
            focus:outline-none focus:border-accent
          "
        />
      )}
    </fieldset>
  );
}

function Chip({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center h-10 px-3 rounded-full text-sm transition-colors border min-h-[44px]";
  const inactive = "bg-surface text-foreground border-border hover:border-accent";
  const activeAccent = "bg-accent text-black border-accent";
  const activeNeutral = "bg-foreground text-background border-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        base,
        active ? (accent ? activeAccent : activeNeutral) : inactive,
      ].join(" ")}
    >
      {label}
    </button>
  );
}
