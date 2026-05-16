"use client";

import { useEffect, useState } from "react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { EnhanceForm } from "@/components/EnhanceForm";
import { PromptResult } from "@/components/PromptResult";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { SettingsModal } from "@/components/SettingsModal";
import {
  ApiClientError,
  analyzePrompt,
  analyzeSuggest,
  generateImage,
  uploadImage,
} from "@/lib/api";
import { getSettings, hasAnyAiKey } from "@/lib/settings";
import type {
  FinalForm,
  GenerateData,
  PromptData,
  SuggestData,
} from "@/lib/types";

type ServerConfig = {
  ai_configured: boolean;
  openai_image_configured: boolean;
  fal_configured: boolean;
  active_image_provider: string;
};

type Stage =
  | { kind: "idle" }
  | { kind: "uploading"; previewUrl: string }
  | {
      kind: "analyzing";
      imageId: string;
      imageUrl: string;
      previewUrl: string;
    }
  | {
      kind: "ready";
      imageId: string;
      imageUrl: string;
      previewUrl: string;
      suggest: SuggestData;
    }
  | {
      kind: "prompting";
      imageId: string;
      imageUrl: string;
      previewUrl: string;
      suggest: SuggestData;
      finalForm: FinalForm;
    }
  | {
      kind: "prompted";
      imageId: string;
      imageUrl: string;
      previewUrl: string;
      suggest: SuggestData;
      finalForm: FinalForm;
      promptData: PromptData;
      enhanced?: GenerateData;
      generating?: boolean;
      generateError?: string;
    };

