import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://negcqsbonsdhvymfujff.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2Nxc2JvbnNkaHZ5bWZ1amZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTkxNDcsImV4cCI6MjA5MDM3NTE0N30.uD6byRpnau2ddx65tBhrFz_0PeUHrgFerHEBW6T87lM";
const N8N_SEND_WHATSAPP = "https://morad1234567.app.n8n.cloud/webhook/e66b1c06-d828-4e22-8473-1ad62aff807b";
const TZ = "Africa/Casablanca";

const SB = {
  headers: (token) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, "Content-Type": "application/json" }),
  async get(table, query, token) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: this.headers(token) }); return r.json(); },
  async post(table, data, token) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...this.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) }); return r.json(); },
  async patch(table, query, data, token) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { method: "PATCH", headers: { ...this.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) }); return r.json(); },
  async del(table, id, token) { await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: this.headers(token) }); },
  async auth(email, password) { const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); if (!r.ok) throw new Error("Email ou mot de passe incorrect"); return r.json(); },
};

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const fmtDate = (ts, opts) => ts ? new Date(ts).toLocaleDateString("fr-FR", { timeZone: TZ, ...opts }) : "";
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "";
const fmtFull = (ts) => ts ? new Date(ts).toLocaleString("fr-FR", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0C0C0C; --surface: #161616; --surface2: #1E1E1E; --surface3: #262626;
    --bd: #2A2A2A; --bd2: #333; --t1: #F0EFEA; --t2: #A8A7A2; --t3: #6B6A65;
    --accent: #1D9E75; --accent2: #5DCAA5; --accent-bg: rgba(29,158,117,0.1);
    --red: #E5484D; --red-bg: rgba(229,72,77,0.1);
    --amber: #F5A623; --amber-bg: rgba(245,166,35,0.1);
    --blue: #3B82F6; --blue-bg: rgba(59,130,246,0.1);
  }
  html, body, #root { height: 100%; }
  body { font-family: 'DM Sans', system-ui, sans-serif; background: var(--bg); color: var(--t1); -webkit-text-size-adjust: 100%; }
  input, select, textarea, button { font-family: inherit; }
  input::placeholder, textarea::placeholder { color: var(--t3); }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn .2s ease-out; }
  @media (max-width: 640px) {
    .desktop-sidebar { display: none !important; }
    .mobile-nav { display: flex !important; }
    .main-content { padding: 16px 12px 80px !important; max-height: none !important; }
    .grid-2col { grid-template-columns: 1fr !important; }
  }
  @media (min-width: 641px) {
    .desktop-sidebar { display: flex !important; }
    .mobile-nav { display: none !important; }
  }
