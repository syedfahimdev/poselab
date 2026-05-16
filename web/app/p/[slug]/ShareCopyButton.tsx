"use client";

import { useState } from "react";

export function ShareCopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy:", text);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="
        self-start inline-flex items-center gap-2
        h-10 px-4
        rounded-full
        bg-foreground text-background text-sm font-medium
        hover:opacity-90 transition-opacity
      "
    >
      {copied ? "✓ Copied" : `📋 ${label}`}
    </button>
  );
}
