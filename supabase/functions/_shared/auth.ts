// Authenticates the caller of an edge function from the incoming
// Authorization: Bearer <jwt> header and (optionally) enforces a role.
//
// Returns the resolved profile or throws an Error with an HTTP-ish message.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface CallerProfile {
  id: string;
  role: "rescuer" | "coordinator" | "admin";
  is_active: boolean;
  display_name: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// A service-role client for privileged data access (bypasses RLS).
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Resolve the caller from their JWT and load their profile.
// `requireRoles` (if given) enforces membership; throws otherwise.
export async function authenticate(
  req: Request,
  requireRoles?: Array<CallerProfile["role"]>,
): Promise<CallerProfile> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("401: missing Authorization bearer token");

  // Verify the JWT by asking Supabase Auth who this token belongs to.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) throw new Error("401: invalid session");

  // Load the profile with the service client (RLS-independent, single source of truth).
  const svc = serviceClient();
  const { data: profile, error: pErr } = await svc
    .from("profiles")
    .select("id, role, is_active, display_name")
    .eq("id", userData.user.id)
    .single();

  if (pErr || !profile) throw new Error("403: no profile for this user");
  if (!profile.is_active) throw new Error("403: account is suspended");

  if (requireRoles && !requireRoles.includes(profile.role)) {
    throw new Error(`403: requires role ${requireRoles.join(" or ")}`);
  }
  return profile as CallerProfile;
}

// Maps an Error thrown above to an HTTP status code (default 400).
export function statusFromError(err: unknown): number {
  const msg = String(err instanceof Error ? err.message : err);
  const match = msg.match(/^(\d{3}):/);
  return match ? Number(match[1]) : 400;
}
