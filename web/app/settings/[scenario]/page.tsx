import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AuthMenu } from "@/components/AuthMenu";
import { SettingsButton } from "@/components/SettingsButton";
import { detectDevice, parseDeviceParam } from "@/lib/deviceDetect";
import {
  CARDS,
  DEVICES,
  SCENARIOS,
  SCENARIO_EMOJI,
  SCENARIO_LABELS,
  SCENARIO_SUBTITLE,
  type Scenario,
} from "@/lib/settingsCards";
import { CardDeck } from "./CardDeck";

// Statically render all 8 scenarios — they're the SEO surface
export function generateStaticParams() {
  return SCENARIOS.map((scenario) => ({ scenario }));
}

type Params = Promise<{ scenario: string }>;
type Search = Promise<{ device?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { scenario } = await params;
  if (!SCENARIOS.includes(scenario as Scenario)) {
    return { title: "Not found — PoseLab" };
  }
  const s = scenario as Scenario;
  const label = SCENARIO_LABELS[s];
  return {
    title: `${label} settings — PoseLab cheat sheet`,
    description: `${SCENARIO_SUBTITLE[s]}. Exact camera mode and settings for iPhone, Pixel, Galaxy, Android and DSLR.`,
    openGraph: {
      title: `${label} — PoseLab settings cheat sheet`,
      description: SCENARIO_SUBTITLE[s],
    },
  };
}

export default async function ScenarioPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { scenario } = await params;
  if (!SCENARIOS.includes(scenario as Scenario)) notFound();
  const s = scenario as Scenario;
  const { device: deviceQuery } = await searchParams;

  // Initial device: ?device=… wins; otherwise detect from UA; otherwise default
  const overridden = parseDeviceParam(deviceQuery);
  const ua = (await headers()).get("user-agent");
  const initialDevice = overridden ?? detectDevice(ua);

  const allCards = DEVICES.map((d) => ({ device: d, card: CARDS[s][d] }));

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
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-7 pt-4 sm:pt-6">
          <Link
            href="/settings"
            className="self-start text-sm text-muted hover:text-foreground transition-colors"
          >
            ← All scenarios
          </Link>

          <header className="flex items-start gap-3">
            <span className="text-4xl sm:text-5xl" aria-hidden="true">
              {SCENARIO_EMOJI[s]}
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
                {SCENARIO_LABELS[s]}
              </h1>
              <p className="text-sm text-muted leading-6">
                {SCENARIO_SUBTITLE[s]}
              </p>
            </div>
          </header>

          <CardDeck cards={allCards} initialDevice={initialDevice} scenario={s} />

          <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
            <h2 className="text-base font-semibold">
              Want the AI to look at YOUR photo?
            </h2>
            <p className="text-sm text-muted leading-6">
              Settings Mode is the offline cheat sheet. For specific feedback
              on a photo you already took, run it through the enhancer.
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
