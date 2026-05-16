import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in — PoseLab",
};

/**
 * In Next 16, `searchParams` is async — must be awaited.
 * We use it to support optional `?next=/somewhere` post-login redirects.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Detect "already signed in" so we can bounce them. If Supabase is
  // unreachable / misconfigured, fall through and just render the login UI —
  // we never 500 the login page itself.
  //
  // The getUser call is wrapped; redirect() is intentionally outside the
  // try/catch because redirect() throws NEXT_REDIRECT internally and must
  // bubble up.
  let signedInUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedInUserId = user?.id ?? null;
  } catch {
    // Supabase down or env vars missing — render login normally.
  }

  if (signedInUserId) {
    redirect(next ?? "/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground transition-colors self-center"
          >
            ← PoseLab
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted">
            Save your prompts and history. No password — magic link or Google.
          </p>
        </header>

        <LoginForm next={next} />

        <p className="text-xs text-muted text-center leading-5">
          By signing in you agree to our terms. We&apos;ll never share your email.
        </p>
      </div>
    </main>
  );
}
