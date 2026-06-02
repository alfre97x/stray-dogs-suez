// supabase/functions/sign-upload/index.ts
// Issues a presigned PUT URL for Hetzner Object Storage (S3-compatible) so the
// browser can upload a dog photo directly, without exposing storage credentials
// to the client. Returns the presigned URL + the final public URL to persist.
//
// Provider-agnostic: any S3-compatible store works by changing the env vars
// (Hetzner today; R2/MinIO/Supabase-S3 would be the same code).
//
// Env required:
//   S3_ENDPOINT        e.g. https://fsn1.your-objectstorage.com
//   S3_REGION          e.g. fsn1   (Hetzner uses the location code)
//   S3_BUCKET          e.g. suez-dog-photos
//   S3_ACCESS_KEY_ID
//   S3_SECRET_ACCESS_KEY
//   S3_PUBLIC_BASE     public read base, e.g. https://suez-dog-photos.fsn1.your-objectstorage.com
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { authenticate, statusFromError } from "../_shared/auth.ts";

const ENDPOINT = Deno.env.get("S3_ENDPOINT")!;
const REGION = Deno.env.get("S3_REGION") ?? "auto";
const BUCKET = Deno.env.get("S3_BUCKET")!;
const PUBLIC_BASE = (Deno.env.get("S3_PUBLIC_BASE") ?? "").replace(/\/$/, "");

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  // Hetzner uses virtual-hosted-style (default false). Path-style is needed for
  // Supabase Storage / MinIO — set S3_FORCE_PATH_STYLE=true for those.
  forcePathStyle: (Deno.env.get("S3_FORCE_PATH_STYLE") ?? "false") === "true",
  credentials: {
    accessKeyId: Deno.env.get("S3_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("S3_SECRET_ACCESS_KEY")!,
  },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Any active, signed-in user may upload a dog photo.
    await authenticate(req);

    const { dogId, contentType } = await req.json();
    if (!dogId || typeof dogId !== "string") throw new Error("400: dogId is required");
    if (!ALLOWED.has(contentType)) throw new Error("400: contentType must be jpeg/png/webp");

    // crypto.randomUUID is available in the Deno edge runtime.
    const key = `dogs/${dogId}/${crypto.randomUUID()}.${EXT[contentType]}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 300 }, // 5 minutes
    );

    const publicUrl = PUBLIC_BASE
      ? `${PUBLIC_BASE}/${key}`
      : `${ENDPOINT}/${BUCKET}/${key}`;

    return jsonResponse({ uploadUrl, publicUrl, key });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: String(err instanceof Error ? err.message : err) },
      statusFromError(err),
    );
  }
});
