/**
 * Profile pictures travel as base64 `data:` URLs on the contact itself, so the
 * API stays JSON-only and there is no file storage to run alongside it.
 */

export const PHOTO_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Mirrors `MAX_PHOTO_BYTES` in the API's `schemas.py`. */
export const MAX_PHOTO_BYTES = 1024 * 1024;

/** Longest edge kept when re-encoding. Ample for an avatar, and small enough
 *  that every list response can carry the photo inline. */
export const PHOTO_MAX_EDGE = 512;

const JPEG_QUALITY = 0.85;

export const PHOTO_DATA_URL =
  /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Decoded size of a base64 data URL, measured without decoding it. */
export function photoBytes(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return (payload.length / 4) * 3 - padding;
}

/**
 * Re-encode a picked image as a downscaled JPEG data URL.
 *
 * Scaling in the browser is what keeps a 5MB camera photo from arriving as a
 * 6.7MB base64 string; it also means the size limit is rarely the user's problem.
 */
export async function encodePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");

    // JPEG has no alpha channel, so fill first or transparent PNGs turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
