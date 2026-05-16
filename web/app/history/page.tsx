import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";
import { SettingsButton } from "@/components/SettingsButton";

export const metadata = {
  title: "History — PoseLab",
};

export default function HistoryPage() {
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
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <div className="flex max-w-md flex-col gap-6 text-center">
          <span className="text-sm font-medium uppercase tracking-widest text-accent">
            Paid tier
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            History lives here.
          </h1>
          <p className="text-base leading-7 text-muted">
            We&apos;re saving every analyze to the database already. Once Stripe
            ships in Week 4, this page will list your last 90 days of prompts
            with quick re-use, copy, and share.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 self-center">
            <Link
              href="/enhance"
              className="
                inline-flex items-center justify-center
                h-11 px-5
                rounded-full
                bg-accent text-black font-medium text-sm
                hover:bg-accent-hover transition-colors
              "
            >
              Enhance a photo
            </Link>
            <Link
              href="/upgrade"
              className="
                inline-flex items-center justify-center
                h-11 px-5
                rounded-full
                border border-border text-foreground text-sm font-medium
                hover:border-accent transition-colors
              "
            >
              See upgrade
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
