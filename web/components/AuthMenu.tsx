"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearDevSession, getDevSession } from "@/lib/devSession";

/**
 * Auth state indicator for the top nav.
 * - Signed out: shows "Sign in" link.
 * - Signed in (real Supabase OR dev session): shows email and a sign-out button.
 *
 * Subscribes to Supabase auth events AND a custom "poselab:auth-changed" event
 * (fired by devSession.ts when dev sign-in/out happens) so the UI updates
 * instantly without a reload.
 */
export function AuthMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Dev session takes precedence (always-on if present)
    function readDevSession() {
      const dev = getDevSession();
      if (dev) {
        setEmail(dev.email);
        setIsDev(true);
        setReady(true);
        return true;
      }
      return false;
    }

    if (readDevSession()) {
      // We're done — no need to ping Supabase
      const onAuthChanged = () => readDevSession() || setEmail(null);
      window.addEventListener("poselab:auth-changed", onAuthChanged);
      return () =>
        window.removeEventListener("poselab:auth-changed", onAuthChanged);
    }

    // No dev session — fall back to Supabase
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        setEmail(data.user?.email ?? null);
        setIsDev(false);
        setReady(true);
      })
      .catch(() => setReady(true));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setIsDev(false);
    });

    // Also listen for dev sign-in events
    const onAuthChanged = () => {
      const dev = getDevSession();
      if (dev) {
        setEmail(dev.email);
        setIsDev(true);
      }
    };
    window.addEventListener("poselab:auth-changed", onAuthChanged);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("poselab:auth-changed", onAuthChanged);
    };
  }, []);

  function signOutDev(e: React.FormEvent) {
    e.preventDefault();
    clearDevSession();
    setEmail(null);
    setIsDev(false);
    router.refresh();
  }

  if (!ready) {
    return <span className="text-sm text-muted opacity-0">.</span>;
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted hidden sm:inline truncate max-w-[180px]">
        {email}
        {isDev && (
          <span className="ml-1.5 text-[10px] uppercase tracking-widest text-accent">
            dev
          </span>
        )}
      </span>
      {isDev ? (
        <form onSubmit={signOutDev}>
          <button
            type="submit"
            className="text-muted hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      ) : (
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="text-muted hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}
