"use client";

import { useEffect, useState } from "react";
import { canShareFiles, downloadImage, shareImageAndText } from "@/lib/share";

type Props = {
  prompt: string;
  altPrompts: string[];
  publicUrl: string | null;
  imageUrl: string;
  onGenerate: () => void;
  generating: boolean;
  canGenerate: boolean;
};

export function PromptResult({
  prompt,
  altPrompts,
  publicUrl,
  imageUrl,
  onGenerate,
  generating,
  canGenerate,
}: Props) {
  const [copied, setCopied] = useState<"main" | number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    setShareSupported(canShareFiles());
  }, []);

  async function copy(text: string, key: "main" | number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      window.prompt("Copy this prompt:", text);
    }
  }

  async function copyShare() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      window.prompt("Copy this URL:", publicUrl);
    }
  }

  async function shareToApp() {
    setShareStatus(null);
    const res = await shareImageAndText({ imageUrl, prompt });
    if (res === "shared") setShareStatus("Shared!");
    else if (res === "error") setShareStatus("Couldn't open share sheet.");
    // Don't show anything for "cancelled" — user just closed the share sheet
    if (res === "shared" || res === "error") {
      setTimeout(() => setShareStatus(null), 2000);
    }
  }

  async function copyAndDownload() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // continue regardless — at least download the photo
    }
    try {
      await downloadImage(imageUrl);
      setShareStatus("Prompt copied · photo downloaded");
    } catch {
      setShareStatus("Prompt copied · photo download failed");
    }
    setTimeout(() => setShareStatus(null), 3500);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
          Your prompt
        </h2>
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
          <p className="text-base leading-7 text-foreground whitespace-pre-wrap">
            {prompt}
          </p>
          <button
            type="button"
            onClick={() => copy(prompt, "main")}
            className="
              self-start inline-flex items-center gap-2
              h-10 px-4
              rounded-full
              bg-foreground text-background text-sm font-medium
              hover:opacity-90 transition-opacity
            "
          >
            {copied === "main" ? "✓ Copied" : "📋 Copy prompt"}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
          ✨ Generate your enhanced photo
        </h2>

        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="
              inline-flex items-center justify-center
              h-12 px-6 w-full
              rounded-full
              bg-accent text-black font-medium text-base
              hover:bg-accent-hover transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            {generating
              ? "Generating in PoseLab… (~30s)"
              : canGenerate
                ? "🎨 Generate in PoseLab"
                : "🎨 Generate in PoseLab — upgrade to unlock"}
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
            <div className="flex-1 h-px bg-border" />
            or use another AI
            <div className="flex-1 h-px bg-border" />
          </div>

          {shareSupported ? (
            <>
              <button
                type="button"
                onClick={shareToApp}
                className="
                  inline-flex items-center justify-center gap-2
                  h-12 px-5 w-full
                  rounded-full
                  border border-border bg-background text-foreground
                  hover:border-accent transition-colors text-base font-medium
                "
              >
                📤 Share photo + prompt to ChatGPT / Gemini / any app
              </button>
              <p className="text-xs text-muted leading-5">
                Opens your phone&apos;s share sheet — pick ChatGPT or Gemini
                (or any app that accepts photos + text). Your photo AND the
                prompt are passed through together.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={copyAndDownload}
                className="
                  inline-flex items-center justify-center gap-2
                  h-12 px-5 w-full
                  rounded-full
                  border border-border bg-background text-foreground
                  hover:border-accent transition-colors text-base font-medium
                "
              >
                ⬇ Copy prompt + download photo
              </button>
              <ol className="text-xs text-muted leading-5 list-decimal list-inside space-y-1">
                <li>We copied the prompt and downloaded your photo.</li>
                <li>Open <strong className="text-foreground">chatgpt.com</strong> or <strong className="text-foreground">gemini.google.com</strong>.</li>
                <li>Upload the photo and paste the prompt.</li>
              </ol>
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-4"
            >
              → chatgpt.com
            </a>
            <span className="text-xs text-muted">·</span>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-4"
            >
              → gemini.google.com
            </a>
          </div>

          {shareStatus && (
            <p
              role="status"
              className="text-sm text-accent leading-6 animate-in fade-in"
            >
              {shareStatus}
            </p>
          )}
        </div>
      </section>

      {altPrompts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
            Alternate styles
          </h2>
          <div className="grid gap-3">
            {altPrompts.map((alt, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3"
              >
                <p className="text-sm leading-6 text-foreground">{alt}</p>
                <button
                  type="button"
                  onClick={() => copy(alt, i)}
                  className="
                    self-start inline-flex items-center gap-1.5
                    h-9 px-3
                    rounded-full text-xs font-medium
                    bg-foreground/10 hover:bg-foreground/20 text-foreground
                    transition-colors
                  "
                >
                  {copied === i ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {publicUrl && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
            Share
          </h2>
          <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <code className="flex-1 truncate text-sm text-foreground bg-background px-3 py-2 rounded-lg border border-border">
                {publicUrl}
              </code>
              <button
                type="button"
                onClick={copyShare}
                className="
                  inline-flex items-center justify-center
                  h-10 px-4
                  rounded-full
                  bg-foreground text-background text-sm font-medium
                  hover:opacity-90 transition-opacity
                "
              >
                {shareCopied ? "✓" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-muted leading-5">
              Anyone with this link can see your before/after and prompt.
              EXIF (location, device info) is stripped.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