export function EnhanceClient() {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [firstRun, setFirstRun] = useState<"checking" | "needs-key" | "ready">(
    "checking",
  );

  // First-run check: are EITHER browser-stored keys OR server-side env keys
  // configured? If neither, prompt the user to add their own.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      // If user already has a key in localStorage, we're good
      if (hasAnyAiKey(getSettings())) {
        if (!cancelled) setFirstRun("ready");
        return;
      }
      // Otherwise, ask the backend if IT has env-configured keys
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api-proxy";
        const r = await fetch(`${base}/config`, { credentials: "include" });
        if (!cancelled && r.ok) {
          const cfg: ServerConfig = await r.json();
          setFirstRun(cfg.ai_configured ? "ready" : "needs-key");
        } else if (!cancelled) {
          setFirstRun("needs-key");
        }
      } catch {
        if (!cancelled) setFirstRun("needs-key");
      }
    }
    check();
    function onChanged() {
      check();
    }
    window.addEventListener("poselab:settings-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("poselab:settings-changed", onChanged);
    };
  }, []);

  function reset() {
    setError(null);
    setStage({ kind: "idle" });
  }

  async function handleFile(file: File, previewUrl: string) {
    setError(null);
    setStage({ kind: "uploading", previewUrl });

    try {
      const upload = await uploadImage(file);
      setStage({
        kind: "analyzing",
        imageId: upload.image_id,
        imageUrl: upload.image_url,
        previewUrl,
      });
      const suggest = await analyzeSuggest(upload.image_id, upload.image_url);
      setStage({
        kind: "ready",
        imageId: upload.image_id,
        imageUrl: upload.image_url,
        previewUrl,
        suggest: suggest.data,
      });
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : "Upload failed";
      setError(msg);
      setStage({ kind: "idle" });
    }
  }

  async function handlePrompt(finalForm: FinalForm) {
    if (stage.kind !== "ready" && stage.kind !== "prompted") return;
    const base = stage;
    if (base.kind !== "ready" && base.kind !== "prompted") return;
    setError(null);
    setStage({
      kind: "prompting",
      imageId: base.imageId,
      imageUrl: base.imageUrl,
      previewUrl: base.previewUrl,
      suggest: base.suggest,
      finalForm,
    });
    try {
      const res = await analyzePrompt(
        base.imageId,
        base.imageUrl,
        finalForm,
        base.suggest.scenario,
        base.suggest.issues,
      );
      setStage({
        kind: "prompted",
        imageId: base.imageId,
        imageUrl: base.imageUrl,
        previewUrl: base.previewUrl,
        suggest: base.suggest,
        finalForm,
        promptData: res.data,
      });
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Prompt generation failed";
      setError(msg);
      setStage({
        kind: "ready",
        imageId: base.imageId,
        imageUrl: base.imageUrl,
        previewUrl: base.previewUrl,
        suggest: base.suggest,
      });
    }
  }

  async function handleGenerate() {
    if (stage.kind !== "prompted") return;
    setStage({ ...stage, generating: true, generateError: undefined });
    try {
      const res = await generateImage({
        prompt: stage.promptData.prompt,
        imageUrl: stage.imageUrl,
        analysisId: stage.promptData.analysis_id,
      });
      setStage({ ...stage, generating: false, enhanced: res.data });
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.code === "paid_required"
            ? "Generating in PoseLab is a paid feature — sign in to upgrade."
            : err.message
          : "Image generation failed";
      setStage({ ...stage, generating: false, generateError: msg });
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  // First-run banner — shown above whatever stage we're in when no keys
  // are configured (neither in localStorage nor on the server).
  const firstRunBanner =
    firstRun === "needs-key" ? (
      <div className="rounded-2xl border border-accent/50 bg-accent/5 p-5 flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          ⚙ Add an AI key to start
        </h2>
        <p className="text-sm text-muted leading-6">
          PoseLab uses your own API key (OpenRouter, OpenAI, Groq, or any
          OpenAI-compatible provider). Add one in Settings — takes about 60
          seconds, then everything works.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="
              inline-flex items-center justify-center
              h-10 px-4
              rounded-full
              bg-accent text-black font-medium text-sm
              hover:bg-accent-hover transition-colors
            "
          >
            Open Settings
          </button>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center justify-center
              h-10 px-4
              rounded-full
              border border-border text-foreground text-sm font-medium
              hover:border-accent transition-colors
            "
          >
            Get a free OpenRouter key →
          </a>
        </div>
      </div>
    ) : null;

  if (stage.kind === "idle") {
    return (
      <div className="flex flex-col gap-5">
        {firstRunBanner}
        <PhotoUpload onFile={handleFile} />
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {firstRunBanner}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stage.kind === "uploading" ? stage.previewUrl : stage.imageUrl ?? stage.previewUrl}
          alt="Your upload"
          className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-xl border border-border bg-surface"
        />
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <p className="text-sm text-muted">
            {stage.kind === "uploading" && "Uploading photo…"}
            {stage.kind === "analyzing" && "Analyzing photo with AI…"}
            {stage.kind === "ready" && stage.suggest.scene_detected}
            {stage.kind === "prompting" && "Writing your prompt…"}
            {stage.kind === "prompted" && stage.suggest.scene_detected}
          </p>
          {"suggest" in stage && stage.suggest && (
            <TraditionBadge
              scenario={stage.suggest.scenario}
              tradition={stage.suggest.tradition}
            />
          )}
          {"suggest" in stage && stage.suggest && stage.suggest.issues.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {stage.suggest.issues.map((iss, i) => (
                <li
                  key={i}
                  className="text-xs bg-surface border border-border rounded-full px-2.5 py-1 text-foreground"
                >
                  {iss}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={reset}
            className="self-start text-xs underline text-muted hover:text-foreground transition-colors"
          >
            ← Use a different photo
          </button>
        </div>
      </div>

      {(stage.kind === "uploading" || stage.kind === "analyzing") && (
        <LoadingCard label={stage.kind === "uploading" ? "Uploading…" : "AI is looking at your photo…"} />
      )}

      {(stage.kind === "ready" ||
        stage.kind === "prompting" ||
        stage.kind === "prompted") && (
        <EnhanceForm
          suggestions={stage.suggest.suggestions}
          scenario={stage.suggest.scenario}
          initialFreetext={
            stage.kind === "prompting" || stage.kind === "prompted"
              ? stage.finalForm.freetext ?? ""
              : ""
          }
          busy={stage.kind === "prompting"}
          onSubmit={handlePrompt}
        />
      )}

      {stage.kind === "prompted" && (
        <>
          <PromptResult
            prompt={stage.promptData.prompt}
            altPrompts={stage.promptData.alt_prompts}
            publicUrl={stage.promptData.public_url}
            imageUrl={stage.imageUrl}
            generating={!!stage.generating}
            onGenerate={handleGenerate}
            canGenerate={true}
          />

          {stage.generateError && (
            <p role="alert" className="text-sm text-red-400">
              {stage.generateError}
            </p>
          )}

          {stage.enhanced && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
                Before / after
              </h2>
              <BeforeAfterSlider
                beforeSrc={stage.imageUrl}
                afterSrc={stage.enhanced.enhanced_url}
              />
              <p className="text-xs text-muted">
                Generated by{" "}
                <code className="bg-surface border border-border rounded px-1.5 py-0.5">
                  {stage.enhanced.model}
                </code>{" "}
                in {(stage.enhanced.duration_ms / 1000).toFixed(1)}s.
              </p>
            </section>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 flex items-center gap-3">
      <div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

const SCENARIO_LABEL: Record<string, string> = {
  portrait: "Portrait",
  group: "Group photo",
  sunset: "Sunset / golden hour",
  food: "Food",
  lowlight: "Low light",
  action: "Action",
  architecture: "Architecture",
  pets: "Pets / kids",
  other: "General photo",
};

/**
 * Small pill that shows which photographic tradition the analysis drew from.
 * Builds trust through transparency — "we're analyzing this as a portrait
 * shot through the lens of Leibovitz, Avedon, Lindbergh, Karsh".
 */
function TraditionBadge({
  scenario,
  tradition,
}: {
  scenario: string;
  tradition: string[];
}) {
  if (!tradition || tradition.length === 0) return null;
  const label = SCENARIO_LABEL[scenario] ?? "Photo";
  const names = tradition.slice(0, 4).join(" · ");
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent border border-accent/30 px-2.5 py-0.5 font-medium uppercase tracking-widest">
        Analyzed as {label}
      </span>
      <span className="text-muted">grounded in {names}</span>
    </div>
  );
}
