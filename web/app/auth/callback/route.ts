import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + magic link callback. Supabase redirects here after the user
 * completes Google sign-in or clicks an emailed magic link. The `code`
 * query param is a one-time auth code we exchange for a session cookie.
 *
 * Honors an optional `?next=/path` for post-login redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Trust the `next` param only if it's a same-site path
      const safeNext = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Fall through to a generic error page
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
