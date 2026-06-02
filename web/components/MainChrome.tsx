"use client";
// Header (brand, language toggle, auth) + bottom tab navigation. Wraps all
// rescuer-facing pages. Guests see everything read-only; signing in unlocks
// adding/reporting.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import OnboardingTour from "@/components/OnboardingTour";

const TABS = [
  { href: "/map", key: "tab_map", icon: "🗺️" },
  { href: "/zones", key: "tab_zones", icon: "🏘️" },
  { href: "/dogs", key: "tab_dogs", icon: "🐶" },
  { href: "/alerts", key: "tab_alerts", icon: "🔔" },
  { href: "/profile", key: "tab_profile", icon: "👤" },
] as const;

export default function MainChrome({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile } = useAuthStore();

  const signOut = async () => {
    await createClient().auth.signOut();
    router.refresh();
  };

  const isStaff = profile?.role === "admin" || profile?.role === "coordinator";

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 bg-surface border-b border-border px-4 h-14 flex items-center justify-between">
        <Link href="/map" className="flex items-center gap-2 font-bold text-text-primary">
          <span>🐕</span>
          <span className="text-sm hidden sm:inline">{t("app_name")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            data-tour="lang"
            className="text-xs font-semibold text-text-secondary border border-border rounded-md px-2 py-1"
          >
            {lang === "en" ? "العربية" : "English"}
          </button>
          {isStaff && (
            <Link href="/admin" className="text-xs font-semibold text-primary border border-border rounded-md px-2 py-1">
              {t("admin_panel")}
            </Link>
          )}
          {session ? (
            <button onClick={signOut} className="text-xs font-semibold text-text-secondary border border-border rounded-md px-2 py-1">
              {t("sign_out")}
            </button>
          ) : (
            <Link href="/auth" className="text-xs font-semibold text-white bg-primary rounded-md px-3 py-1">
              {t("sign_in")}
            </Link>
          )}
        </div>
      </header>

      <OnboardingTour />
      <main className="flex-1 pb-16">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border h-16 flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-tour={`nav-${tab.href.slice(1)}`}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                active ? "text-primary" : "text-text-tertiary"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {t(tab.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
