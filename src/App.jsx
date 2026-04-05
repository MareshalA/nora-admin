import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// ██  CONFIGURATION SUPABASE — À REMPLIR  ██
// ═══════════════════════════════════════════════════════
const SUPABASE_URL = "https://negcqsbonsdhvymfujff.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2Nxc2JvbnNkaHZ5bWZ1amZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTkxNDcsImV4cCI6MjA5MDM3NTE0N30.uD6byRpnau2ddx65tBhrFz_0PeUHrgFerHEBW6T87lM";

const SB = {
  headers: (token) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, "Content-Type": "application/json" }),
  async get(table, query, token) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: this.headers(token) }); return r.json(); },
  async post(table, data, token) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...this.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) }); return r.json(); },
  async patch(table, id, data, token) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...this.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) }); return r.json(); },
  async del(table, id, token) { await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: this.headers(token) }); },
  async auth(email, password) { const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); if (!r.ok) throw new Error("Email ou mot de passe incorrect"); return r.json(); },
};

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

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
  input, select, textarea { font-family: inherit; font-size: 16px; }
  input::placeholder, textarea::placeholder { color: var(--t3); }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn .25s ease-out; }
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

const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--surface2)", color: "var(--t1)", fontSize: 16, outline: "none" };
const btnPrimary = { padding: "12px 20px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { padding: "10px 16px", borderRadius: 10, border: "1px solid var(--bd)", background: "transparent", color: "var(--t2)", fontSize: 13, fontWeight: 500, cursor: "pointer" };

function KPICard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: color || "var(--accent-bg)", flexShrink: 0 }}>{icon}</div>
        <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--t1)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
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
          <div><label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 5 }}>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" style={inputStyle} /></div>
          <div><label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 5 }}>Mot de passe</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handle()} /></div>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <KPICard icon="📅" label="RDV ce mois" value={stats.rdvMonth} sub="confirmés" color="var(--accent-bg)" />
        <KPICard icon="💬" label="Conversations" value={stats.conversations} sub="total" color="var(--blue-bg)" />
        <KPICard icon="💰" label="CA (MAD)" value={stats.revenue.toLocaleString()} sub="ce mois" color="var(--amber-bg)" />
        <KPICard icon="⭐" label="Fidèles" value={stats.fidelite} sub="inscrits" color="var(--accent-bg)" />
        <KPICard icon="🤖" label="Booking" value={stats.bookingsSent} color="var(--blue-bg)" />
        <KPICard icon="📊" label="Conversion" value={stats.conversionRate + "%"} color="var(--accent-bg)" />
        <KPICard icon="🔄" label="Relances" value={stats.relances} color="var(--amber-bg)" />
        <KPICard icon="😊" label="Positif" value={stats.positivePct + "%"} color="var(--accent-bg)" />
      </div>
    </div>
  );
}

function OffersTab({ offers, tenantId, token, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const startNew = () => { setForm({ service: "", prix: "", duree_minutes: 30, categorie: "", promo: "", description: "", max_simultane: 1, active: true }); setEditing("new"); };
  const startEdit = (o) => { setForm({ ...o }); setEditing(o.id); };
  const cancel = () => { setEditing(null); setForm({}); };
  const save = async () => {
    const p = { tenant_id: tenantId, service: form.service, prix: Number(form.prix) || 0, duree_minutes: Number(form.duree_minutes) || 30, categorie: form.categorie || null, promo: form.promo || null, description: form.description || null, max_simultane: Number(form.max_simultane) || 1, active: form.active !== false };
    if (editing === "new") await SB.post("offers", p, token); else await SB.patch("offers", editing, p, token);
    cancel(); onRefresh();
  };
  const remove = async (id) => { if (!confirm("Supprimer ?")) return; await SB.del("offers", id, token); onRefresh(); };
  const toggle = async (o) => { await SB.patch("offers", o.id, { active: !o.active }, token); onRefresh(); };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Services</h2>
        <button onClick={startNew} style={{ ...btnPrimary, padding: "10px 16px", fontSize: 13 }}>+ Ajouter</button>
      </div>
      {editing && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{editing === "new" ? "Nouveau service" : "Modifier"}</div>
          <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Nom*", "service", "text", "Hydrafacial"], ["Prix*", "prix", "number", "800"], ["Durée (min)", "duree_minutes", "number", "30"], ["Catégorie", "categorie", "text", "visage"], ["Promo", "promo", "text", "-20%"], ["Max simult.", "max_simultane", "number", "1"]].map(([l, k, t, ph]) => (
              <div key={k}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>{l}</label><input type={t} value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={{ ...inputStyle, padding: "10px 12px", fontSize: 14 }} /></div>
            ))}
            <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>Description</label><textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical", fontSize: 14 }} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button onClick={cancel} style={btnSecondary}>Annuler</button>
            <button onClick={save} disabled={!form.service || !form.prix} style={{ ...btnPrimary, opacity: form.service && form.prix ? 1 : 0.4, padding: "10px 18px" }}>OK</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {offers.map((o) => (
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
              <button onClick={() => toggle(o)} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12 }}>{o.active ? "Désactiver" : "Activer"}</button>
              <button onClick={() => startEdit(o)} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12 }}>Modifier</button>
              <button onClick={() => remove(o.id)} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12, color: "var(--red)", borderColor: "var(--red)" }}>Suppr.</button>
            </div>
          </div>
        ))}
        {offers.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>Aucun service.</div>}
      </div>
    </div>
  );
}

