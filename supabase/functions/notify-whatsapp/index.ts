// supabase/functions/notify-whatsapp/index.ts
// Triggered by a Supabase DB webhook when a new sighting is INSERTed.
// Sends real push notifications (Web Push + Expo) to everyone, and — only if
// Twilio credentials are configured — also a WhatsApp message to coordinators.
//
// WhatsApp is deferred for launch: leave the TWILIO_* secrets unset and this
// function quietly skips it while still delivering push + logging.
//
// Invoked by the webhook with the service role / anon key in the Authorization
// header; it uses the service role internally for data access.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/auth.ts";
import { deliverToAll } from "../_shared/push.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "";
const WHATSAPP_GROUP_TO = Deno.env.get("WHATSAPP_NOTIFY_NUMBER") ?? "";

const URGENCY_EMOJI: Record<string, string> = {
  low: "👁️", medium: "⚠️", high: "🔴", critical: "🚨",
};

const twilioConfigured = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM && WHATSAPP_GROUP_TO,
);

// This function has verify_jwt=false (it is called by a DB webhook, not a user
// session), so it would otherwise be open to anyone POSTing a fake record to
// spam push notifications. Require a shared secret header that the webhook
// sends. Set WEBHOOK_SECRET as a function secret and add the matching header
// to the Supabase webhook config.
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  try {
    if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
      return jsonResponse({ ok: false, error: "401: bad webhook secret" }, 401);
    }
    const payload = await req.json();
    const sighting = payload.record; // Supabase INSERT webhook shape
    if (!sighting?.id) throw new Error("400: missing sighting record");

    const svc = serviceClient();

    const { data: zone } = await svc
      .from("zones").select("name_en, name_ar").eq("id", sighting.zone_id).single();
    const { data: reporter } = await svc
      .from("profiles").select("display_name").eq("id", sighting.reported_by).single();

    const emoji = URGENCY_EMOJI[sighting.urgency] ?? "👁️";
    const zoneName = zone?.name_en ?? "Suez";
    const title = `${emoji} New sighting — ${zoneName}`;
    const body = sighting.description
      ? String(sighting.description).substring(0, 120)
      : `~${sighting.count} dog(s) spotted`;

    // 1. Push to everyone (web + native)
    const delivery = await deliverToAll(svc, {
      title,
      body,
      urgency: sighting.urgency,
      data: { type: "sighting", sighting_id: sighting.id, zone_id: sighting.zone_id },
    });

    // 2. WhatsApp to coordinators (only for medium+ urgency, only if configured)
    let whatsapp = "skipped";
    if (twilioConfigured && ["medium", "high", "critical"].includes(sighting.urgency)) {
      const msg = `${emoji} *New Sighting — ${zoneName}*\n` +
        `Dogs seen: ~${sighting.count}\n` +
        `${sighting.description ?? ""}\n` +
        `Reported by: ${reporter?.display_name ?? "rescuer"}`;
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: TWILIO_WHATSAPP_FROM,
            To: `whatsapp:${WHATSAPP_GROUP_TO}`,
            Body: msg,
          }),
        },
      );
      whatsapp = res.ok ? "sent" : `error:${await res.text()}`;
    }

    // 3. Audit log
    await svc.from("notifications").insert({
      user_id: null,
      title,
      body,
      data: { type: "sighting", sighting_id: sighting.id },
    });

    return jsonResponse({ ok: true, delivery, whatsapp });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: String(err instanceof Error ? err.message : err) },
      500,
    );
  }
});
