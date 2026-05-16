"use client";

import { useCallback, useRef, useState } from "react";
import {
  ALLOWED_TYPES,
  previewURL,
  revokePreview,
  validateFile,
} from "@/lib/imageUtils";

type Props = {
  onFile: (file: File, previewUrl: string) => void;
  disabled?: boolean;
};

/**
 * Drag-drop + click-to-pick upload area. Validates client-side; backend
 * does the authoritative normalization.
 */
export function PhotoUpload({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      const check = validateFile(file);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
      setError(null);
      const url = previewURL(file);
      // Revoke the old object URL to avoid leaks
      setLocalPreview((prev) => {
        if (prev) revokePreview(prev);
        return url;
      });
      onFile(file, url);
    },
    [onFile],
  );

  return (
    <div className="flex flex-col gap-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          handleFile(file);
        }}
        className={[
          "relative flex flex-col items-center justify-center",
          "min-h-56 sm:min-h-72 px-6 py-10",
          "rounded-2xl border-2 border-dashed",
          "transition-colors text-center cursor-pointer",
          dragOver
            ? "border-accent bg-accent/10"
            : "border-border bg-surface hover:border-accent/60",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <UploadIcon />
        <p className="mt-4 text-base font-medium text-foreground">
          {localPreview ? "Tap to choose a different photo" : "Drop a photo here or tap to pick"}
        </p>
        <p className="mt-1 text-sm text-muted">
          JPG, PNG, HEIC — up to 12 MB
        </p>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-accent"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
