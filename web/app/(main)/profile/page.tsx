"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { enablePush, pushSupported } from "@/lib/push";
import { Button, EmptyState } from "@/components/ui";

export default function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { profile, session } = useAuthStore();

  const replayTutorial = () => {
    try { localStorage.removeItem("suez_onboarding_v1"); } catch {}
    router.push("/map"); // the tour auto-starts on /map when the flag is absent
  };
  const [pushState, setPushState] = useState<"idle" | "on" | "busy">("idle");
  const [canInstall, setCanInstall] = useState(false);
  const [deferred, setDeferred] = useState<Event | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const doEnablePush = async () => {
    setPushState("busy");
    const ok = await enablePush();
    setPushState(ok ? "on" : "idle");
  };

  const install = async () => {
    const e = deferred as (Event & { prompt: () => Promise<void> }) | null;
    await e?.prompt();
    setCanInstall(false);
  };

  if (!session || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <EmptyState icon="👤" message={t("sign_in_to_add")} />
        <Link href="/auth"><Button>{t("sign_in")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full bg-primary/20 border border-border flex items-center justify-center text-2xl text-primary font-bold">
          {profile.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <h1 className="text-xl font-black text-text-primary mt-3">{profile.display_name}</h1>
        <p className="text-sm text-text-secondary capitalize">{profile.role}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-primary">{profile.dogs_added}</div>
          <div className="text-xs text-text-secondary mt-1">{t("dogs_added_label")}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-sm font-bold text-text-primary">{new Date(profile.created_at).toLocaleDateString()}</div>
          <div className="text-xs text-text-secondary mt-1">{t("member_since")}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {pushSupported() && (
          <Button variant="secondary" onClick={doEnablePush} loading={pushState === "busy"}>
            🔔 {pushState === "on" ? t("notifications_enabled") : t("enable_notifications")}
          </Button>
        )}
        {canInstall && (
          <Button variant="secondary" onClick={install}>📲 {t("install_app")}</Button>
        )}
        <Button variant="ghost" onClick={replayTutorial}>🎓 {t("replay_tutorial")}</Button>
      </div>
    </div>
  );
}