function AvailabilityTab({ availability, tenantId, token, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const saveDay = async (dow) => {
    const ex = availability.find((a) => a.day_of_week === dow);
    const d = { tenant_id: tenantId, day_of_week: dow, start_time: form.start_time || "09:00", end_time: form.end_time || "19:00", is_closed: form.is_closed || false };
    if (ex) await SB.patch("availability", ex.id, d, token); else await SB.post("availability", d, token);
    setEditing(null); onRefresh();
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Horaires</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DAYS.map((name, dow) => {
          const avail = availability.find((a) => a.day_of_week === dow);
          const isEd = editing === dow;
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
                  <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} style={{ ...inputStyle, width: 120, padding: "8px 10px", fontSize: 14 }} />
                  <span style={{ color: "var(--t3)" }}>→</span>
                  <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} style={{ ...inputStyle, width: 120, padding: "8px 10px", fontSize: 14 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--t3)" }}><input type="checkbox" checked={form.is_closed || false} onChange={(e) => setForm((f) => ({ ...f, is_closed: e.target.checked }))} /> Fermé</label>
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
  const filtered = filter === "all" ? appointments : appointments.filter((a) => a.status === filter);
  const sc = { confirmed: "var(--accent)", cancelled: "var(--red)", completed: "var(--blue)", no_show: "var(--amber)" };
  const sl = { confirmed: "Confirmé", cancelled: "Annulé", completed: "Terminé", no_show: "Absent" };
  const upd = async (id, s) => { await SB.patch("appointments", id, { status: s }, token); onRefresh(); };
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Rendez-vous</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
        {[["all", "Tous"], ["confirmed", "Confirmés"], ["completed", "Terminés"], ["cancelled", "Annulés"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--bd)", cursor: "pointer", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", background: filter === v ? "var(--accent)" : "transparent", color: filter === v ? "#fff" : "var(--t2)", borderColor: filter === v ? "var(--accent)" : "var(--bd)" }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((a) => {
          const dt = a.scheduled_at ? new Date(a.scheduled_at) : null;
          return (
            <div key={a.id} style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div><div style={{ fontSize: 14, fontWeight: 600 }}>{a.customer_name || "Client"}</div><div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{a.customer_phone}</div></div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, fontWeight: 600, whiteSpace: "nowrap", background: `${sc[a.status] || "var(--t3)"}20`, color: sc[a.status] || "var(--t3)" }}>{sl[a.status] || a.status}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 6 }}>{a.service_name}</div>
              {dt && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 3 }}>{dt.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à {dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>}
              {a.status === "confirmed" && (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => upd(a.id, "completed")} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12 }}>Terminé</button>
                  <button onClick={() => upd(a.id, "cancelled")} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12, color: "var(--red)" }}>Annuler</button>
                  <button onClick={() => upd(a.id, "no_show")} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12, color: "var(--amber)" }}>Absent</button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>Aucun RDV.</div>}
      </div>
    </div>
  );
}

function ConversationsTab({ conversations }) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter((c) => (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (c.customer_phone || "").includes(search));
  const se = { positif: "😊", "négatif": "😤", neutre: "😐" };
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Messages</h2>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle, marginBottom: 12 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.slice(0, 50).map((c) => (
          <div key={c.id} style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{se[c.sentiment] || "💬"} {c.customer_name || c.customer_phone}</div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>{c.timestamp ? new Date(c.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 3 }}>{(c.client_message || "").slice(0, 80)}</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{(c.bot_response || "").slice(0, 80)}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
              {c.booking_link_sent === "oui" && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent2)" }}>Lien</span>}
              {c.relanced === "oui" && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--amber-bg)", color: "var(--amber)" }}>Relancé</span>}
              {c.interest && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "var(--blue-bg)", color: "var(--blue)" }}>{c.interest}</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>Aucune conversation.</div>}
      </div>
    </div>
  );
}

