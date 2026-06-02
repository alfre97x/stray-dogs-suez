"use client";
// Web Push subscription: asks permission, subscribes via the service worker's
// PushManager using the VAPID public key, and stores the subscription so the
// `broadcast-push` / `notify-whatsapp` edge functions can reach this device.
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// Subscribe the current device. Returns true on success. Requires the user to
// be signed in (RLS ties the subscription to their profile).
export async function enablePush(): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    }));

  const json = sub.toJSON();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("web_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  return !error;
}
