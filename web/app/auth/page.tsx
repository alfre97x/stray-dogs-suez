"use client";
// Sign in / create account. Guests can skip straight to browsing.
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button, Field, Input } from "@/components/ui";

type Mode = "login" | "signup";

function AuthInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/map";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email || !password) return setError(t("error_required"));
    if (password.length < 6) return setError(t("error_password_short"));
    if (mode === "signup" && !name) return setError(t("error_required"));

    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw error;
        setNotice("Account created! Check your email to confirm, then sign in.");
        setMode("login");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-4xl mb-3">🐕</div>
          <h1 className="text-2xl font-black text-text-primary">{t("app_name")}</h1>
          <p className="text-sm text-text-secondary">{t("app_tagline")}</p>
        </div>

        <div className="flex bg-surface border border-border rounded-md p-1 mb-5">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded text-sm font-semibold ${
                mode === m ? "bg-primary text-white" : "text-text-secondary"
              }`}
            >
              {m === "login" ? t("sign_in") : t("sign_up")}
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <Field label={t("your_name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sara Ahmed" />
          </Field>
        )}
        <Field label={t("email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label={t("password")}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>

        {error && <p className="text-sm text-danger mb-3">{error}</p>}
        {notice && <p className="text-sm text-success mb-3">{notice}</p>}

        <Button onClick={submit} loading={loading} className="w-full">
          {mode === "login" ? t("sign_in") : t("sign_up")}
        </Button>

        <Link href="/map" className="block text-center text-sm text-text-secondary mt-4 underline">
          {t("guest_view")}
        </Link>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthInner />
    </Suspense>
  );
}
