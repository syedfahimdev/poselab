/**
 * Anonymous-user identity for the unauthed flow.
 *
 * A pseudo-random UUID generated client-side on first visit, persisted to
 * BOTH localStorage (for client-side reads) and a long-lived cookie (so
 * server routes / API requests can see it without an additional fetch).
 *
 * Why both?
 *   - localStorage: instant client read, survives across tabs.
 *   - cookie: sent automatically with every request to /api/* and the FastAPI
 *     backend, so server code can rate-limit and attribute uploads without
 *     needing the client to echo it back in headers.
 */

const COOKIE_NAME = "poselab_anon_id";
const STORAGE_KEY = "poselab_anon_id";
const COOKIE_MAX_AGE_DAYS = 90;

/**
 * Get or create the anonymous ID. Safe to call repeatedly.
 * Returns null when called during SSR (no `window`).
 */
export function getOrCreateAnonId(): string | null {
  if (typeof window === "undefined") return null;

  // 1. localStorage first (fastest, most durable across same-origin tabs)
  let id = window.localStorage.getItem(STORAGE_KEY);

  // 2. Fall back to cookie if localStorage was cleared but cookie survived
  if (!id) {
    id = readCookie(COOKIE_NAME);
  }

  // 3. Generate fresh if neither is present
  if (!id) {
    id = generateId();
  }

  // Always re-write both — keeps them in sync and extends the cookie expiry
  window.localStorage.setItem(STORAGE_KEY, id);
  writeCookie(COOKIE_NAME, id, COOKIE_MAX_AGE_DAYS);

  return id;
}

/**
 * Server-side read of the anon cookie. Use from Server Components / Route
 * Handlers where `cookies()` is available.
 */
export function readAnonIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Clear the anon id (e.g. immediately after a user signs up and their
 * anonymous analyses have been migrated).
 */
export function clearAnonId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  // Expire the cookie by setting max-age=0
  writeCookie(COOKIE_NAME, "", 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 👋 USER CONTRIBUTION OPPORTUNITY — anonymous → authed merge flow
//
// When a user signs up, we have analyses written with `anon_id = <uuid>`
// but no `user_id`. We need to merge those rows so the user keeps their
// pre-signup history.
//
// There are 3 valid approaches; the trade-offs are real and matter for both
// UX and data hygiene:
//
//   (A) Immediate migrate on signup
//       Best UX: history appears instantly. But it leaks anon_id → user
//       linkage in your DB (privacy concern for shared devices, family
//       phones, etc.).
//
//   (B) Lazy attribution at query time
//       History queries `where user_id = X OR anon_id = Y`. No write needed.
//       But anon_id stays in your DB forever, and every history query
//       is a tiny bit slower. Cleaner privacy if you also age out anon rows.
//
//   (C) Explicit opt-in: "Save your guest history?"
//       Show a one-time prompt after signup: "We noticed you had 3 photos
//       from before signup. Save them?" Yes → migrate. No → discard.
//       Highest privacy hygiene, slight UX friction.
//
// For the family-phone case (Mom signs up after kid uploaded photos), option
// C is the only safe answer. For a creator workflow (you uploaded photos
// before deciding to sign up), option A feels best.
//
// Fill in the body of `mergeAnonymousIntoUser` below with the approach you
// pick. The function is called from `/auth/callback/route.ts` after a fresh
// signup. Until you implement it, anonymous history is just orphaned.
// ─────────────────────────────────────────────────────────────────────────────
export async function mergeAnonymousIntoUser(
  anonId: string,
  userId: string,
): Promise<void> {
  // TODO(farhan): pick approach A / B / C above and implement.
  // Suggested next steps:
  //   - If (A): call a backend endpoint that runs
  //       `update analyses set user_id = $userId, anon_id = null where anon_id = $anonId`
  //   - If (B): just delete the anon cookie; no DB write needed.
  //   - If (C): set a flag in localStorage; show the prompt on next page load.
  console.warn(
    "[poselab] mergeAnonymousIntoUser is not implemented — pick approach A/B/C",
    { anonId, userId },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// internals
// ─────────────────────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for ancient environments (very unlikely in practice)
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === "undefined") return;
  const maxAgeSeconds = Math.max(0, Math.floor(maxAgeDays * 86_400));
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
    // Note: not HttpOnly so the client can sync with localStorage.
    // The anon id isn't sensitive — it's a pseudo-random session marker.
  ].join("; ");
}
