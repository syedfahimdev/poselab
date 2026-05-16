import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser (Client Components, event handlers).
 * Reads from `NEXT_PUBLIC_*` env vars at runtime.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
