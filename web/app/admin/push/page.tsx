"use client";
// Broadcast a push notification to all rescuers. Calls the broadcast-push edge
// function (which re-verifies the caller is staff) with the exact title/body —
// fixing the old dashboard that silently dropped them.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { SightingUrgency } from "@/lib/types";
import { Button, Field, Input, Textarea } from "@/components/ui";

const URGENCIES: SightingUrgency[] = ["low", "medium", "high", "critical"];

export default function AdminPush() {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState<SightingUrgency>("medium");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    if (!title || !body) return;
    setSending(true);
    setResult(null);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("broadcast-push", {
      body: { title, body, urgency },
    });
    setSending(false);
    if (error) {
      setResult(`❌ ${error.message}`);
      return;
    }
    const web = data?.web?.sent ?? 0;
    const expo = data?.expo?.sent ?? 0;
    setResult(`✅ Sent to ${web} web + ${expo} mobile device(s)`);
    setTitle("");
    setBody("");
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold mb-1">{t("admin_push")}</h1>
      <p className="text-text-secondary mb-6">{t("send_to_all")}</p>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <Field label={t("push_title")}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Urgent: injured dog in Arbeen" />
        </Field>
        <Field label={t("push_body")}>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details for rescuers…" />
        </Field>
        <Field label={t("urgency_label")}>
          <div className="flex gap-2">
            {URGENCIES.map((u) => (
              <button key={u} type="button" onClick={() => setUrgency(u)}
                className={`flex-1 py-2 rounded-md border text-xs font-semibold capitalize ${
                  urgency === u ? "bg-primary/20 border-primary text-primary" : "border-border text-text-secondary"
                }`}>
                {u}
              </button>
            ))}
          </div>
        </Field>

        <Button onClick={send} loading={sending} disabled={!title || !body} className="w-full mt-2">
          📣 {t("send_to_all")}
        </Button>
        {result && <p className="text-sm mt-3 text-text-secondary">{result}</p>}
      </div>
    </div>
  );
}
