import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session on every request and write the rotated tokens
 * back to the response cookies. Called from `proxy.ts`.
 *
 * IMPORTANT: do NOT add logic between `getUser()` and the `return response`.
 * If you do, the user may be randomly logged out — `getUser()` is what
 * triggers the token refresh, and the response must be returned with the
 * refreshed cookies attached.
 *
 * Fail-open: if Supabase env vars are missing OR the auth call throws, the
 * request continues as an unauthenticated user. We never 500 the page just
 * because a session refresh failed.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Skip entirely when env vars aren't configured (local dev before Supabase
  // is wired up, or a misconfigured deploy). The page itself handles the
  // "no user signed in" case fine.
  if (!isSupabaseConfigured()) return response;

  try {
    return await refresh(request, response);
  } catch (err) {
    // Fail-open. Log so we notice in production but don't break the request.
    console.warn("[poselab] proxy auth refresh failed; continuing:", err);
    return response;
  }
}

async function refresh(request: NextRequest, initialResponse: NextResponse) {
  let response = initialResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Triggers the token refresh. Don't remove this line.
  await supabase.auth.getUser();

  return response;
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  // Treat obvious placeholders as unconfigured. Lets devs run pnpm dev with
  // dummy values during scaffolding without breaking every page.
  if (url.includes("placeholder") || url.includes("your-project")) return false;
  return true;
}
