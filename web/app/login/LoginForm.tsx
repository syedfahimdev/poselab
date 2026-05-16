"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setDevSession } from "@/lib/devSession";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const router = useRouter();

  const supabase = createClient();
  // Build the callback URL once; safe at module level for client-only code.
  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback${
          next ? `?next=${encodeURIComponent(next)}` : ""
        }`
      : "";

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus({ kind: "submitting" });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      setStatus({ kind: "error", message: error.message });
    } else {
      setStatus({ kind: "sent" });
    }
  }

  async function handleGoogle() {
    setStatus({ kind: "submitting" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setStatus({ kind: "error", message: error.message });
    }
    // Successful Google flow redirects away — no further state to set.
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center flex flex-col gap-3">
        <p className="text-base text-foreground">📬 Check your email</p>
        <p className="text-sm text-muted leading-6">
          We sent a sign-in link to <span className="text-foreground">{email}</span>.
          Open it on this device.
        </p>
      </div>
    );
  }

  const busy = status.kind === "submitting";

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="
          inline-flex items-center justify-center gap-3
          h-12 px-5 w-full
          rounded-full
          border border-border bg-surface hover:border-accent
          text-foreground text-base font-medium
          transition-colors
          disabled:opacity-60 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
        "
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
        <div className="flex-1 h-px bg-border" />
        or
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busy}
            className="
              h-12 px-4
              rounded-xl
              bg-surface border border-border
              text-foreground placeholder:text-muted
              focus:outline-none focus:border-accent
              disabled:opacity-60
            "
          />
        </label>
        <button
          type="submit"
          disabled={busy || !email}
          className="
            inline-flex items-center justify-center
            h-12 px-5 w-full
            rounded-full
            bg-accent text-black font-medium text-base
            hover:bg-accent-hover
            transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
          "
        >
          {busy ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {status.kind === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {status.message}
        </p>
      )}

      <DevLoginPanel
        onSignedIn={() => router.push(next ?? "/enhance")}
      />
    </div>
  );
}

/**
 * Local-dev sign-in: any email + any password gets you a "paid" session.
 * The backend (api/auth.py) only honors this when SUPABASE_JWT_SECRET is unset.
 * The whole panel collapses out of the way unless the user opts in.
 */
function DevLoginPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("you@poselab.local");
  const [password, setPassword] = useState("");

  function signIn(e: FormEvent) {
    e.preventDefault();
    setDevSession(email);
    onSignedIn();
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-4"
        >
          Use dev sign-in (local testing)
        </button>
      ) : (
        <form
          onSubmit={signIn}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-accent">
              Dev sign-in
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              hide
            </button>
          </div>
          <p className="text-xs text-muted leading-5">
            Local-only. Skips Supabase, signs you in as a paid user so you can
            test the full flow including in-app image generation.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="
              h-11 px-3
              rounded-lg
              bg-background border border-border
              text-foreground placeholder:text-muted text-sm
              focus:outline-none focus:border-accent
            "
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password (anything)"
            className="
              h-11 px-3
              rounded-lg
              bg-background border border-border
              text-foreground placeholder:text-muted text-sm
              focus:outline-none focus:border-accent
            "
          />
          <button
            type="submit"
            disabled={!email}
            className="
              inline-flex items-center justify-center
              h-11 px-4
              rounded-full
              bg-foreground text-background text-sm font-medium
              hover:opacity-90 transition-opacity
              disabled:opacity-60
            "
          >
            Sign in as dev
          </button>
        </form>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
