// admin/src/pages/Dashboard.tsx
// Full admin dashboard: stats, zone heatmap, user management, CSV export, push notifications

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY  // service role key — admin only
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoneStat {
  id: string; name_en: string; name_ar: string;
  total_dogs: number; tnr_count: number; vaccinated_count: number;
  injured_count: number; recent_sightings: number;
}
interface Profile {
  id: string; display_name: string; role: string; dogs_added: number;
  is_active: boolean; created_at: string;
}
interface Dog {
  id: string; name: string | null; zone_id: string; tnr_done: boolean;
  vaccinated: boolean; is_injured: boolean; caught_at: string;
  added_by: string; profiles?: { display_name: string };
  zones?: { name_en: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ];
  return lines.join("\n");
}

function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "dogs" | "users" | "alerts" | "push">("overview");
  const [zoneStats, setZoneStats] = useState<ZoneStat[]>([]);
  const [dogs, setDogs]           = useState<Dog[]>([]);
  const [users, setUsers]         = useState<Profile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [pushMsg, setPushMsg]     = useState({ title: "", body: "", urgency: "low" });
  const [sending, setSending]     = useState(false);
  const [dogFilter, setDogFilter] = useState({ zone: "", tnr: "", search: "" });

  // Global summary
  const totalDogs  = zoneStats.reduce((a, z) => a + Number(z.total_dogs), 0);
  const totalTnr   = zoneStats.reduce((a, z) => a + Number(z.tnr_count), 0);
  const totalVacc  = zoneStats.reduce((a, z) => a + Number(z.vaccinated_count), 0);
  const tnrPct     = totalDogs ? Math.round(totalTnr / totalDogs * 100) : 0;

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: zs }, { data: ds }, { data: us }] = await Promise.all([
        supabase.from("zone_stats").select("*").order("total_dogs", { ascending: false }),
        supabase.from("dogs").select("*, profiles(display_name), zones(name_en)").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);
      setZoneStats(zs ?? []);
      setDogs(ds ?? []);
      setUsers(us ?? []);
      setLoading(false);
    };
    load();

    // Realtime
    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "dogs" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sightings" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Export dogs to CSV
  const exportDogs = useCallback(() => {
    const rows = dogs.map(d => ({
      id: d.id, name: d.name ?? "Unnamed", zone: d.zones?.name_en ?? d.zone_id,
      tnr_done: d.tnr_done, vaccinated: d.vaccinated, is_injured: d.is_injured,
      caught_at: d.caught_at, added_by: d.profiles?.display_name ?? d.added_by,
    }));
    downloadCSV(toCSV(rows), `suez-dogs-${new Date().toISOString().split("T")[0]}.csv`);
  }, [dogs]);

  // Toggle user active
  const toggleUser = useCallback(async (userId: string, isActive: boolean) => {
    await supabase.from("profiles").update({ is_active: !isActive }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
  }, []);

  // Change user role
  const changeRole = useCallback(async (userId: string, role: string) => {
    await supabase.from("profiles").update({ role }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  }, []);

  // Send push notification
  const sendPush = useCallback(async () => {
    if (!pushMsg.title || !pushMsg.body) return;
    setSending(true);
    await supabase.functions.invoke("notify-whatsapp", {
      body: { record: { ...pushMsg, zone_id: "all", count: 0, reported_by: "admin", created_at: new Date().toISOString() } },
    });
    setSending(false);
    setPushMsg({ title: "", body: "", urgency: "low" });
    alert("Push notification sent!");
  }, [pushMsg]);

  // Delete dog (admin)
  const deleteDog = useCallback(async (dogId: string) => {
    if (!confirm("Delete this dog record permanently?")) return;
    await supabase.from("dogs").delete().eq("id", dogId);
    setDogs(prev => prev.filter(d => d.id !== dogId));
  }, []);

  const filteredDogs = dogs.filter(d => {
    if (dogFilter.zone   && d.zone_id !== dogFilter.zone)                    return false;
    if (dogFilter.tnr === "yes" && !d.tnr_done)                              return false;
    if (dogFilter.tnr === "no"  && d.tnr_done)                               return false;
    if (dogFilter.search && !(d.name ?? "Unnamed").toLowerCase().includes(dogFilter.search.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#1a1209", color:"#c8860a", fontSize:20 }}>
      🐕 Loading admin panel…
    </div>
  );

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#1a1209", minHeight:"100vh", color:"#f0e6d3" }}>
      {/* Sidebar */}
      <aside style={{ position:"fixed", left:0, top:0, bottom:0, width:220, background:"#2a1f0e", borderRight:"1px solid #4a3520", padding:"24px 0", zIndex:100 }}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid #4a3520", marginBottom:16 }}>
          <div style={{ fontSize:22 }}>🐕</div>
          <div style={{ fontWeight:700, fontSize:14, marginTop:4 }}>Suez Stray Tracker</div>
          <div style={{ fontSize:10, color:"#806040", textTransform:"uppercase", letterSpacing:1 }}>Admin Panel</div>
        </div>
        {([
          ["overview", "📊", "Overview"],
          ["dogs",     "🐶", "Dog Records"],
          ["users",    "👥", "Users"],
          ["alerts",   "🔔", "Alerts"],
          ["push",     "📣", "Send Notification"],
        ] as const).map(([tab, icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 20px",
            background: activeTab === tab ? "#3a2a14" : "transparent",
            border:"none", borderLeft: activeTab === tab ? "3px solid #c8860a" : "3px solid transparent",
            color: activeTab === tab ? "#c8860a" : "#a08060", fontSize:14, cursor:"pointer", textAlign:"left"
          }}>
            <span>{icon}</span>{label}
          </button>
        ))}
        <div style={{ position:"absolute", bottom:20, left:0, right:0, padding:"0 20px" }}>
          <div style={{ fontSize:11, color:"#504030" }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft:220, padding:32 }}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Overview</h1>
            <p style={{ color:"#806040", marginBottom:28 }}>Real-time status across all Suez City zones</p>

            {/* Global stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:32 }}>
              {[
                { num: totalDogs,        label: "Total dogs tracked", color: "#f0e6d3" },
                { num: totalTnr,         label: "TNR done",            color: "#4aaa6a" },
                { num: totalVacc,        label: "Vaccinated",          color: "#4a90d0" },
                { num: `${tnrPct}%`,    label: "TNR rate",            color: "#c8860a" },
              ].map(({ num, label, color }) => (
                <div key={label} style={{ background:"#2a1f0e", borderRadius:12, border:"1px solid #4a3520", padding:"20px 24px" }}>
                  <div style={{ fontSize:36, fontWeight:900, color }}>{num}</div>
                  <div style={{ fontSize:12, color:"#806040", marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Zone table */}
            <div style={{ background:"#2a1f0e", borderRadius:12, border:"1px solid #4a3520", overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #4a3520", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:700 }}>Zone breakdown</span>
                <button onClick={exportDogs} style={{ background:"#c8860a", color:"white", border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                  ⬇ Export CSV
                </button>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#1a1209" }}>
                    {["Zone","Total","TNR","Vaccinated","Injured","TNR %","Progress"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, color:"#806040", textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zoneStats.map((z, i) => {
                    const pct = z.total_dogs ? Math.round(Number(z.tnr_count)/Number(z.total_dogs)*100) : 0;
                    return (
                      <tr key={z.id} style={{ borderTop:"1px solid #3a2a14", background: i % 2 ? "#251a0c" : "transparent" }}>
                        <td style={{ padding:"12px 16px", fontWeight:600 }}>{z.name_en}</td>
                        <td style={{ padding:"12px 16px" }}>{z.total_dogs}</td>
                        <td style={{ padding:"12px 16px", color:"#4aaa6a" }}>{z.tnr_count}</td>
                        <td style={{ padding:"12px 16px", color:"#4a90d0" }}>{z.vaccinated_count}</td>
                        <td style={{ padding:"12px 16px", color: Number(z.injured_count) > 0 ? "#e84040" : "#a08060" }}>{z.injured_count}</td>
                        <td style={{ padding:"12px 16px", fontWeight:700, color: pct >= 70 ? "#4aaa6a" : pct >= 40 ? "#c8860a" : "#e84040" }}>{pct}%</td>
                        <td style={{ padding:"12px 16px", minWidth:120 }}>
                          <div style={{ height:8, background:"#1a1209", borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background: pct >= 70 ? "#4aaa6a" : pct >= 40 ? "#c8860a" : "#e84040", borderRadius:4, transition:"width 0.5s" }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DOGS */}
        {activeTab === "dogs" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
              <div>
                <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Dog records</h1>
                <p style={{ color:"#806040" }}>{filteredDogs.length} of {dogs.length} records shown</p>
              </div>
              <button onClick={exportDogs} style={{ background:"#c8860a", color:"white", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer", fontWeight:600 }}>
                ⬇ Export CSV
              </button>
            </div>

            {/* Filters */}
            <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
              <input placeholder="Search by name…" value={dogFilter.search}
                onChange={e => setDogFilter(f => ({ ...f, search: e.target.value }))}
                style={{ background:"#2a1f0e", border:"1px solid #4a3520", borderRadius:8, padding:"8px 14px", color:"#f0e6d3", fontSize:13, outline:"none" }} />
              <select value={dogFilter.zone} onChange={e => setDogFilter(f => ({ ...f, zone: e.target.value }))}
                style={{ background:"#2a1f0e", border:"1px solid #4a3520", borderRadius:8, padding:"8px 14px", color:"#f0e6d3", fontSize:13 }}>
                <option value="">All zones</option>
                {zoneStats.map(z => <option key={z.id} value={z.id}>{z.name_en}</option>)}
              </select>
              <select value={dogFilter.tnr} onChange={e => setDogFilter(f => ({ ...f, tnr: e.target.value }))}
                style={{ background:"#2a1f0e", border:"1px solid #4a3520", borderRadius:8, padding:"8px 14px", color:"#f0e6d3", fontSize:13 }}>
                <option value="">TNR: All</option>
                <option value="yes">TNR done</option>
                <option value="no">Needs TNR</option>
              </select>
            </div>

            <div style={{ background:"#2a1f0e", borderRadius:12, border:"1px solid #4a3520", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#1a1209" }}>
                    {["Name","Zone","Added by","Caught","TNR","Vaccinated","Injured","Actions"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, color:"#806040", textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDogs.slice(0, 200).map((dog, i) => (
                    <tr key={dog.id} style={{ borderTop:"1px solid #3a2a14", background: i % 2 ? "#251a0c" : "transparent" }}>
                      <td style={{ padding:"10px 16px", fontWeight:600 }}>{dog.name ?? "—"}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, color:"#a08060" }}>{dog.zones?.name_en ?? dog.zone_id}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, color:"#a08060" }}>{dog.profiles?.display_name ?? "—"}</td>
                      <td style={{ padding:"10px 16px", fontSize:12, color:"#806040" }}>{dog.caught_at}</td>
                      <td style={{ padding:"10px 16px" }}><span style={{ color: dog.tnr_done ? "#4aaa6a" : "#c8860a", fontSize:18 }}>{dog.tnr_done ? "✅" : "❌"}</span></td>
                      <td style={{ padding:"10px 16px" }}><span style={{ color: dog.vaccinated ? "#4a90d0" : "#806040", fontSize:18 }}>{dog.vaccinated ? "✅" : "❌"}</span></td>
                      <td style={{ padding:"10px 16px" }}><span style={{ color: dog.is_injured ? "#e84040" : "#4a3520", fontSize:18 }}>{dog.is_injured ? "🩹" : "—"}</span></td>
                      <td style={{ padding:"10px 16px" }}>
                        <button onClick={() => deleteDog(dog.id)} style={{ background:"#3a1a1a", border:"1px solid #5a2a2a", color:"#e84040", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDogs.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:"#605040" }}>No records found</div>
              )}
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>User management</h1>
            <p style={{ color:"#806040", marginBottom:24 }}>{users.length} registered rescuers</p>

            <div style={{ background:"#2a1f0e", borderRadius:12, border:"1px solid #4a3520", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#1a1209" }}>
                    {["Name","Role","Dogs added","Joined","Status","Actions"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, color:"#806040", textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderTop:"1px solid #3a2a14", background: i % 2 ? "#251a0c" : "transparent" }}>
                      <td style={{ padding:"12px 16px", fontWeight:600 }}>{u.display_name}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                          style={{ background:"#1a1209", border:"1px solid #4a3520", borderRadius:6, padding:"4px 8px", color:"#f0e6d3", fontSize:12 }}>
                          <option value="rescuer">Rescuer</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding:"12px 16px", color:"#c8860a", fontWeight:700 }}>{u.dogs_added}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"#806040" }}>
                        {new Date(u.created_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background: u.is_active ? "#1a3a25" : "#3a1a1a", color: u.is_active ? "#4aaa6a" : "#e84040", border:`1px solid ${u.is_active ? "#2a5a35" : "#5a2a2a"}` }}>
                          {u.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <button onClick={() => toggleUser(u.id, u.is_active)} style={{ background:"#3a2a14", border:"1px solid #5a4a24", color:"#c8860a", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>
                          {u.is_active ? "Suspend" : "Restore"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PUSH NOTIFICATION */}
        {activeTab === "push" && (
          <div style={{ maxWidth:600 }}>
            <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Send notification</h1>
            <p style={{ color:"#806040", marginBottom:32 }}>Broadcast a push notification to all active rescuers</p>

            <div style={{ background:"#2a1f0e", borderRadius:16, border:"1px solid #4a3520", padding:28 }}>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:"#806040", textTransform:"uppercase", letterSpacing:0.5, display:"block", marginBottom:6 }}>Title</label>
                <input value={pushMsg.title} onChange={e => setPushMsg(m => ({ ...m, title: e.target.value }))}
                  placeholder="e.g. Urgent: injured dog in Arbeen"
                  style={{ width:"100%", background:"#1a1209", border:"1px solid #4a3520", borderRadius:10, padding:"12px 14px", color:"#f0e6d3", fontSize:15, outline:"none" }} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:"#806040", textTransform:"uppercase", letterSpacing:0.5, display:"block", marginBottom:6 }}>Message</label>
                <textarea value={pushMsg.body} onChange={e => setPushMsg(m => ({ ...m, body: e.target.value }))}
                  rows={4} placeholder="Details for rescuers…"
                  style={{ width:"100%", background:"#1a1209", border:"1px solid #4a3520", borderRadius:10, padding:"12px 14px", color:"#f0e6d3", fontSize:14, outline:"none", resize:"vertical" }} />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:11, color:"#806040", textTransform:"uppercase", letterSpacing:0.5, display:"block", marginBottom:6 }}>Priority</label>
                <div style={{ display:"flex", gap:8 }}>
                  {(["low","medium","high","critical"] as const).map(u => (
                    <button key={u} onClick={() => setPushMsg(m => ({ ...m, urgency: u }))}
                      style={{ flex:1, padding:"8px", borderRadius:8, border:`1px solid ${pushMsg.urgency === u ? "#c8860a" : "#4a3520"}`,
                        background: pushMsg.urgency === u ? "#3a2a10" : "transparent", color: pushMsg.urgency === u ? "#c8860a" : "#806040", fontSize:12, cursor:"pointer", fontWeight:600, textTransform:"capitalize" }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={sendPush} disabled={sending || !pushMsg.title || !pushMsg.body}
                style={{ width:"100%", padding:14, background: sending ? "#5a4020" : "#c8860a", border:"none", borderRadius:12, color:"white", fontSize:16, fontWeight:700, cursor:"pointer", opacity: (!pushMsg.title || !pushMsg.body) ? 0.5 : 1 }}>
                {sending ? "Sending…" : "📣 Send to all rescuers"}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
