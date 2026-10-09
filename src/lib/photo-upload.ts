/**
 * Photo attachments for reviews.
 *
 * Photos are stored as `data:image/...;base64` strings (the app has no object
 * storage), so the client compresses every file before uploading and both the
 * client and the API enforce the same limits.
 *
 * Everything here is import-safe on the server: only `compressImageFile()`
 * touches the browser APIs, and only when it is called.
 */

/** Hard ceiling for the project setting (photos per review). */
export const MAX_PHOTOS_LIMIT = 6;
/** Hard ceiling for the project setting (kilobytes per photo). */
export const MAX_PHOTO_SIZE_LIMIT_KB = 4096;
/** Longest edge a compressed photo keeps, in pixels. */
export const PHOTO_MAX_EDGE = 1280;

const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export type PhotoLimits = {
  allowPhotos: boolean;
  maxPhotos: number;
  maxPhotoSizeKb: number;
};

export function clampPhotoLimits(limits: Partial<PhotoLimits>): PhotoLimits {
  return {
    allowPhotos: limits.allowPhotos !== false,
    maxPhotos: Math.max(1, Math.min(MAX_PHOTOS_LIMIT, Math.round(Number(limits.maxPhotos) || 1))),
    maxPhotoSizeKb: Math.max(64, Math.min(MAX_PHOTO_SIZE_LIMIT_KB, Math.round(Number(limits.maxPhotoSizeKb) || 64))),
  };
}

export function isPhotoValue(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  if (DATA_URL_PATTERN.test(value)) return true;
  // External links are accepted too, so an admin can paste an existing photo URL.
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Approximate size of a stored photo in kilobytes (base64 payload decoded). */
export function photoSizeKb(value: string): number {
  const comma = value.indexOf(",");
  if (!value.startsWith("data:") || comma === -1) return 0;
  return Math.ceil(((value.length - comma - 1) * 3) / 4 / 1024);
}

/**
 * Validates a submitted photo list against the project settings.
 * Returns the accepted list, or an error message for the API response.
 */
export function sanitizePhotos(input: unknown, limits: PhotoLimits): { photos: string[]; error: string | null } {
  const list = input === undefined || input === null ? [] : input;
  if (!Array.isArray(list) || list.length === 0) return { photos: [], error: null };
  if (!limits.allowPhotos) {
    return { photos: [], error: "Photo attachments are disabled for this project." };
  }
  if (list.length > limits.maxPhotos) {
    return { photos: [], error: `You can attach up to ${limits.maxPhotos} photo${limits.maxPhotos === 1 ? "" : "s"}.` };
  }
  if (!list.every(isPhotoValue)) {
    return { photos: [], error: "Only JPEG, PNG or WebP images are accepted." };
  }
  const photos = list as string[];
  const tooLarge = photos.filter((photo) => photoSizeKb(photo) > limits.maxPhotoSizeKb);
  if (tooLarge.length) {
    return { photos: [], error: `Each photo must be smaller than ${limits.maxPhotoSizeKb} KB.` };
  }
  return { photos, error: null };
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This file could not be read as an image."));
      image.src = objectUrl;
    });
    return image;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

/**
 * Reads an image file and re-encodes it as a JPEG data URL under `maxKb`.
 * Client-side only: needs canvas and URL.createObjectURL.
 */
export async function compressImageFile(file: File, maxKb: number, maxEdge = PHOTO_MAX_EDGE): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be attached.");
  const image = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || maxEdge, image.naturalHeight || maxEdge));
  const width = Math.max(1, Math.round((image.naturalWidth || maxEdge) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || maxEdge) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot process images.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  // Step the quality down until the photo fits the project limit.
  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (photoSizeKb(dataUrl) > maxKb && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (photoSizeKb(dataUrl) > maxKb) {
    throw new Error(`This photo is too large — the limit is ${maxKb} KB.`);
  }
  return dataUrl;
}
