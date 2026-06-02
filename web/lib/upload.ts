"use client";
// Photo pipeline: resize/compress in the browser to WebP (~1000px) to keep
// storage small, get a presigned PUT URL from the `sign-upload` edge function
// (Hetzner Object Storage today), upload directly, and return the public URL.
import { createClient } from "@/lib/supabase/client";

// Downscale + re-encode an image File to a WebP Blob.
export async function compressImage(file: File, maxDim = 1000, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encode failed"))),
      "image/webp",
      quality,
    ),
  );
}

// Compress, request a presigned URL, upload, return the public URL.
export async function uploadDogPhoto(file: File, dogId: string): Promise<string> {
  const blob = await compressImage(file);
  const supabase = createClient();

  const { data, error } = await supabase.functions.invoke("sign-upload", {
    body: { dogId, contentType: "image/webp" },
  });
  if (error || !data?.uploadUrl) {
    throw new Error(error?.message ?? "Could not get upload URL");
  }

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/webp" },
    body: blob,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  return data.publicUrl as string;
}
