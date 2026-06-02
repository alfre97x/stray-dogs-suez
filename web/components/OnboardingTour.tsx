"use client";
// Hands-on guided tour shown on first login/sign-up.
// Step 1 is a language chooser (EN/AR). The rest walks the map page, makes the
// user press real controls (filter, neighbourhoods), then guides them through
// actually adding a dog + marking TNR in the real form. Replayable from profile.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { driver, type Driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuthStore } from "@/lib/store";

const STORAGE_KEY = "suez_onboarding_v1";

export default function OnboardingTour() {
  const { t, setLang } = useI18n();
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const [phase, setPhase] = useState<"idle" | "lang" | "tour">("idle");
  const triggeredRef = useRef(false);
  const driverRef = useRef<Driver | null>(null);

  // Trigger: first time a logged-in user reaches the map, or on replay.
  useEffect(() => {
    if (pathname !== "/map") return;
    let seen = true;
    try { seen = !!localStorage.getItem(STORAGE_KEY); } catch {}
    if (session && !seen && !triggeredRef.current) {
      triggeredRef.current = true;
      setPhase("lang");
    }
    const onReplay = () => { triggeredRef.current = true; setPhase("lang"); };
    window.addEventListener("suez:start-tour", onReplay);
    return () => window.removeEventListener("suez:start-tour", onReplay);
  }, [pathname, session]);

  // Drive the guided steps once a language has been chosen (phase === "tour").
  useEffect(() => {
    if (phase !== "tour") return;
    let cancelled = false;
    let cleanupStep: (() => void) | null = null;

    const markDone = () => { try { localStorage.setItem(STORAGE_KEY, "1"); } catch {} };

    const info = (element: string, titleKey: string, bodyKey: string): DriveStep => ({
      element,
      disableActiveInteraction: true,
      popover: { title: t(titleKey as never), description: t(bodyKey as never) },
    });

    const handsOn = (
      element: string,
      titleKey: string,
      bodyKey: string,
      attach: (el: HTMLElement, next: () => void) => () => void,
    ): DriveStep => ({
      element,
      disableActiveInteraction: false,
      popover: {
        title: t(titleKey as never),
        description: `${t(bodyKey as never)}<br/><br/><b>${t("tour_do_it")}</b>`,
        showButtons: ["previous", "close"],
      },
      onHighlighted: (el) => { if (el) cleanupStep = attach(el as HTMLElement, () => driverRef.current?.moveNext()); },
      onDeselected: () => { cleanupStep?.(); cleanupStep = null; },
    });

    const steps: DriveStep[] = [
      info('[data-tour="map"]', "tour_map_title", "tour_map_body"),
      handsOn('[data-tour="filters"]', "tour_filters_title", "tour_filters_body", (el, next) => {
        const h = (e: Event) => { if ((e.target as HTMLElement).closest("button")) next(); };
        el.addEventListener("click", h);
        return () => el.removeEventListener("click", h);
      }),
      handsOn('[data-tour="zones-toggle"]', "tour_zones_title", "tour_zones_body", (el, next) => {
        const cb = el.querySelector<HTMLInputElement>('input[type="checkbox"]');
        const h = () => cb?.checked && next();
        cb?.addEventListener("change", h);
        return () => cb?.removeEventListener("change", h);
      }),
      info('[data-tour="nav-zones"]', "tour_navzones_title", "tour_navzones_body"),
      info('[data-tour="nav-dogs"]', "tour_navdogs_title", "tour_navdogs_body"),
      info('[data-tour="nav-alerts"]', "tour_navalerts_title", "tour_navalerts_body"),
      info('[data-tour="nav-profile"]', "tour_navprofile_title", "tour_navprofile_body"),
      info('[data-tour="lang"]', "tour_lang_title", "tour_lang_body"),
      // Hands-on: open the real Add-Dog form, then walk its fields.
      handsOn('[data-tour="add"]', "tour_add_open_title", "tour_add_open_body", (el, next) => {
        const h = () => setTimeout(next, 450); // let the dialog mount
        el.addEventListener("click", h, { once: true });
        return () => el.removeEventListener("click", h);
      }),
      info('[data-tour="dog-photo"]', "tour_dogphoto_title", "tour_dogphoto_body"),
      info('[data-tour="dog-location"]', "tour_dogloc_title", "tour_dogloc_body"),
      info('[data-tour="dog-tnr"]', "tour_dogtnr_title", "tour_dogtnr_body"),
      info('[data-tour="dog-save"]', "tour_dogsave_title", "tour_dogsave_body"),
      { popover: { title: t("tour_done_title"), description: t("tour_done_body") } },
    ];

    const config: Config = {
      showProgress: true,
      allowClose: true,
      overlayColor: "#1A1209",
      stagePadding: 6,
      stageRadius: 10,
      nextBtnText: t("tour_next"),
      prevBtnText: t("tour_back"),
      doneBtnText: t("tour_done_btn"),
      progressText: "{{current}}/{{total}}",
      steps,
      onDestroyStarted: () => {
        markDone();
        cleanupStep?.(); cleanupStep = null;
        driverRef.current?.destroy();
        driverRef.current = null;
        setPhase("idle");
      },
    };

    let tries = 0;
    const tick = () => {
      if (cancelled) return;
      if (document.querySelector('[data-tour="add"]') && document.querySelector('[data-tour="nav-profile"]')) {
        driverRef.current = driver(config);
        driverRef.current.drive();
      } else if (tries++ < 50) {
        setTimeout(tick, 150);
      }
    };
    tick();

    return () => {
      cancelled = true;
      cleanupStep?.();
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [phase, t]);

  if (phase !== "lang") return null;

  const pick = (l: Lang) => { setLang(l); setPhase("tour"); };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm text-center">
        <div className="text-4xl mb-2">🐕</div>
        <h2 className="text-lg font-bold text-text-primary">{t("tour_lang_pick_title")}</h2>
        <p className="text-sm text-text-secondary mb-5" dir="auto">{t("tour_lang_pick_body")}</p>
        <div className="flex gap-3">
          <button onClick={() => pick("en")} className="flex-1 py-3 rounded-lg bg-primary text-white font-bold">English</button>
          <button onClick={() => pick("ar")} className="flex-1 py-3 rounded-lg bg-primary text-white font-bold">العربية</button>
        </div>
        <button
          onClick={() => { try { localStorage.setItem(STORAGE_KEY, "1"); } catch {} setPhase("idle"); }}
          className="mt-4 text-xs text-text-tertiary underline"
        >
          {t("tour_skip")}
        </button>
      </div>
    </div>
  );
}
