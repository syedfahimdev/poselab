/**
 * Web Share API helpers.
 *
 * The "Open in ChatGPT" / "Open in Gemini" buttons via URL params can't carry
 * an image — those services have no documented URL parameter for image upload.
 * The Web Share API is the answer: navigator.share({ files, text }) opens the
 * iOS / Android native share sheet, and the user picks whichever app they
 * have installed (ChatGPT, Gemini, Photos, etc.). Both image and text get
 * passed through to that app's share extension.
 *
 * Falls back to copy+download on desktop where the API is unavailable.
 */

export type ShareResult = "shared" | "cancelled" | "unsupported" | "error";

/** True when navigator.share supports sharing files (mobile Safari, Chrome Android). */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.canShare !== "function") return false;
  // Probe with a 1-byte placeholder file to feature-detect
  try {
    const probe = new File([new Uint8Array(1)], "probe.jpg", {
      type: "image/jpeg",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Open the native share sheet with the image fetched from `imageUrl` and the
 * prompt as text. User picks the target app (ChatGPT, Gemini, Mail, etc.).
 */
export async function shareImageAndText(args: {
  imageUrl: string;
  prompt: string;
  title?: string;
}): Promise<ShareResult> {
  if (typeof navigator === "undefined" || !navigator.share) return "unsupported";

  try {
    const res = await fetch(args.imageUrl, { credentials: "omit" });
    if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
    const blob = await res.blob();
    // Pick filename from URL or default
    const filename = filenameFromUrl(args.imageUrl) ?? "poselab-photo.jpg";
    const file = new File([blob], filename, {
      type: blob.type || "image/jpeg",
    });

    const data: ShareData & { files?: File[] } = {
      files: [file],
      text: args.prompt,
      title: args.title ?? "PoseLab — edit this photo",
    };

    if (navigator.canShare && !navigator.canShare(data)) {
      // Some browsers report support but reject files — try text+title only
      await navigator.share({
        text: args.prompt,
        title: args.title ?? "PoseLab — edit this photo",
      });
      return "shared";
    }

    await navigator.share(data);
    return "shared";
  } catch (err) {
    // AbortError = user cancelled the share sheet
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    console.warn("[poselab] share failed:", err);
    return "error";
  }
}

/**
 * Download the image to the user's device. Used as part of the desktop
 * fallback when Web Share API isn't available.
 */
export async function downloadImage(imageUrl: string, filename = "poselab-photo.jpg"): Promise<void> {
  const res = await fetch(imageUrl, { credentials: "omit" });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop();
    return last && last.includes(".") ? last : null;
  } catch {
    return null;
  }
}
