// Real notification delivery: Web Push (PWA, via VAPID) + Expo push (native).
// No mocks — uses the battle-tested `web-push` library for RFC-8291 payload
// encryption and VAPID signing, and Expo's HTTP push API for native tokens.
import webpush from "npm:web-push@3.6.7";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  urgency?: "low" | "medium" | "high" | "critical";
}

export interface DeliveryResult {
  web: { sent: number; failed: number; pruned: number };
  expo: { sent: number; failed: number };
}

// Send a Web Push to every stored subscription. Subscriptions that return
// 404/410 (Gone) are deleted so the table self-heals.
export async function sendWebPush(
  svc: SupabaseClient,
  payload: PushPayload,
): Promise<DeliveryResult["web"]> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    throw new Error("500: VAPID keys not configured (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
  }

  const { data: subs } = await svc
    .from("web_push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  let sent = 0, failed = 0, pruned = 0;
  const stale: string[] = [];

  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 },
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        stale.push(s.id);
        pruned++;
      } else {
        failed++;
      }
    }
  }));

  if (stale.length) {
    await svc.from("web_push_subscriptions").delete().in("id", stale);
  }
  return { sent, failed, pruned };
}

// Send Expo push to all native tokens (batched at 100 per Expo's limit).
export async function sendExpoPush(
  svc: SupabaseClient,
  payload: PushPayload,
): Promise<DeliveryResult["expo"]> {
  const { data: tokens } = await svc.from("push_tokens").select("token");
  const messages = (tokens ?? []).map(({ token }) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: payload.urgency === "critical" ? "default" : undefined,
    priority: payload.urgency === "high" || payload.urgency === "critical" ? "high" : "normal",
  }));

  let sent = 0, failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length; else failed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }
  return { sent, failed };
}

// Deliver to every channel and return a combined report.
export async function deliverToAll(
  svc: SupabaseClient,
  payload: PushPayload,
): Promise<DeliveryResult> {
  const [web, expo] = await Promise.all([
    sendWebPush(svc, payload),
    sendExpoPush(svc, payload),
  ]);
  return { web, expo };
}
