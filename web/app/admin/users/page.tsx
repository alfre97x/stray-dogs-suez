"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { Profile, UserRole } from "@/lib/types";
import { Spinner } from "@/components/ui";

export default function AdminUsers() {
  const { t } = useI18n();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setUsers((data as Profile[]) ?? []);
      setLoading(false);
    });
  }, []);

  const changeRole = async (id: string, role: UserRole) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (!error) setUsers((p) => p.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ is_active: !isActive }).eq("id", id);
    if (!error) setUsers((p) => p.map((u) => (u.id === id ? { ...u, is_active: !isActive } : u)));
  };

  if (loading) return <Spinner label={t("loading")} />;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t("admin_users")}</h1>
      <p className="text-text-secondary mb-5">{users.length} registered</p>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background text-text-tertiary text-xs uppercase">
              {["Name", "Role", "Dogs", "Joined", "Status", ""].map((h) => (
                <th key={h} className="text-start px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold">{u.display_name}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                    className="bg-background border border-border rounded-md px-2 py-1 text-xs">
                    <option value="rescuer">Rescuer</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-primary font-bold">{u.dogs_added}</td>
                <td className="px-4 py-3 text-text-tertiary">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full border ${u.is_active ? "bg-success-bg text-success border-success-border" : "bg-danger-bg text-danger border-danger-border"}`}>
                    {u.is_active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u.id, u.is_active)}
                    className="text-primary border border-border rounded-md px-2 py-1 text-xs">
                    {u.is_active ? "Suspend" : "Restore"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