function SettingsTab({ tenant, token, onRefresh, onLogout }) {
  const [form, setForm] = useState({ ...tenant });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => { setSaving(true); const { id, created_at, user_id, ...rest } = form; await SB.patch("tenants", tenant.id, rest, token); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); onRefresh(); };
  const fields = [["Nom centre", "nom_centre"], ["Adresse", "adresse"], ["Tél gérant", "phone_gerant"], ["Email", "email_gerant"], ["WhatsApp", "phone_whatsapp"], ["Nom bot", "nom_bot"], ["Google Maps", "lien_google_maps"], ["Google Review", "lien_google_review"], ["Parking", "parking"], ["Paiement", "paiement"]];

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Paramètres</h2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14, padding: 18 }}>
        <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {fields.map(([l, k]) => (
            <div key={k}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>{l}</label><input value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} style={{ ...inputStyle, padding: "10px 12px", fontSize: 14 }} /></div>
          ))}
          <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>Message fermé</label><input value={form.message_ferme || ""} onChange={(e) => setForm((f) => ({ ...f, message_ferme: e.target.value }))} style={{ ...inputStyle, padding: "10px 12px", fontSize: 14 }} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t2)" }}><input type="checkbox" checked={form.fidelite || false} onChange={(e) => setForm((f) => ({ ...f, fidelite: e.target.checked }))} /> Fidélité</label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t2)" }}><input type="checkbox" checked={form.liste_attente || false} onChange={(e) => setForm((f) => ({ ...f, liste_attente: e.target.checked }))} /> Liste d'attente</label>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? "..." : "Enregistrer"}</button>
          {saved && <span style={{ fontSize: 13, color: "var(--accent)" }}>✓</span>}
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
  const [fidelite, setFidelite] = useState([]);
  const [stats, setStats] = useState({ rdvMonth: 0, conversations: 0, revenue: 0, fidelite: 0, bookingsSent: 0, relances: 0, conversionRate: 0, positivePct: 0 });
  const token = auth?.access_token;
  const tenantId = tenant?.id;
  const logout = () => { setAuth(null); setTenant(null); };

  useEffect(() => {
    if (!auth) return;
    (async () => { setLoading(true); try { const t = await SB.get("tenants", `user_id=eq.${auth.user?.id}&select=*`, token); if (t.length) setTenant(t[0]); else { alert("Aucun centre."); setAuth(null); } } catch { setAuth(null); } setLoading(false); })();
  }, [auth]);

  const loadData = useCallback(async () => {
    if (!tenantId || !token) return;
    try {
      const [off, avail, appts, convs, fid] = await Promise.all([
        SB.get("offers", `tenant_id=eq.${tenantId}&select=*&order=categorie,service`, token),
        SB.get("availability", `tenant_id=eq.${tenantId}&select=*&order=day_of_week`, token),
        SB.get("appointments", `tenant_id=eq.${tenantId}&select=*&order=scheduled_at.desc&limit=200`, token),
        SB.get("conversations", `tenant_id=eq.${tenantId}&select=*&order=timestamp.desc&limit=200`, token),
        SB.get("fidelite", `tenant_id=eq.${tenantId}&select=*`, token),
      ]);
      setOffers(off); setAvailability(avail); setAppointments(appts); setConversations(convs); setFidelite(fid);
      const now = new Date(); const ms = new Date(now.getFullYear(), now.getMonth(), 1);
      const ma = appts.filter((a) => a.status === "confirmed" && new Date(a.scheduled_at) >= ms);
      const bs = convs.filter((c) => c.booking_link_sent === "oui").length;
      const rev = ma.reduce((s, a) => { const sv = off.find((o) => o.id === a.offer_id); return s + (sv?.prix || 0); }, 0);
      setStats({ rdvMonth: ma.length, conversations: convs.length, revenue: rev, fidelite: fid.length, bookingsSent: bs, relances: convs.filter((c) => c.relanced === "oui").length, conversionRate: bs > 0 ? Math.round((ma.length / bs) * 100) : 0, positivePct: convs.length > 0 ? Math.round((convs.filter((c) => c.sentiment === "positif").length / convs.length) * 100) : 0 });
    } catch (e) { console.error(e); }
  }, [tenantId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!auth) return (<><style>{css}</style><LoginScreen onLogin={setAuth} /></>);
  if (loading || !tenant) return (<><style>{css}</style><div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div style={{ width: 40, height: 40, border: "3px solid var(--bd)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .8s linear infinite" }} /></div></>);

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Board" },
    { id: "appointments", icon: "📅", label: "RDV" },
    { id: "offers", icon: "💎", label: "Services" },
    { id: "availability", icon: "🕐", label: "Horaires" },
    { id: "conversations", icon: "💬", label: "Chat" },
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
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: tab === t.id ? "var(--accent-bg)" : "transparent", color: tab === t.id ? "var(--accent2)" : "var(--t2)", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span> {t.label}
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
          {tab === "conversations" && <ConversationsTab conversations={conversations} />}
          {tab === "settings" && <SettingsTab tenant={tenant} token={token} onRefresh={loadData} onLogout={logout} />}
        </div>

        <div className="mobile-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--surface)", borderTop: "1px solid var(--bd)", justifyContent: "space-around", alignItems: "center", padding: "4px 0 env(safe-area-inset-bottom, 4px)", zIndex: 100 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, border: "none", cursor: "pointer", padding: "6px 4px", borderRadius: 8, background: "transparent", color: tab === t.id ? "var(--accent2)" : "var(--t3)", fontSize: 9, fontWeight: tab === t.id ? 600 : 400 }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
