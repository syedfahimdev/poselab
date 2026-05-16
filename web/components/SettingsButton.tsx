"use client";

import { useEffect, useState } from "react";
import { getSettings, hasAnyAiKey } from "@/lib/settings";
import { SettingsModal } from "./SettingsModal";

/**
 * Top-nav gear-icon button. Shows a small dot when no AI key is configured,
 * nudging the user to set one up.
 */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    function refresh() {
      setNeedsSetup(!hasAnyAiKey(getSettings()));
    }
    refresh();
    window.addEventListener("poselab:settings-changed", refresh);
    return () => window.removeEventListener("poselab:settings-changed", refresh);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open settings"
        title="Settings"
        className="
          relative inline-flex items-center justify-center
          h-9 w-9 rounded-full
          text-muted hover:text-foreground hover:bg-surface
          transition-colors
        "
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {needsSetup && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent"
          />
        )}
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
