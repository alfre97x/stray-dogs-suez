"use client";
// Browser Supabase client. Uses the public anon key only — RLS enforces all
// access control. The service-role key is NEVER referenced in client code.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
