import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";
import { SettingsButton } from "@/components/SettingsButton";
import {
  SCENARIOS,
  SCENARIO_EMOJI,
  SCENARIO_LABELS,
  SCENARIO_SUBTITLE,
} from "@/lib/settingsCards";

export const metadata = {
  title: "Camera settings cheat sheets — PoseLab",
  description:
    "Hand-curated settings for portraits, sunsets, food, low light and more. Tailored for your phone or DSLR. No login, works offline.",
};

export default function SettingsIndexPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <nav className="w-full px-5 sm:px-8 pt-6 pb-2">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="font-semibold tracking-tight text-foreground text-lg"
          >
            PoseLab
          </Link>
          <div className="flex items-center gap-2"><SettingsButton /><AuthMenu /></div>
        </div>
      </nav>

      <main className="flex-1 w-full px-5 sm:px-8 pb-24">
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-8 pt-6 sm:pt-8">
          <header className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-accent">
              Settings cheat sheets
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Know which mode to tap before the moment passes.
            </h1>
            <p className="text-sm sm:text-base text-muted leading-6">
              No AI calls, no login, works offline. Tap a scenario — we&apos;ll
              show the exact mode and settings for your phone or DSLR.
            </p>
          </header>

          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {SCENARIOS.map((s) => (
              <li key={s}>
                <Link
                  href={`/settings/${s}`}
                  className="
                    group flex flex-col gap-2
                    aspect-[3/4] sm:aspect-square
                    p-4 sm:p-5
                    rounded-2xl border border-border bg-surface
                    hover:border-accent transition-colors
                    text-left
                  "
                >
                  <span className="text-3xl sm:text-4xl" aria-hidden="true">
                    {SCENARIO_EMOJI[s]}
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-foreground">
                    {SCENARIO_LABELS[s]}
                  </span>
                  <span className="text-xs sm:text-sm text-muted leading-5 mt-auto">
                    {SCENARIO_SUBTITLE[s]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
            <h2 className="text-base font-semibold">Want the AI version?</h2>
            <p className="text-sm text-muted leading-6">
              Settings Mode is the offline cheat sheet. For a photo coach that
              looks at YOUR specific photo and tells you what to fix, head to
              the enhancer.
            </p>
            <Link
              href="/enhance"
              className="
                self-start inline-flex items-center justify-center
                h-11 px-5
                rounded-full
                bg-accent text-black font-medium text-sm
                hover:bg-accent-hover transition-colors
              "
            >
              Enhance a photo →
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
