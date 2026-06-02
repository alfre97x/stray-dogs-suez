// Refreshes the Supabase auth session on every request and guards /admin.
// Public (guest) browsing is allowed everywhere except the admin area.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Guard the admin area: must be signed in AND admin/coordinator.
  if (path.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const allowed = profile?.is_active && (profile.role === "admin" || profile.role === "coordinator");
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/map";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