`;

const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--surface2)", color: "var(--t1)", fontSize: 15, outline: "none" };
const btnPrimary = { padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--bd)", background: "transparent", color: "var(--t2)", fontSize: 13, fontWeight: 500, cursor: "pointer" };

function KPICard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: color || "var(--accent-bg)", flexShrink: 0 }}>{icon}</div>
        <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); setErr(""); try { onLogin(await SB.auth(email, password)); } catch (e) { setErr(e.message); } setLoading(false); };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 20, padding: 28 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent2)" }}>NoraSaaS</div>
          <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>Connectez-vous</div>
        </div>
        {err && <div style={{ background: "var(--red-bg)", color: "var(--red)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{err}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 5 }}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" style={inputStyle} /></div>
          <div><label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 5 }}>Mot de passe</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} onKeyDown={e => e.key === "Enter" && handle()} /></div>
          <button onClick={handle} disabled={loading} style={{ ...btnPrimary, width: "100%", padding: 14, marginTop: 4, opacity: loading ? 0.6 : 1 }}>{loading ? "Connexion..." : "Se connecter"}</button>
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ stats }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Tableau de bord</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KPICard icon="📅" label="RDV ce mois" value={stats.rdvMonth} sub="confirmés" color="var(--accent-bg)" />
        <KPICard icon="💬" label="Conversations" value={stats.conversations} sub="total" color="var(--blue-bg)" />
        <KPICard icon="💰" label="CA (MAD)" value={stats.revenue.toLocaleString()} sub="ce mois" color="var(--amber-bg)" />
        <KPICard icon="⭐" label="Fidèles" value={stats.fidelite} sub="inscrits" color="var(--accent-bg)" />
        <KPICard icon="🔗" label="Liens envoyés" value={stats.bookingsSent} color="var(--blue-bg)" />
        <KPICard icon="📊" label="Conversion" value={stats.conversionRate + "%"} color="var(--accent-bg)" />
        <KPICard icon="🔄" label="Relances" value={stats.relances} color="var(--amber-bg)" />
        <KPICard icon="😊" label="Positif" value={stats.positivePct + "%"} color="var(--accent-bg)" />
      </div>
    </div>
  );
}

function OffersTab({ offers, tenantId, token, onRefresh }) {
  const [editing, setEditing] = useState(null); const [form, setForm] = useState({});
  const startNew = () => { setForm({ service: "", prix: "", duree_minutes: 30, categorie: "", promo: "", description: "", max_simultane: 1, active: true }); setEditing("new"); };
  const startEdit = o => { setForm({ ...o }); setEditing(o.id); };
  const cancel = () => { setEditing(null); setForm({}); };
  const save = async () => {
    const p = { tenant_id: tenantId, service: form.service, prix: Number(form.prix) || 0, duree_minutes: Number(form.duree_minutes) || 30, categorie: form.categorie || null, promo: form.promo || null, description: form.description || null, max_simultane: Number(form.max_simultane) || 1, active: form.active !== false };
    if (editing === "new") await SB.post("offers", p, token); else await SB.patch("offers", `id=eq.${editing}`, p, token);
    cancel(); onRefresh();
  };
  const remove = async id => { if (!confirm("Supprimer ?")) return; await SB.del("offers", id, token); onRefresh(); };
  const toggle = async o => { await SB.patch("offers", `id=eq.${o.id}`, { active: !o.active }, token); onRefresh(); };
  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Services</h2>
        <button onClick={startNew} style={{ ...btnPrimary, padding: "9px 14px" }}>+ Ajouter</button>
      </div>
      {editing && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{editing === "new" ? "Nouveau service" : "Modifier"}</div>
          <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Nom*", "service", "text", "Hydrafacial"], ["Prix*", "prix", "number", "800"], ["Durée (min)", "duree_minutes", "number", "30"], ["Catégorie", "categorie", "text", "visage"], ["Promo", "promo", "text", "-20%"], ["Max simult.", "max_simultane", "number", "1"]].map(([l, k, t, ph]) => (
              <div key={k}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>{l}</label><input type={t} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={{ ...inputStyle, padding: "10px 12px", fontSize: 14 }} /></div>
            ))}
            <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>Description</label><textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical", fontSize: 14 }} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={cancel} style={btnSecondary}>Annuler</button>
            <button onClick={save} disabled={!form.service || !form.prix} style={{ ...btnPrimary, opacity: form.service && form.prix ? 1 : 0.4 }}>OK</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {offers.map(o => (
          <div key={o.id} style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 14, opacity: o.active ? 1 : 0.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{o.service}</span>
                  {o.categorie && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent2)" }}>{o.categorie}</span>}
                  {!o.active && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--red-bg)", color: "var(--red)" }}>Off</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 3 }}>{o.duree_minutes}min {o.promo ? `— ${o.promo}` : ""}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent2)", whiteSpace: "nowrap" }}>{o.prix} MAD</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={() => toggle(o)} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>{o.active ? "Désactiver" : "Activer"}</button>
              <button onClick={() => startEdit(o)} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>Modifier</button>
              <button onClick={() => remove(o.id)} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12, color: "var(--red)", borderColor: "var(--red)" }}>Suppr.</button>
            </div>
          </div>
        ))}
        {offers.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>Aucun service.</div>}
      </div>
    </div>
  );
}

function AvailabilityTab({ availability, tenantId, token, onRefresh }) {
  const [editing, setEditing] = useState(null); const [form, setForm] = useState({});
  const saveDay = async dow => {
    const ex = availability.find(a => a.day_of_week === dow);
    const d = { tenant_id: tenantId, day_of_week: dow, start_time: form.start_time || "09:00", end_time: form.end_time || "19:00", is_closed: form.is_closed || false };
    if (ex) await SB.patch("availability", `id=eq.${ex.id}`, d, token); else await SB.post("availability", d, token);
    setEditing(null); onRefresh();
  };
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Horaires</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DAYS.map((name, dow) => {
          const avail = availability.find(a => a.day_of_week === dow); const isEd = editing === dow;
          return (
            <div key={dow} style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 14, opacity: avail?.is_closed ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                {!isEd && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {avail ? (avail.is_closed ? <span style={{ fontSize: 13, color: "var(--red)" }}>Fermé</span> : <span style={{ fontSize: 13, color: "var(--t2)" }}>{avail.start_time?.slice(0, 5)} → {avail.end_time?.slice(0, 5)}</span>) : <span style={{ fontSize: 13, color: "var(--t3)" }}>—</span>}
                    <button onClick={() => { setForm({ start_time: avail?.start_time?.slice(0, 5) || "09:00", end_time: avail?.end_time?.slice(0, 5) || "19:00", is_closed: avail?.is_closed || false }); setEditing(dow); }} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>Modifier</button>
                  </div>
                )}
              </div>
              {isEd && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={{ ...inputStyle, width: 120, padding: "8px 10px", fontSize: 14 }} />
                  <span style={{ color: "var(--t3)" }}>→</span>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={{ ...inputStyle, width: 120, padding: "8px 10px", fontSize: 14 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--t3)" }}><input type="checkbox" checked={form.is_closed || false} onChange={e => setForm(f => ({ ...f, is_closed: e.target.checked }))} /> Fermé</label>
                  <button onClick={() => saveDay(dow)} style={{ ...btnPrimary, padding: "7px 14px", fontSize: 12 }}>OK</button>
                  <button onClick={() => setEditing(null)} style={{ ...btnSecondary, padding: "7px 10px", fontSize: 12 }}>Annuler</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentsTab({ appointments, token, onRefresh }) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const filtered = filter === "all" ? appointments : appointments.filter(a => a.status === filter);
  const sc = { confirmé: "var(--accent)", confirmed: "var(--accent)", cancelled: "var(--red)", completed: "var(--blue)", no_show: "var(--amber)" };
  const sl = { confirmé: "Confirmé", confirmed: "Confirmé", cancelled: "Annulé", completed: "Terminé", no_show: "Absent" };
  const upd = async (id, s) => { await SB.patch("appointments", `id=eq.${id}`, { status: s }, token); onRefresh(); };
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; });
  const apptsByDay = weekDays.map(day => ({
    day,
    appts: appointments.filter(a => {
      if (!a.scheduled_at) return false;
      const d = new Date(new Date(a.scheduled_at).toLocaleString("en-US", { timeZone: TZ }));
      return d.toDateString() === day.toDateString();
    }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  }));

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Rendez-vous</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {["list", "agenda"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12, background: view === v ? "var(--accent-bg)" : "transparent", color: view === v ? "var(--accent2)" : "var(--t2)", borderColor: view === v ? "var(--accent)" : "var(--bd)" }}>
              {v === "list" ? "📋 Liste" : "📅 Agenda"}
            </button>
          ))}
        </div>
      </div>
      {view === "list" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
            {[["all", "Tous"], ["confirmé", "Confirmés"], ["completed", "Terminés"], ["cancelled", "Annulés"]].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--bd)", cursor: "pointer", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", background: filter === v ? "var(--accent)" : "transparent", color: filter === v ? "#fff" : "var(--t2)", borderColor: filter === v ? "var(--accent)" : "var(--bd)" }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(a => (
              <div key={a.id} style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{a.customer_name || "Client"}</div><div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{a.customer_phone}</div></div>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, fontWeight: 600, whiteSpace: "nowrap", background: `${sc[a.status] || "var(--t3)"}20`, color: sc[a.status] || "var(--t3)" }}>{sl[a.status] || a.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 6 }}>{a.service_name}</div>
                {a.scheduled_at && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 3 }}>{fmtDate(a.scheduled_at, { weekday: "short", day: "numeric", month: "short" })} à {fmtTime(a.scheduled_at)}</div>}
                {(a.status === "confirmé" || a.status === "confirmed") && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <button onClick={() => upd(a.id, "completed")} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>Terminé</button>
                    <button onClick={() => upd(a.id, "cancelled")} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12, color: "var(--red)" }}>Annuler</button>
                    <button onClick={() => upd(a.id, "no_show")} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12, color: "var(--amber)" }}>Absent</button>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>Aucun RDV.</div>}
          </div>
        </>
      )}
      {view === "agenda" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {apptsByDay.map(({ day, appts }) => {
            const isToday = day.toDateString() === today.toDateString();
            return (
              <div key={day.toISOString()}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? "var(--accent2)" : "var(--t3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  {isToday && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />}
                  {day.toLocaleDateString("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" })}
                </div>
                {appts.length === 0
                  ? <div style={{ background: "var(--surface)", border: "1px dashed var(--bd)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "var(--t3)" }}>Aucun RDV</div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {appts.map(a => (
                      <div key={a.id} style={{ background: "var(--surface)", borderLeft: `3px solid ${sc[a.status] || "var(--bd)"}`, borderRadius: "0 10px 10px 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtTime(a.scheduled_at)} — {a.customer_name || "Client"}</div>
                          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{a.service_name}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${sc[a.status]}20`, color: sc[a.status] }}>{sl[a.status] || a.status}</span>
                      </div>
                    ))}
                  </div>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConversationLive({ phone, name, tenantId, tenant, token, onBack, onTenantRefresh }) {
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [replyMode, setReplyMode] = useState("saas");
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const botPaused = (tenant?.paused_phones || []).includes(phone);

  const loadMessages = useCallback(async () => {
    const data = await SB.get("conversations",
      `tenant_id=eq.${tenantId}&customer_phone=eq.${encodeURIComponent(phone)}&order=timestamp.asc&limit=100`,
      token
    );
    if (Array.isArray(data)) setMessages(data);
  }, [phone, tenantId, token]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const pauseBot = async () => {
    setPausing(true);
    const paused = [...(tenant?.paused_phones || [])];
    if (!paused.includes(phone)) paused.push(phone);
    await SB.patch("tenants", `id=eq.${tenantId}`, { paused_phones: paused }, token);
    await onTenantRefresh();
    setPausing(false);
  };

  const resumeBot = async () => {
    setPausing(true);
    const paused = (tenant?.paused_phones || []).filter(p => p !== phone);
    await SB.patch("tenants", `id=eq.${tenantId}`, { paused_phones: paused }, token);
    await onTenantRefresh();
    setPausing(false);
  };

  const sendManual = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const pending = await SB.get("conversations",
        `tenant_id=eq.${tenantId}&customer_phone=eq.${encodeURIComponent(phone)}&bot_response=is.null&order=timestamp.desc&limit=1`,
        token
      );
      if (pending && pending.length > 0) {
        await SB.patch("conversations", `id=eq.${pending[0].id}`, { bot_response: replyText, reply_channel: "saas" }, token);
      } else {
        await SB.post("conversations", { tenant_id: tenantId, customer_phone: phone, customer_name: name, client_message: null, bot_response: replyText, reply_channel: "saas", booking_link_sent: "non" }, token);
      }
      await fetch(N8N_SEND_WHATSAPP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, from: tenant?.phone_whatsapp, message: replyText })
      });
      setReplyText("");
      await loadMessages();
    } catch (e) { console.error(e); alert("Erreur lors de l'envoi"); }
    setSending(false);
  };

  const markWhatsApp = async () => {
    const pending = await SB.get("conversations",
      `tenant_id=eq.${tenantId}&customer_phone=eq.${encodeURIComponent(phone)}&bot_response=is.null&order=timestamp.desc&limit=1`,
      token
    );
    if (pending && pending.length > 0) {
      await SB.patch("conversations", `id=eq.${pending[0].id}`, { reply_channel: "whatsapp" }, token);
    }
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--bd)", marginBottom: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>← Retour</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{name || phone}</div>
          <div style={{ fontSize: 11, color: "var(--t3)" }}>{phone}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: 600, background: botPaused ? "var(--amber-bg)" : "var(--accent-bg)", color: botPaused ? "var(--amber)" : "var(--accent2)" }}>
            {botPaused ? "⏸ Pause" : "🤖 Bot actif"}
          </span>
          {!botPaused
            ? <button onClick={pauseBot} disabled={pausing} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 11, color: "var(--amber)", borderColor: "var(--amber)", opacity: pausing ? 0.5 : 1 }}>{pausing ? "..." : "Pause bot"}</button>
            : <button onClick={resumeBot} disabled={pausing} style={{ ...btnPrimary, padding: "6px 10px", fontSize: 11, opacity: pausing ? 0.5 : 1 }}>{pausing ? "..." : "Reprendre bot"}</button>
          }
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map(m => (
          <div key={m.id}>
            {m.client_message && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 4 }}>
                <div style={{ maxWidth: "78%" }}>
                  <div style={{ background: "var(--surface2)", border: "1px solid var(--bd)", borderRadius: "12px 12px 12px 4px", padding: "8px 12px" }}>
                    <div style={{ fontSize: 13 }}>{m.client_message}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2, paddingLeft: 4 }}>👤 Client · {fmtFull(m.timestamp)}</div>
                </div>
              </div>
            )}
            {m.bot_response && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "78%" }}>
                  <div style={{ background: m.bot_active === false ? "var(--amber-bg)" : "var(--accent-bg)", border: `1px solid ${m.bot_active === false ? "var(--amber)" : "var(--accent)"}40`, borderRadius: "12px 12px 4px 12px", padding: "8px 12px" }}>
                    <div style={{ fontSize: 13 }}>{m.bot_response}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2, paddingRight: 4, textAlign: "right" }}>
                    {m.bot_active === false ? `🧑‍💼 Salon${m.reply_channel === "whatsapp" ? " (WhatsApp)" : ""}` : "🤖 Bot"} · {fmtFull(m.timestamp)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>Aucun message.</div>}
        <div ref={bottomRef} />
      </div>

      {botPaused && (
        <div style={{ borderTop: "1px solid var(--bd)", paddingTop: 12, marginTop: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={() => setReplyMode("saas")} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12, background: replyMode === "saas" ? "var(--accent-bg)" : "transparent", color: replyMode === "saas" ? "var(--accent2)" : "var(--t2)", borderColor: replyMode === "saas" ? "var(--accent)" : "var(--bd)" }}>
              💻 Répondre ici
            </button>
            <button onClick={() => { setReplyMode("whatsapp"); markWhatsApp(); }} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12, background: replyMode === "whatsapp" ? "var(--accent-bg)" : "transparent", color: replyMode === "whatsapp" ? "var(--accent2)" : "var(--t2)", borderColor: replyMode === "whatsapp" ? "var(--accent)" : "var(--bd)" }}>
              📱 Via WhatsApp
            </button>
          </div>
          {replyMode === "saas" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Votre réponse..." rows={2} style={{ ...inputStyle, resize: "none", fontSize: 14, flex: 1 }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendManual(); } }} />
              <button onClick={sendManual} disabled={sending || !replyText.trim()} style={{ ...btnPrimary, padding: "10px 14px", opacity: sending || !replyText.trim() ? 0.5 : 1, alignSelf: "flex-end" }}>
                {sending ? "..." : "Envoyer"}
              </button>
            </div>
          ) : (
            <div style={{ background: "var(--surface2)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, color: "var(--amber)", marginBottom: 4 }}>⚠️ Conversation non sauvegardée</div>
              <div style={{ fontSize: 12, color: "var(--t3)" }}>Les messages envoyés depuis WhatsApp ne seront pas enregistrés dans l'historique. Pensez à cliquer "Reprendre bot" quand vous avez terminé.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LiveTab({ conversations, tenantId, tenant, token, onTenantRefresh }) {
  const [selected, setSelected] = useState(null);
  const paused = tenant?.paused_phones || [];
  const now = new Date();

  const byPhone = {};
  [...conversations].forEach(c => {
    if (!byPhone[c.customer_phone] || new Date(c.timestamp) > new Date(byPhone[c.customer_phone].timestamp)) {
      byPhone[c.customer_phone] = c;
    }
  });

  const live = Object.values(byPhone).filter(c => (now - new Date(c.timestamp)) / 60000 <= 30).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const pausedActive = live.filter(c => paused.includes(c.customer_phone));

  if (selected) {
    return (
      <ConversationLive
        phone={selected.phone}
        name={selected.name}
        tenantId={tenantId}
        tenant={tenant}
        token={token}
        onBack={() => setSelected(null)}
        onTenantRefresh={onTenantRefresh}
      />
    );
  }

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Conversations live</h2>
      {pausedActive.length > 0 && (
        <div style={{ background: "var(--amber-bg)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚠️</span>
          <div style={{ fontSize: 13, color: "var(--amber)", flex: 1 }}>
            {pausedActive.length} conversation{pausedActive.length > 1 ? "s" : ""} en pause — {pausedActive.map(c => c.customer_name || c.customer_phone).join(", ")}
          </div>
        </div>
      )}
      {live.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--t3)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 14 }}>Aucune conversation en cours</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Les conversations des 30 dernières minutes apparaîtront ici</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {live.map(c => {
            const isPaused = paused.includes(c.customer_phone);
            const diff = Math.round((now - new Date(c.timestamp)) / 60000);
            return (
              <div key={c.customer_phone} onClick={() => setSelected({ phone: c.customer_phone, name: c.customer_name })} style={{ background: "var(--surface)", border: `1px solid ${isPaused ? "var(--amber)" : "var(--bd)"}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: isPaused ? "var(--amber)" : "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{c.customer_name || c.customer_phone}</span>
                    {isPaused && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--amber-bg)", color: "var(--amber)" }}>⏸ Pause</span>}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--t3)" }}>il y a {diff} min</span>
                </div>
                {c.client_message && <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 2 }}>👤 {c.client_message.slice(0, 80)}</div>}
                {c.bot_response && <div style={{ fontSize: 12, color: "var(--t3)" }}>{c.bot_active === false ? "🧑‍💼" : "🤖"} {c.bot_response.slice(0, 80)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoriqueTab({ conversations }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const byPhone = {};
  [...conversations].forEach(c => {
    if (!byPhone[c.customer_phone] || new Date(c.timestamp) > new Date(byPhone[c.customer_phone].timestamp)) {
      byPhone[c.customer_phone] = c;
    }
  });

  let unique = Object.values(byPhone).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (search) unique = unique.filter(c => (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (c.customer_phone || "").includes(search));
  if (filter === "lien") unique = unique.filter(c => c.booking_link_sent === "oui");
  if (filter === "positif") unique = unique.filter(c => c.sentiment === "positif");

  const se = { positif: "😊", "négatif": "😤", neutre: "😐" };

  if (selected) {
    const clientMsgs = conversations.filter(c => c.customer_phone === selected.phone).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return (
      <div className="fade-in">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setSelected(null)} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>← Retour</button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name || selected.phone}</div>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{clientMsgs.length} échanges</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {clientMsgs.map(m => (
            <div key={m.id} style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 6 }}>{fmtFull(m.timestamp)}</div>
              {m.client_message && <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 4 }}>👤 {m.client_message}</div>}
              {m.bot_response && <div style={{ fontSize: 13 }}>{m.bot_active === false ? "🧑‍💼" : "🤖"} {m.bot_response}</div>}
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {m.booking_link_sent === "oui" && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent2)" }}>Lien</span>}
                {m.interest && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--blue-bg)", color: "var(--blue)" }}>{m.interest}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Historique</h2>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
        {[["all", "Tous"], ["lien", "Lien envoyé"], ["positif", "Positif"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid var(--bd)", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", background: filter === v ? "var(--accent)" : "transparent", color: filter === v ? "#fff" : "var(--t2)", borderColor: filter === v ? "var(--accent)" : "var(--bd)" }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {unique.slice(0, 200).map(c => (
          <div key={c.customer_phone} onClick={() => setSelected({ phone: c.customer_phone, name: c.customer_name })} style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 12, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{se[c.sentiment] || "💬"} {c.customer_name || c.customer_phone}</div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>{fmtDate(c.timestamp, { day: "numeric", month: "short" })}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 3 }}>{(c.client_message || "").slice(0, 80)}</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{(c.bot_response || "").slice(0, 60)}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
              {c.booking_link_sent === "oui" && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent2)" }}>Lien</span>}
              {c.interest && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--blue-bg)", color: "var(--blue)" }}>{c.interest}</span>}
            </div>
          </div>
        ))}
        {unique.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>Aucune conversation.</div>}
      </div>
    </div>
  );
}

function SettingsTab({ tenant, token, onRefresh, onLogout }) {
  const [form, setForm] = useState({ ...tenant }); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const save = async () => { setSaving(true); const { id, created_at, user_id, paused_phones, ...rest } = form; await SB.patch("tenants", `id=eq.${tenant.id}`, rest, token); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); onRefresh(); };
  const fields = [["Nom centre", "nom_centre"], ["Adresse", "adresse"], ["Tél gérant", "phone_gerant"], ["Email", "email_gerant"], ["WhatsApp", "phone_whatsapp"], ["Nom bot", "nom_bot"], ["Google Maps", "lien_google_maps"], ["Google Review", "lien_google_review"], ["Parking", "parking"], ["Paiement", "paiement"]];
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Paramètres</h2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14, padding: 18 }}>
        <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {fields.map(([l, k]) => (
            <div key={k}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>{l}</label><input value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ ...inputStyle, padding: "10px 12px", fontSize: 14 }} /></div>
          ))}
          <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>Message fermé</label><input value={form.message_ferme || ""} onChange={e => setForm(f => ({ ...f, message_ferme: e.target.value }))} style={{ ...inputStyle, padding: "10px 12px", fontSize: 14 }} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t2)" }}><input type="checkbox" checked={form.fidelite || false} onChange={e => setForm(f => ({ ...f, fidelite: e.target.checked }))} /> Fidélité</label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t2)" }}><input type="checkbox" checked={form.liste_attente || false} onChange={e => setForm(f => ({ ...f, liste_attente: e.target.checked }))} /> Liste d'attente</label>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? "..." : "Enregistrer"}</button>
          {saved && <span style={{ fontSize: 13, color: "var(--accent)" }}>✓ Enregistré</span>}
        </div>
        <div style={{ marginTop: 18, padding: 12, background: "var(--surface2)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", marginBottom: 4 }}>Lien booking</div>
          <div style={{ fontSize: 11, color: "var(--accent2)", wordBreak: "break-all", fontFamily: "monospace" }}>{tenant.booking_url || `https://nora-booking.vercel.app?tenant=${tenant.id}`}</div>
        </div>
        <button onClick={onLogout} style={{ ...btnSecondary, marginTop: 16, width: "100%", color: "var(--red)", borderColor: "var(--red)" }}>Déconnexion</button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [auth, setAuth] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [liveConvs, setLiveConvs] = useState([]);
  const [fidelite, setFidelite] = useState([]);
  const [stats, setStats] = useState({ rdvMonth: 0, conversations: 0, revenue: 0, fidelite: 0, bookingsSent: 0, relances: 0, conversionRate: 0, positivePct: 0 });

  const token = auth?.access_token;
  const tenantId = tenant?.id;
  const logout = () => { setAuth(null); setTenant(null); };

  useEffect(() => {
    if (!auth) return;
    (async () => {
      setLoading(true);
      try {
        const t = await SB.get("tenants", `user_id=eq.${auth.user?.id}&select=*`, token);
        if (t.length) setTenant(t[0]); else { alert("Aucun centre."); setAuth(null); }
      } catch { setAuth(null); }
      setLoading(false);
    })();
  }, [auth]);

  const loadData = useCallback(async () => {
    if (!tenantId || !token) return;
    try {
      const [off, avail, appts, convs, fid, tenantFresh] = await Promise.all([
        SB.get("offers", `tenant_id=eq.${tenantId}&select=*&order=categorie,service`, token),
        SB.get("availability", `tenant_id=eq.${tenantId}&select=*&order=day_of_week`, token),
        SB.get("appointments", `tenant_id=eq.${tenantId}&select=*&order=scheduled_at.desc&limit=200`, token),
        SB.get("conversations", `tenant_id=eq.${tenantId}&select=*&order=timestamp.desc&limit=1000`, token),
        SB.get("fidelite", `tenant_id=eq.${tenantId}&select=*`, token),
        SB.get("tenants", `id=eq.${tenantId}&select=*`, token),
      ]);
      setOffers(off); setAvailability(avail); setAppointments(appts); setConversations(convs); setFidelite(fid);
      if (tenantFresh?.length) setTenant(tenantFresh[0]);
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
      const ms = new Date(now.getFullYear(), now.getMonth(), 1);
      const ma = appts.filter(a => (a.status === "confirmé" || a.status === "confirmed") && new Date(a.scheduled_at) >= ms);
      const bs = convs.filter(c => c.booking_link_sent === "oui").length;
      const rev = ma.reduce((s, a) => { const sv = off.find(o => o.id === a.offer_id); return s + (sv?.prix || 0); }, 0);
      setStats({ rdvMonth: ma.length, conversations: convs.length, revenue: rev, fidelite: fid.length, bookingsSent: bs, relances: convs.filter(c => c.relanced === "oui").length, conversionRate: bs > 0 ? Math.round((ma.length / bs) * 100) : 0, positivePct: convs.length > 0 ? Math.round((convs.filter(c => c.sentiment === "positif").length / convs.length) * 100) : 0 });
    } catch (e) { console.error(e); }
  }, [tenantId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshTenant = useCallback(async () => {
    if (!tenantId || !token) return;
    const t = await SB.get("tenants", `id=eq.${tenantId}&select=*`, token);
    if (t?.length) setTenant(t[0]);
  }, [tenantId, token]);

  // Polling tenant toutes les 10s
  useEffect(() => {
    if (!tenantId || !token) return;
    const iv = setInterval(refreshTenant, 10000);
    return () => clearInterval(iv);
  }, [tenantId, token, refreshTenant]);

  // Polling live conversations toutes les 5s
  useEffect(() => {
    if (!tenantId || !token) return;
    const iv = setInterval(async () => {
      const convs = await SB.get("conversations",
        `tenant_id=eq.${tenantId}&select=*&order=timestamp.desc&limit=100`,
        token
      );
      if (Array.isArray(convs)) setLiveConvs(convs);
    }, 5000);
    return () => clearInterval(iv);
  }, [tenantId, token]);

  if (!auth) return (<><style>{css}</style><LoginScreen onLogin={setAuth} /></>);
  if (loading || !tenant) return (<><style>{css}</style><div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div style={{ width: 40, height: 40, border: "3px solid var(--bd)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .8s linear infinite" }} /></div></>);

  const now = new Date();
  const byPhoneLive = {};
  [...liveConvs].forEach(c => { if (!byPhoneLive[c.customer_phone] || new Date(c.timestamp) > new Date(byPhoneLive[c.customer_phone].timestamp)) byPhoneLive[c.customer_phone] = c; });
  const liveCount = Object.values(byPhoneLive).filter(c => (now - new Date(c.timestamp)) / 60000 <= 30).length;
  const pauseCount = (tenant?.paused_phones || []).length;

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Board" },
    { id: "appointments", icon: "📅", label: "RDV" },
    { id: "offers", icon: "💎", label: "Services" },
    { id: "availability", icon: "🕐", label: "Horaires" },
    { id: "live", icon: "💬", label: "Live", badge: liveCount > 0 ? liveCount : null, badgePause: pauseCount > 0 },
    { id: "historique", icon: "📜", label: "Historique" },
    { id: "settings", icon: "⚙️", label: "Config" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div className="desktop-sidebar" style={{ width: 190, background: "var(--surface)", borderRight: "1px solid var(--bd)", padding: "20px 10px", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent2)", paddingLeft: 8, marginBottom: 2 }}>NoraSaaS</div>
          <div style={{ fontSize: 11, color: "var(--t3)", paddingLeft: 8, marginBottom: 24, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant.nom_centre}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: tab === t.id ? "var(--accent-bg)" : "transparent", color: tab === t.id ? "var(--accent2)" : "var(--t2)", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                {t.label}
                {t.badge && <span style={{ marginLeft: "auto", fontSize: 10, background: t.badgePause ? "var(--amber)" : "var(--accent)", color: "#fff", borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>{t.badge}</span>}
              </button>
            ))}
          </div>
          <button onClick={logout} style={{ ...btnSecondary, fontSize: 12, marginTop: "auto" }}>Déconnexion</button>
        </div>

        <div className="main-content" style={{ flex: 1, padding: 24, overflowY: "auto", maxHeight: "100vh" }}>
          {tab === "dashboard" && <DashboardTab stats={stats} />}
          {tab === "offers" && <OffersTab offers={offers} tenantId={tenantId} token={token} onRefresh={loadData} />}
          {tab === "availability" && <AvailabilityTab availability={availability} tenantId={tenantId} token={token} onRefresh={loadData} />}
          {tab === "appointments" && <AppointmentsTab appointments={appointments} token={token} onRefresh={loadData} />}
          {tab === "live" && <LiveTab conversations={liveConvs} tenantId={tenantId} tenant={tenant} token={token} onTenantRefresh={refreshTenant} />}
          {tab === "historique" && <HistoriqueTab conversations={conversations} />}
          {tab === "settings" && <SettingsTab tenant={tenant} token={token} onRefresh={loadData} onLogout={logout} />}
        </div>

        <div className="mobile-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--surface)", borderTop: "1px solid var(--bd)", justifyContent: "space-around", alignItems: "center", padding: "4px 0 env(safe-area-inset-bottom, 4px)", zIndex: 100 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, border: "none", cursor: "pointer", padding: "6px 4px", borderRadius: 8, background: "transparent", color: tab === t.id ? "var(--accent2)" : "var(--t3)", fontSize: 9, fontWeight: tab === t.id ? 600 : 400, position: "relative" }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              {t.label}
              {t.badge && <span style={{ position: "absolute", top: 2, right: 2, fontSize: 9, background: "var(--accent)", color: "#fff", borderRadius: 8, padding: "0 4px" }}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
