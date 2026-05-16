import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 renamed `middleware` → `proxy`. Same function signature.
 * Runs on every request matching the `matcher` below; refreshes the
 * Supabase session cookie if present, otherwise no-op.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     * - Static assets (_next/static, _next/image)
     * - favicon and common image extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
