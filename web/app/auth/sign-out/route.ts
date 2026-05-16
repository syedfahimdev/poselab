import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign-out handler. POST-only to prevent CSRF-driven sign-outs from links.
 * Clears the Supabase session cookies and redirects to home.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), {
    // 303 forces GET on the redirect target
    status: 303,
  });
}
