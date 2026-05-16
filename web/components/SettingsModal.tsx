"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AI_PRESETS,
  type AppSettings,
  DEFAULT_SETTINGS,
  clearSettings,
  getSettings,
  saveSettings,
} from "@/lib/settings";

type Props = {
  open: boolean;
  onClose: () => void;
};

type TestState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; ms: number }
  | { kind: "fail"; message: string };

/**
 * BYOK Settings panel. Lets users plug in their own API keys without
 * editing any `.env` file. Keys live in localStorage and ride on every
 * subsequent API call as headers (see lib/settings.ts > buildProviderHeaders).
 */
export function SettingsModal({ open, onClose }: Props) {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [preset, setPreset] = useState<string>("openrouter");
  const [test, setTest] = useState<TestState>({ kind: "idle" });

  // Load current settings when modal opens
  useEffect(() => {
    if (!open) return;
    const current = getSettings();
    setS(current);
    // Try to infer which preset the user picked previously
    const match = AI_PRESETS.find((p) => p.baseUrl === current.aiBaseUrl);
    setPreset(match?.id ?? "custom");
    setTest({ kind: "idle" });
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const setField = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => setS((prev) => ({ ...prev, [key]: value }));

  function applyPreset(id: string) {
    setPreset(id);
    const p = AI_PRESETS.find((x) => x.id === id);
    if (!p) return;
    if (p.id === "custom") return; // don't clobber user values
    setS((prev) => ({
      ...prev,
      aiBaseUrl: p.baseUrl,
      visionModel: p.visionModel,
      textModel: p.textModel,
    }));
  }

  function onSave() {
    saveSettings(s);
    onClose();
  }

  function onReset() {
    if (
      window.confirm(
        "Clear all settings (API keys, models, base URLs)? This cannot be undone.",
      )
    ) {
      clearSettings();
      setS(DEFAULT_SETTINGS);
      setPreset("openrouter");
    }
  }

  const testConnection = useCallback(async () => {
    setTest({ kind: "running" });
    const start = performance.now();
    try {
      const headers: Record<string, string> = {
        "X-AI-Base-URL": s.aiBaseUrl,
        "X-AI-Key": s.aiKey,
        "X-AI-Vision-Model": s.visionModel,
        "X-AI-Text-Model": s.textModel,
      };
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api-proxy";
      const res = await fetch(`${base}/config`, { headers });
      const body = await res.json();
      const ms = Math.round(performance.now() - start);
      if (!res.ok) {
        setTest({ kind: "fail", message: `HTTP ${res.status}` });
        return;
      }
      if (!body.ai_configured) {
        setTest({
          kind: "fail",
          message: "Backend reports AI not configured — check your key",
        });
        return;
      }
      setTest({ kind: "ok", ms });
    } catch (err) {
      setTest({
        kind: "fail",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }, [s.aiBaseUrl, s.aiKey, s.visionModel, s.textModel]);

  if (!open) return null;

  const activePreset = AI_PRESETS.find((p) => p.id === preset) ?? AI_PRESETS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-2xl bg-background border border-border rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] sm:my-8">
        <header className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border sticky top-0 bg-background rounded-t-2xl">
          <h2 id="settings-title" className="text-lg font-semibold">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="h-9 w-9 rounded-full hover:bg-surface text-muted hover:text-foreground transition-colors flex items-center justify-center text-xl"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-7">
          {/* ── BYOK explainer ─────────────────────────────────────────── */}
          <p className="text-sm text-muted leading-6">
            PoseLab uses <strong className="text-foreground">your own API keys</strong>.
            Keys are stored in this browser&apos;s localStorage and sent only
            to PoseLab&apos;s backend running on this machine — never to any
            third party.
          </p>

          {/* ── Text + Vision section ──────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium uppercase tracking-widest text-accent">
              Text + Vision AI
            </h3>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="ai-preset"
                className="text-sm font-medium text-foreground"
              >
                Provider
              </label>
              <select
                id="ai-preset"
                value={preset}
                onChange={(e) => applyPreset(e.target.value)}
                className="h-11 px-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-accent"
              >
                {AI_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {activePreset.signupUrl && (
                <p className="text-xs text-muted">
                  Get a key:{" "}
                  <a
                    href={activePreset.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {activePreset.signupUrl.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              )}
            </div>

            <Field
              label="Base URL"
              id="ai-base-url"
              value={s.aiBaseUrl}
              onChange={(v) => setField("aiBaseUrl", v)}
              placeholder="https://openrouter.ai/api/v1"
            />
            <Field
              label="API key"
              id="ai-key"
              type="password"
              value={s.aiKey}
              onChange={(v) => setField("aiKey", v)}
              placeholder={activePreset.keyHint}
              hint="Stored only in this browser. Never sent to PoseLab's servers — only to the provider above."
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Vision model"
                id="vision-model"
                value={s.visionModel}
                onChange={(v) => setField("visionModel", v)}
                placeholder="google/gemini-2.5-flash"
              />
              <Field
                label="Text model"
                id="text-model"
                value={s.textModel}
                onChange={(v) => setField("textModel", v)}
                placeholder="google/gemini-2.5-flash"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={testConnection}
                disabled={!s.aiKey || test.kind === "running"}
                className="
                  inline-flex items-center justify-center
                  h-10 px-4
                  rounded-full
                  border border-border bg-surface text-foreground
                  hover:border-accent transition-colors text-sm font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {test.kind === "running" ? "Testing…" : "Test connection"}
              </button>
              {test.kind === "ok" && (
                <span className="text-sm text-accent">
                  ✓ Connected ({test.ms}ms)
                </span>
              )}
              {test.kind === "fail" && (
                <span className="text-sm text-red-400">
                  ✗ {test.message}
                </span>
              )}
            </div>
          </section>

          {/* ── Image generation section ───────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium uppercase tracking-widest text-accent">
              Image generation
            </h3>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="image-provider"
                className="text-sm font-medium text-foreground"
              >
                Provider
              </label>
              <select
                id="image-provider"
                value={s.imageProvider}
                onChange={(e) =>
                  setField(
                    "imageProvider",
                    e.target.value as AppSettings["imageProvider"],
                  )
                }
                className="h-11 px-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-accent"
              >
                <option value="auto">Auto — pick whichever is configured</option>
                <option value="openai">
                  OpenAI gpt-image-2 (best identity preservation)
                </option>
                <option value="fal">fal.ai FLUX Pro Kontext (cheaper)</option>
              </select>
            </div>

            <Field
              label="OpenAI API key (for image gen)"
              id="openai-key"
              type="password"
              value={s.openaiKey}
              onChange={(v) => setField("openaiKey", v)}
              placeholder="sk-..."
              hint="Required for OpenAI gpt-image-2. Get one at platform.openai.com/api-keys"
            />
            <Field
              label="fal.ai key"
              id="fal-key"
              type="password"
              value={s.falKey}
              onChange={(v) => setField("falKey", v)}
              placeholder="key:value"
              hint="Required for FLUX Pro Kontext. Get one at fal.ai/dashboard/keys"
            />
          </section>

          {/* ── Privacy + reset ───────────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-surface p-4 text-xs text-muted leading-5">
            <p>
              <strong className="text-foreground">Privacy:</strong> keys live in
              this browser&apos;s localStorage. PoseLab&apos;s backend on this
              machine forwards them as Authorization headers to OpenRouter /
              OpenAI / fal.ai per your selection. We never persist keys
              server-side.
            </p>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-border sticky bottom-0 bg-background">
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-muted hover:text-red-400 transition-colors"
          >
            Clear all settings
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted hover:text-foreground transition-colors px-3 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="
                inline-flex items-center justify-center
                h-10 px-5
                rounded-full
                bg-accent text-black font-medium text-sm
                hover:bg-accent-hover transition-colors
              "
            >
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "password";
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === "password" ? "off" : undefined}
        spellCheck={false}
        className="
          h-11 px-3
          rounded-xl
          bg-surface border border-border
          text-foreground placeholder:text-muted text-sm
          focus:outline-none focus:border-accent
          font-mono
        "
      />
      {hint && <span className="text-xs text-muted leading-5">{hint}</span>}
    </label>
  );
}
