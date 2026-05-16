"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  labelFor,
  type FinalForm,
  type Scenario,
  type Suggestions,
} from "@/lib/types";
import { CategoryGroup } from "./CategoryGroup";

type Props = {
  suggestions: Suggestions;
  scenario: Scenario;
  initialFreetext?: string;
  busy?: boolean;
  onSubmit: (final: FinalForm) => void;
};

export function EnhanceForm({
  suggestions,
  scenario,
  initialFreetext = "",
  busy,
  onSubmit,
}: Props) {
  const [pose, setPose] = useState(suggestions.pose.recommended);
  const [background, setBackground] = useState(
    suggestions.background.recommended,
  );
  const [lighting, setLighting] = useState(suggestions.lighting.recommended);
  const [style, setStyle] = useState(suggestions.style.recommended);
  const [focus, setFocus] = useState(suggestions.focus.recommended);
  const [freetext, setFreetext] = useState(initialFreetext);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ pose, background, lighting, style, focus, freetext });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-7">
      <CategoryGroup
        label={labelFor("pose", scenario)}
        recommended={suggestions.pose.recommended}
        options={suggestions.pose.options}
        value={pose}
        onChange={setPose}
      />
      <CategoryGroup
        label={CATEGORY_LABELS.background}
        recommended={suggestions.background.recommended}
        options={suggestions.background.options}
        value={background}
        onChange={setBackground}
      />
      <CategoryGroup
        label={CATEGORY_LABELS.lighting}
        recommended={suggestions.lighting.recommended}
        options={suggestions.lighting.options}
        value={lighting}
        onChange={setLighting}
      />
      <CategoryGroup
        label={CATEGORY_LABELS.style}
        recommended={suggestions.style.recommended}
        options={suggestions.style.options}
        value={style}
        onChange={setStyle}
      />
      <CategoryGroup
        label={CATEGORY_LABELS.focus}
        recommended={suggestions.focus.recommended}
        options={suggestions.focus.options}
        value={focus}
        onChange={setFocus}
      />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          💬 Anything else? <span className="text-muted">(optional)</span>
        </span>
        <textarea
          value={freetext}
          onChange={(e) => setFreetext(e.target.value)}
          placeholder="e.g. 'wearing the same jacket but make the sky moody'"
          rows={3}
          maxLength={500}
          className="
            px-4 py-3
            rounded-xl
            bg-surface border border-border
            text-foreground placeholder:text-muted
            focus:outline-none focus:border-accent
            resize-none
          "
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="
          inline-flex items-center justify-center
          h-12 px-6 w-full
          rounded-full
          bg-accent text-black font-medium text-base
          hover:bg-accent-hover transition-colors
          disabled:opacity-60 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
        "
      >
        {busy ? "Writing your prompt…" : "Generate prompt"}
      </button>
    </form>
  );
}
