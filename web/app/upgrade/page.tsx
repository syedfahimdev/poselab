import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";
import { SettingsButton } from "@/components/SettingsButton";

export const metadata = {
  title: "Upgrade — PoseLab",
};

const FREE = [
  "Unlimited Settings Mode cheat sheets",
  "3 prompt generations / day",
  "Copy to ChatGPT, Gemini, or your favorite AI",
  "Public share URLs (watermarked)",
];

const PAID = [
  "Unlimited prompt generations",
  "In-app image generation (fal.ai FLUX Pro Kontext)",
  "Before/after slider for every result",
  "Private share URLs (no watermark)",
  "90-day history with quick re-use",
  "All alternate styles (Film, B&W, Editorial, Cinematic)",
];

export default function UpgradePage() {
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
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-10 pt-6 sm:pt-8">
          <header className="flex flex-col gap-3 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-accent">
              Pricing
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Simple plans, same coach.
            </h1>
            <p className="text-base text-muted">
              Free is generous enough to try. Paid is when you&apos;re using
              PoseLab every day.
            </p>
          </header>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card title="Free" price="$0" cta="You're on it">
              {FREE.map((line) => (
                <Bullet key={line}>{line}</Bullet>
              ))}
            </Card>
            <Card title="Paid" price="$14/mo" cta="Upgrade (coming Week 4)" accent>
              {PAID.map((line) => (
                <Bullet key={line}>{line}</Bullet>
              ))}
            </Card>
          </div>

          <section className="rounded-2xl border border-border bg-surface p-6 flex flex-col gap-2 text-sm text-muted">
            <p>
              Stripe checkout ships in Week 4. Until then, log in with Google /
              magic link and we&apos;ll grandfather every account that signed up
              before launch into a discounted first month.
            </p>
            <p>
              Questions?{" "}
              <Link href="/" className="text-foreground underline">
                Drop us a note
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function Card({
  title,
  price,
  cta,
  accent,
  children,
}: {
  title: string;
  price: string;
  cta: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-6 flex flex-col gap-5",
        accent
          ? "border-accent bg-accent/5"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-2xl font-semibold tracking-tight">{price}</span>
      </div>
      <ul className="flex flex-col gap-2.5">{children}</ul>
      <button
        type="button"
        disabled
        className={[
          "mt-auto inline-flex items-center justify-center",
          "h-11 px-5 rounded-full text-sm font-medium",
          accent
            ? "bg-accent text-black opacity-70 cursor-not-allowed"
            : "border border-border text-muted",
        ].join(" ")}
      >
        {cta}
      </button>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-6">
      <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
      <span>{children}</span>
    </li>
  );
}
