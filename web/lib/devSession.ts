/**
 * Local dev login — a frontend-only "signed in" state for testing the
 * paid-tier flow without setting up real Supabase.
 *
 * Pairs with `api/auth.py`'s `Bearer dev:<email>` bypass, which is only
 * honored when SUPABASE_JWT_SECRET is unset AND PYTHON_ENV != production.
 *
 * Persistence: localStorage (instant client reads) + cookie (so server-rendered
 * pages and the API client can see it via the standard fetch credentials path).
 */

const STORAGE_KEY = "poselab_dev_session";
const COOKIE_NAME = "poselab_dev_session";

export type DevSession = {
  email: string;
  signedInAt: number;
};

/** Read the current dev session (browser only). */
export function getDevSession(): DevSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevSession;
    if (!parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Sign in as a dev user with the given email. */
export function setDevSession(email: string): DevSession {
  const session: DevSession = {
    email: email.trim() || "dev@local",
    signedInAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    writeCookie(COOKIE_NAME, session.email, 7);
    // Let other components (AuthMenu) re-read state without a full reload
    window.dispatchEvent(new CustomEvent("poselab:auth-changed"));
  }
  return session;
}

/** Clear the dev session. */
export function clearDevSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  writeCookie(COOKIE_NAME, "", 0);
  window.dispatchEvent(new CustomEvent("poselab:auth-changed"));
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(0, Math.floor(days * 86400));
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
  ].join("; ");
}
