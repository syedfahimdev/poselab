import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * Note: in Next.js 16, `cookies()` is async — we await it. The `setAll` write
 * will fail when called from a Server Component (Next forbids cookie mutation
 * there), so we swallow that error. The proxy.ts refresh handles cookie writes
 * for normal navigation.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies — that's fine, proxy.ts
            // will refresh the session on the next request.
          }
        },
      },
    },
  );
}
