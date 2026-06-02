// Keep-alive endpoint hit by a daily Vercel Cron so the Supabase free-tier
// project doesn't pause after 7 days of inactivity. Runs a trivial query.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("zones").select("id").limit(1);
  return NextResponse.json({ ok: !error, at: new Date().toISOString() });
}
