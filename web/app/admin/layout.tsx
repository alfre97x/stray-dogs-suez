"use client";
// Admin shell. Access is enforced server-side by middleware (admin/coordinator
// only). Uses the anon key + the signed-in admin's session — RLS authorizes
// every read/write. No service-role key ever reaches the browser.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const NAV = [
  { href: "/admin", key: "admin_overview", icon: "📊" },
  { href: "/admin/dogs", key: "admin_dogs", icon: "🐶" },
  { href: "/admin/users", key: "admin_users", icon: "👥" },
  { href: "/admin/alerts", key: "admin_alerts", icon: "🔔" },
  { href: "/admin/reports", key: "admin_reports", icon: "📄" },
  { href: "/admin/push", key: "admin_push", icon: "📣" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <div className="min-h-[100dvh] flex">
      <aside className="no-print w-56 shrink-0 bg-surface border-e border-border p-4 hidden md:block">
        <div className="mb-6">
          <div className="text-2xl">🐕</div>
          <div className="font-bold text-sm">{t("app_name")}</div>
          <div className="text-[10px] uppercase tracking-wide text-text-tertiary">{t("admin_panel")}</div>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  active ? "bg-surface-light text-primary border-s-2 border-primary" : "text-text-secondary"
                }`}>
                <span>{n.icon}</span>{t(n.key)}
              </Link>
            );
          })}
        </nav>
        <Link href="/map" className="block mt-8 text-xs text-text-tertiary">← {t("tab_map")}</Link>
      </aside>

      {/* Mobile top nav */}
      <div className="no-print md:hidden fixed top-0 inset-x-0 z-20 bg-surface border-b border-border flex overflow-x-auto no-scrollbar">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href}
              className={`px-3 py-3 text-xs whitespace-nowrap ${active ? "text-primary" : "text-text-secondary"}`}>
              {n.icon} {t(n.key)}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
