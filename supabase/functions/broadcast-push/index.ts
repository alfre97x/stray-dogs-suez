// supabase/functions/broadcast-push/index.ts
// Admin/coordinator broadcast: sends a real push (Web Push + Expo) to all
// rescuers with the exact title/body the staff member typed, and logs it.
//
// Replaces the previous approach where the admin panel invoked notify-whatsapp
// with a fabricated sighting record (zone_id "all") whose title/body were
// ignored. Requires a valid admin/coordinator JWT.
//
// Deploy with JWT verification ON (default): the Authorization header must
// carry a signed-in staff user's access token, which this function re-checks.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { authenticate, serviceClient, statusFromError } from "../_shared/auth.ts";
import { deliverToAll } from "../_shared/push.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await authenticate(req, ["admin", "coordinator"]);

    const { title, body, urgency = "medium" } = await req.json();
    if (!title || !body) throw new Error("400: title and body are required");

    const svc = serviceClient();

    const result = await deliverToAll(svc, {
      title,
      body,
      urgency,
      data: { type: "broadcast", sent_by: caller.id },
    });

    // Audit log (broadcast => user_id null)
    await svc.from("notifications").insert({
      user_id: null,
      title,
      body,
      data: { type: "broadcast", sent_by: caller.id, urgency },
    });

    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: String(err instanceof Error ? err.message : err) },
      statusFromError(err),
    );
  }
});
