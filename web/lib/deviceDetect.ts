/**
 * Best-effort device-family detection from User-Agent.
 *
 * DSLR is never auto-detected — there's no UA pattern. Users pick it manually.
 */

import { DEVICES, type Device } from "./settingsCards";

const DEFAULT_DEVICE: Device = "android";

export function detectDevice(userAgent: string | null | undefined): Device {
  if (!userAgent) return DEFAULT_DEVICE;
  const ua = userAgent.toLowerCase();

  // iPhone first — iPads also match "iphone" in some UA strings; treat them as iphone for our purposes
  if (ua.includes("iphone") || ua.includes("ipad")) return "iphone";

  // Pixel uses "Pixel N" tokens
  if (/\bpixel\b/.test(ua)) return "pixel";

  // Samsung typically has "SM-" model codes or "Samsung"
  if (ua.includes("samsung") || /\bsm-[a-z0-9]+\b/.test(ua)) return "samsung";

  // Generic Android catch-all
  if (ua.includes("android")) return "android";

  return DEFAULT_DEVICE;
}

/**
 * Validate a Device coming from a URL query param.
 * Returns undefined if not a known device family.
 */
export function parseDeviceParam(raw: string | null | undefined): Device | undefined {
  if (!raw) return undefined;
  const r = raw.toLowerCase();
  return (DEVICES as readonly string[]).includes(r) ? (r as Device) : undefined;
}
