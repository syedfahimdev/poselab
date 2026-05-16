import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";
import { SettingsButton } from "@/components/SettingsButton";

/*
 * ─────────────────────────────────────────────────────────────────
 * 👋 USER CONTRIBUTION OPPORTUNITY (hero copy)
 *
 * The wording below is a sensible placeholder, but the hero pitch
 * is the user's voice and should reflect how *you* talk about
 * PoseLab to a friend in one sentence. Edit `HERO_HEADLINE`,
 * `HERO_SUBHEAD`, and `HERO_CTA` to taste. Everything around them
 * is wired up — the structure is final, only the copy is yours.
 * ─────────────────────────────────────────────────────────────────
 */
const HERO_HEADLINE = "Make any photo look like you hired a pro.";
const HERO_SUBHEAD =
  "Upload a photo. PoseLab tells you what to fix — pose, background, lighting, style — and writes the AI prompt that does it. Paste into ChatGPT or Gemini, or generate the new image right here.";
const HERO_CTA = "Upload your photo";

const STEPS = [
  {
    n: "1",
    title: "Upload",
    body: "Drop in any photo from your camera roll. Phone or DSLR, doesn't matter.",
  },
  {
    n: "2",
    title: "Choose your edits",
    body: "PoseLab pre-fills suggestions across 5 categories. Adjust anything you want.",
  },
  {
    n: "3",
    title: "Get the new photo",
    body: "Copy the prompt into ChatGPT or Gemini, or generate the result in PoseLab.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-dvh">
      <Nav />
      <main className="flex-1 flex flex-col">
        <Hero />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="w-full px-5 sm:px-8 pt-6 pb-2">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="font-semibold tracking-tight text-foreground text-lg"
        >
          PoseLab
        </Link>
        <div className="flex items-center gap-2">
          <SettingsButton />
          <AuthMenu />
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="mx-auto w-full max-w-3xl text-center flex flex-col gap-7">
        <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground">
          {HERO_HEADLINE}
        </h1>
        <p className="text-balance mx-auto max-w-xl text-base sm:text-lg leading-7 text-muted">
          {HERO_SUBHEAD}
        </p>
        <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/enhance"
            className="
              inline-flex items-center justify-center
              h-12 px-6 min-w-44
              rounded-full
              bg-accent text-black font-medium text-base
              hover:bg-accent-hover
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
            "
          >
            {HERO_CTA}
          </Link>
          <span className="text-sm text-muted">3 free per day · no signup to try</span>
        </div>
        <div className="text-sm text-muted">
          or browse{" "}
          <Link
            href="/settings"
            className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
          >
            instant settings cheat sheets
          </Link>{" "}
          — no upload needed
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="w-full px-5 sm:px-8 pb-20">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted text-center mb-8">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="
                rounded-2xl border border-border bg-surface
                p-6 flex flex-col gap-3
              "
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-black text-sm font-semibold">
                  {s.n}
                </span>
                <h3 className="text-base font-semibold text-foreground">
                  {s.title}
                </h3>
              </div>
              <p className="text-sm leading-6 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="w-full px-5 sm:px-8 pb-8 pt-6 border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 text-sm text-muted flex-wrap">
        <span>© {new Date().getFullYear()} PoseLab</span>
        <div className="flex items-center gap-5">
          <Link href="/settings" className="hover:text-foreground transition-colors">
            Cheat sheets
          </Link>
          <Link href="/upgrade" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/history" className="hover:text-foreground transition-colors">
            History
          </Link>
          <Link href="/enhance" className="hover:text-foreground transition-colors">
            Try it →
          </Link>
        </div>
      </div>
    </footer>
  );
}
