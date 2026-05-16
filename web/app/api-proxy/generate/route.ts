import { NextRequest } from "next/server";

/**
 * Dedicated proxy for /api-proxy/generate.
 *
 * Why this file exists instead of relying on next.config.ts rewrites: the
 * built-in rewrite proxies short-circuit on long upstream waits (Next dev
 * resets the socket after ~15-30s, which is shorter than fal.ai's
 * 15-30s+ job time). This explicit route handler keeps the connection open
 * for up to 3 minutes.
 *
 * Everything else under /api-proxy/* still falls through to the rewrite.
 */

const FASTAPI =
  process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// Vercel runtime hint (no-op locally, but documents the contract)
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer();
  const headers = new Headers(req.headers);
  // Strip headers that confuse the upstream or get rewritten by fetch
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  try {
    const upstream = await fetch(`${FASTAPI}/generate`, {
      method: "POST",
      headers,
      body,
      // 3-minute ceiling — fal.ai jobs are typically 15-30s but can spike
      signal: AbortSignal.timeout(180_000),
    });

    // Stream the body straight back so we don't buffer the whole image
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown proxy error";
    return new Response(
      JSON.stringify({
        ok: false,
        error: "proxy_failed",
        message: `Proxy to /generate failed: ${message}`,
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
