import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Anchor Turbopack's workspace root to this directory so it doesn't get
// confused by an ancestor lockfile from another project.
const projectRoot = dirname(fileURLToPath(import.meta.url));

// When set, /api-proxy/* requests are forwarded to this backend. Lets a single
// public URL (ngrok / Tailscale / Vercel) serve both the Next app AND the
// FastAPI under one origin — sidesteps CORS, two-tunnel juggling, and
// mixed-content issues.
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// Parse a comma-separated list of additional dev origins (Tailscale, LAN IP,
// ngrok, codespace URL, ...). Next 16 blocks non-localhost dev origins by
// default for safety; opt-in via env without hardcoding personal hostnames.
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins,
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${API_PROXY_TARGET}/:path*`,
      },
    ];
  },
};

export default nextConfig;
