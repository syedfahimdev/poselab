/**
 * Tiny client-side helpers around File / preview URLs.
 *
 * We deliberately keep these simple: the backend does the real normalization
 * (EXIF strip, resize, JPEG re-encode) so even buggy clients can't bypass it.
 */

export const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export function validateFile(file: File): { ok: true } | { ok: false; reason: string } {
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: "That doesn't look like an image." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "Image is over 12 MB — try a smaller file." };
  }
  return { ok: true };
}

export function previewURL(file: File): string {
  return URL.createObjectURL(file);
}

export function revokePreview(url: string): void {
  URL.revokeObjectURL(url);
}
