import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";
import { SettingsButton } from "@/components/SettingsButton";
import { EnhanceClient } from "./EnhanceClient";

export const metadata = {
  title: "Enhance a photo — PoseLab",
  description: "Upload a photo to get a paste-ready AI prompt.",
};

export default function EnhancePage() {
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
          <div className="flex items-center gap-2">
            <SettingsButton />
            <AuthMenu />
          </div>
        </div>
      </nav>
      <main className="flex-1 w-full px-5 sm:px-8 pb-24">
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-8 pt-6 sm:pt-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Enhance a photo
            </h1>
            <p className="text-sm sm:text-base text-muted leading-6">
              Upload, pick your edits, and get a paste-ready AI prompt — plus
              the generated photo if you&apos;re signed in.
            </p>
          </header>
          <EnhanceClient />
        </div>
      </main>
    </div>
  );
}
