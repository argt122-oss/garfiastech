import { supabase } from "@/integrations/supabase/client";

export const MEDIA_PREFIX = "/api/public/media/";
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
export const MAX_BYTES = 5 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Formato no permitido. Usa JPG, PNG, WEBP, SVG o GIF.";
  if (file.size > MAX_BYTES * 4) return "La imagen es demasiado grande (máx. 5 MB tras compresión).";
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Resize to max 1600px width and re-encode as webp. SVG/GIF are uploaded as-is. */
export async function compressImage(file: File | Blob, type = (file as File).type): Promise<Blob> {
  if (type === "image/svg+xml" || type === "image/gif") return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, 1600 / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("compress"))), "image/webp", 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Crop a source image to a pixel area and return a blob. */
export async function cropImage(src: string, area: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("crop"))), "image/webp", 0.9));
}

/** Uploads to the site-media bucket; returns the public URL served by the media route. */
export async function uploadImage(file: File | Blob, folder: string, onProgress?: (p: number) => void): Promise<string> {
  const originalType = (file as File).type || "image/webp";
  onProgress?.(10);
  const blob = await compressImage(file, originalType);
  if (blob.size > MAX_BYTES) throw new Error("La imagen supera 5 MB incluso después de comprimirla.");
  onProgress?.(40);
  const ext = blob.type === "image/svg+xml" ? "svg" : blob.type === "image/gif" ? "gif" : blob.type === "image/png" ? "png" : "webp";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("site-media").upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error("No se pudo subir la imagen: " + error.message);
  onProgress?.(100);
  return MEDIA_PREFIX + path;
}

/** Deletes a file from storage if the URL belongs to our bucket. Silently ignores external URLs. */
export async function deleteImage(url: string | null | undefined) {
  if (!url || !url.startsWith(MEDIA_PREFIX)) return;
  await supabase.storage.from("site-media").remove([url.slice(MEDIA_PREFIX.length)]);
}
