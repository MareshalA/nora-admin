import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// ██  CONFIGURATION SUPABASE — À REMPLIR  ██
// ═══════════════════════════════════════════════════════
const SUPABASE_URL = "https://negcqsbonsdhvymfujff.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2Nxc2JvbnNkaHZ5bWZ1amZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTkxNDcsImV4cCI6MjA5MDM3NTE0N30.uD6byRpnau2ddx65tBhrFz_0PeUHrgFerHEBW6T87lM";

const SB = {
  headers: (token) => ({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token || SUPABASE_KEY}`,
    "Content-Type": "application/json",
  }),
  async get(table, query, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: this.headers(token) });
    return r.json();
  },
  async post(table, data, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: { ...this.headers(token), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  async patch(table, id, data, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH", headers: { ...this.headers(token), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  async del(table, id, token) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE", headers: this.headers(token),
    });
  },
  async auth(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error("Email ou mot de passe incorrect");
    return r.json();
  },
};

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
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
  body { font-family: 'DM Sans', system-ui, sans-serif; background: var(--bg); color: var(--t1); }
  input, select, textarea { font-family: inherit; }
  input::placeholder, textarea::placeholder { color: var(--t3); }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn .3s ease-out; }
`;

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--bd)",
  background: "var(--surface2)", color: "var(--t1)", fontSize: 14, outline: "none",
};
const btnPrimary = {
  padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--accent)",
  color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const btnSecondary = {
  padding: "10px 20px", borderRadius: 10, border: "1px solid var(--bd)",
  background: "transparent", color: "var(--t2)", fontSize: 14, fontWeight: 500, cursor: "pointer",
};
const btnDanger = { ...btnPrimary, background: "var(--red)" };

// ═══════════════════════════════════════════════════════
// KPI Card
// ═══════════════════════════════════════════════════════
function KPICard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 16,
      padding: 20, flex: "1 1 200px", minWidth: 180,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, background: color || "var(--accent-bg)",
        }}>{icon}</div>
        <div style={{ fontSize: 12, color: "var(--t3)", fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--t1)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Login Screen
// ═══════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await SB.auth(email, password);
      onLogin(data);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "var(--surface)", border: "1px solid var(--bd)",
        borderRadius: 20, padding: 32,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>NoraSaaS</div>
          <div style={{ fontSize: 14, color: "var(--t3)" }}>Connectez-vous à votre espace</div>
        </div>
        {err && <div style={{ background: "var(--red-bg)", color: "var(--red)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{err}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 6 }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 6 }}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handle()} />
          </div>
          <button onClick={handle} disabled={loading} style={{ ...btnPrimary, width: "100%", padding: 14, marginTop: 4, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Dashboard Tab
// ═══════════════════════════════════════════════════════
function DashboardTab({ stats }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Tableau de bord</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 28 }}>
        <KPICard icon="📅" label="RDV ce mois" value={stats.rdvMonth} sub="confirmés" color="var(--accent-bg)" />
        <KPICard icon="💬" label="Conversations" value={stats.conversations} sub="total" color="var(--blue-bg)" />
        <KPICard icon="💰" label="CA estimé (MAD)" value={stats.revenue.toLocaleString()} sub="ce mois" color="var(--amber-bg)" />
        <KPICard icon="⭐" label="Clients fidèles" value={stats.fidelite} sub="inscrits" color="var(--accent-bg)" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        <KPICard icon="🤖" label="Liens booking envoyés" value={stats.bookingsSent} color="var(--blue-bg)" />
        <KPICard icon="🔄" label="Relances" value={stats.relances} color="var(--amber-bg)" />
        <KPICard icon="📊" label="Taux conversion" value={stats.conversionRate + "%"} sub="booking envoyé → RDV" color="var(--accent-bg)" />
        <KPICard icon="😊" label="Sentiment positif" value={stats.positivePct + "%"} color="var(--accent-bg)" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Offers Tab
// ═══════════════════════════════════════════════════════
function OffersTab({ offers, tenantId, token, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const startNew = () => {
    setForm({ service: "", prix: "", duree_minutes: 30, categorie: "", promo: "", description: "", max_simultane: 1, active: true });
    setEditing("new");
  };
  const startEdit = (o) => { setForm({ ...o }); setEditing(o.id); };
  const cancel = () => { setEditing(null); setForm({}); };

  const save = async () => {
    const payload = {
      tenant_id: tenantId,
      service: form.service,
      prix: Number(form.prix) || 0,
      duree_minutes: Number(form.duree_minutes) || 30,
      categorie: form.categorie || null,
      promo: form.promo || null,
      description: form.description || null,
      max_simultane: Number(form.max_simultane) || 1,
      active: form.active !== false,
    };
    if (editing === "new") await SB.post("offers", payload, token);
    else await SB.patch("offers", editing, payload, token);
    cancel();
    onRefresh();
  };

  const remove = async (id) => {
    if (!confirm("Supprimer cette offre ?")) return;
    await SB.del("offers", id, token);
    onRefresh();
  };

  const toggle = async (o) => {
    await SB.patch("offers", o.id, { active: !o.active }, token);
    onRefresh();
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Services & Offres</h2>
        <button onClick={startNew} style={btnPrimary}>+ Ajouter</button>
      </div>

      {editing && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{editing === "new" ? "Nouveau service" : "Modifier le service"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Nom du service*", "service", "text", "Hydrafacial"],
              ["Prix (MAD)*", "prix", "number", "800"],
              ["Durée (min)*", "duree_minutes", "number", "30"],
              ["Catégorie", "categorie", "text", "visage"],
              ["Ancien prix / Promo", "promo", "text", "1200"],
              ["Max simultané", "max_simultane", "number", "1"],
            ].map(([label, key, type, ph]) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 4 }}>{label}</label>
                <input type={type} value={form[key] || ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />
              </div>
            ))}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 4 }}>Description</label>
              <textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle..." rows={2}
                style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={cancel} style={btnSecondary}>Annuler</button>
            <button onClick={save} disabled={!form.service || !form.prix} style={{ ...btnPrimary, opacity: form.service && form.prix ? 1 : 0.4 }}>Enregistrer</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {offers.map((o) => (
          <div key={o.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: 16,
            background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14,
            opacity: o.active ? 1 : 0.5,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{o.service}</span>
                {o.categorie && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent2)" }}>{o.categorie}</span>}
                {!o.active && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "var(--red-bg)", color: "var(--red)" }}>Désactivé</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>
                {o.duree_minutes} min — {o.prix} MAD {o.promo ? `(ancien: ${o.promo})` : ""} — max {o.max_simultane}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => toggle(o)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>{o.active ? "Désactiver" : "Activer"}</button>
              <button onClick={() => startEdit(o)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Modifier</button>
              <button onClick={() => remove(o.id)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12, color: "var(--red)", borderColor: "var(--red)" }}>✕</button>
            </div>
          </div>
        ))}
        {offers.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>Aucun service configuré. Cliquez sur "+ Ajouter" pour commencer.</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Availability Tab
// ═══════════════════════════════════════════════════════
function AvailabilityTab({ availability, tenantId, token, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const saveDay = async (dow) => {
    const existing = availability.find((a) => a.day_of_week === dow);
    const data = {
      tenant_id: tenantId,
      day_of_week: dow,
      start_time: form.start_time || "09:00",
      end_time: form.end_time || "19:00",
      is_closed: form.is_closed || false,
    };
    if (existing) await SB.patch("availability", existing.id, data, token);
    else await SB.post("availability", data, token);
    setEditing(null);
    onRefresh();
  };

  const toggleClosed = async (avail) => {
    await SB.patch("availability", avail.id, { is_closed: !avail.is_closed }, token);
    onRefresh();
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Horaires d'ouverture</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DAYS.map((name, dow) => {
          const avail = availability.find((a) => a.day_of_week === dow);
          const isEditing = editing === dow;

          return (
            <div key={dow} style={{
              background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14,
              padding: 16, display: "flex", alignItems: "center", gap: 14,
              opacity: avail?.is_closed ? 0.5 : 1,
            }}>
              <div style={{ width: 90, fontWeight: 600, fontSize: 14 }}>{name}</div>

              {isEditing ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="time" value={form.start_time || "09:00"} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} style={{ ...inputStyle, width: 120 }} />
                  <span style={{ color: "var(--t3)" }}>→</span>
                  <input type="time" value={form.end_time || "19:00"} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} style={{ ...inputStyle, width: 120 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t3)", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.is_closed || false} onChange={(e) => setForm((f) => ({ ...f, is_closed: e.target.checked }))} />
                    Fermé
                  </label>
                  <button onClick={() => saveDay(dow)} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 12 }}>OK</button>
                  <button onClick={() => setEditing(null)} style={{ ...btnSecondary, padding: "6px 14px", fontSize: 12 }}>✕</button>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                  {avail ? (
                    avail.is_closed ? (
                      <span style={{ fontSize: 13, color: "var(--red)" }}>Fermé</span>
                    ) : (
                      <span style={{ fontSize: 13, color: "var(--t2)" }}>
                        {avail.start_time?.slice(0, 5)} → {avail.end_time?.slice(0, 5)}
                      </span>
                    )
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--t3)" }}>Non configuré</span>
                  )}
                </div>
              )}

              {!isEditing && (
                <div style={{ display: "flex", gap: 6 }}>
                  {avail && (
                    <button onClick={() => toggleClosed(avail)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>
                      {avail.is_closed ? "Ouvrir" : "Fermer"}
                    </button>
                  )}
                  <button onClick={() => {
                    setForm({ start_time: avail?.start_time?.slice(0, 5) || "09:00", end_time: avail?.end_time?.slice(0, 5) || "19:00", is_closed: avail?.is_closed || false });
                    setEditing(dow);
                  }} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>
                    Modifier
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Appointments Tab
// ═══════════════════════════════════════════════════════
function AppointmentsTab({ appointments, token, onRefresh }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? appointments : appointments.filter((a) => a.status === filter);
  const statusColors = { confirmed: "var(--accent)", cancelled: "var(--red)", completed: "var(--blue)", no_show: "var(--amber)" };
  const statusLabels = { confirmed: "Confirmé", cancelled: "Annulé", completed: "Terminé", no_show: "Absent" };

  const updateStatus = async (id, status) => {
    await SB.patch("appointments", id, { status }, token);
    onRefresh();
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Rendez-vous</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {[["all", "Tous"], ["confirmed", "Confirmés"], ["completed", "Terminés"], ["cancelled", "Annulés"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            padding: "7px 16px", borderRadius: 20, border: "1px solid var(--bd)", cursor: "pointer",
            fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
            background: filter === val ? "var(--accent)" : "transparent",
            color: filter === val ? "#fff" : "var(--t2)",
            borderColor: filter === val ? "var(--accent)" : "var(--bd)",
          }}>{label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((a) => {
          const dt = a.scheduled_at ? new Date(a.scheduled_at) : null;
          return (
            <div key={a.id} style={{
              background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.customer_name || "Client"}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{a.customer_phone}</div>
                  <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 6 }}>{a.service_name}</div>
                  {dt && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>
                    {dt.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à {dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 8, fontWeight: 600,
                    background: `${statusColors[a.status] || "var(--t3)"}20`, color: statusColors[a.status] || "var(--t3)",
                  }}>{statusLabels[a.status] || a.status}</span>
                  {a.status === "confirmed" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => updateStatus(a.id, "completed")} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 11 }}>Terminé</button>
                      <button onClick={() => updateStatus(a.id, "cancelled")} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 11, color: "var(--red)" }}>Annuler</button>
                      <button onClick={() => updateStatus(a.id, "no_show")} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 11, color: "var(--amber)" }}>Absent</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>Aucun rendez-vous.</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Conversations Tab
// ═══════════════════════════════════════════════════════
function ConversationsTab({ conversations }) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter((c) =>
    (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_phone || "").includes(search) ||
    (c.client_message || "").toLowerCase().includes(search.toLowerCase())
  );

  const sentimentEmoji = { positif: "😊", négatif: "😤", neutre: "😐" };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Conversations WhatsApp</h2>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, téléphone..." style={{ ...inputStyle, marginBottom: 16 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.slice(0, 50).map((c) => (
          <div key={c.id} style={{
            background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 12, padding: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {sentimentEmoji[c.sentiment] || "💬"} {c.customer_name || c.customer_phone}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>
                {c.timestamp ? new Date(c.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>
              <strong>Client:</strong> {(c.client_message || "").slice(0, 120)}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>
              <strong>Bot:</strong> {(c.bot_response || "").slice(0, 120)}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {c.booking_link_sent === "oui" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent2)" }}>Lien envoyé</span>}
              {c.relanced === "oui" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "var(--amber-bg)", color: "var(--amber)" }}>Relancé</span>}
              {c.interest && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "var(--blue-bg)", color: "var(--blue)" }}>{c.interest}</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>Aucune conversation trouvée.</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Settings Tab
// ═══════════════════════════════════════════════════════
function SettingsTab({ tenant, token, onRefresh }) {
  const [form, setForm] = useState({ ...tenant });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    const { id, created_at, user_id, ...rest } = form;
    await SB.patch("tenants", tenant.id, rest, token);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  };

  const fields = [
    ["Nom du centre", "nom_centre", "text"],
    ["Adresse", "adresse", "text"],
    ["Téléphone gérant", "phone_gerant", "tel"],
    ["Email gérant", "email_gerant", "email"],
    ["Téléphone WhatsApp", "phone_whatsapp", "tel"],
    ["Nom du bot", "nom_bot", "text"],
    ["Lien Google Maps", "lien_google_maps", "url"],
    ["Lien Google Review", "lien_google_review", "url"],
    ["Parking info", "parking", "text"],
    ["Message fermé", "message_ferme", "text"],
    ["Paiement", "paiement", "text"],
  ];

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Paramètres du centre</h2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--bd)", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {fields.map(([label, key, type]) => (
            <div key={key} style={key === "message_ferme" ? { gridColumn: "1/-1" } : {}}>
              <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 4 }}>{label}</label>
              <input type={type} value={form[key] || ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--t2)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.fidelite || false} onChange={(e) => setForm((f) => ({ ...f, fidelite: e.target.checked }))} />
            Programme fidélité
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--t2)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.liste_attente || false} onChange={(e) => setForm((f) => ({ ...f, liste_attente: e.target.checked }))} />
            Liste d'attente
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {saved && <span style={{ fontSize: 13, color: "var(--accent)" }}>✓ Sauvegardé</span>}
        </div>

        <div style={{ marginTop: 24, padding: 16, background: "var(--surface2)", borderRadius: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)", marginBottom: 8 }}>Lien de réservation</div>
          <div style={{ fontSize: 12, color: "var(--accent2)", wordBreak: "break-all", fontFamily: "monospace" }}>
            {`${window.location.origin}?tenant=${tenant.id}`}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
            Ce lien est envoyé automatiquement par le bot WhatsApp à vos clients.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════
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

  // ── Load tenant after auth ──
  useEffect(() => {
    if (!auth) return;
    (async () => {
      setLoading(true);
      try {
        const userId = auth.user?.id;
        const tenants = await SB.get("tenants", `user_id=eq.${userId}&select=*`, token);
        if (tenants.length) setTenant(tenants[0]);
        else {
          alert("Aucun centre associé à ce compte.");
          setAuth(null);
        }
      } catch { alert("Erreur de chargement"); setAuth(null); }
      setLoading(false);
    })();
  }, [auth]);

  // ── Load all data ──
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
      setOffers(off);
      setAvailability(avail);
      setAppointments(appts);
      setConversations(convs);
      setFidelite(fid);

      // KPI calculations
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthAppts = appts.filter((a) => a.status === "confirmed" && new Date(a.scheduled_at) >= monthStart);
      const bookingsSent = convs.filter((c) => c.booking_link_sent === "oui").length;
      const relances = convs.filter((c) => c.relanced === "oui").length;
      const positiveConvs = convs.filter((c) => c.sentiment === "positif").length;
      const revenue = monthAppts.reduce((sum, a) => {
        const svc = off.find((o) => o.id === a.offer_id);
        return sum + (svc?.prix || 0);
      }, 0);

      setStats({
        rdvMonth: monthAppts.length,
        conversations: convs.length,
        revenue,
        fidelite: fid.length,
        bookingsSent,
        relances,
        conversionRate: bookingsSent > 0 ? Math.round((monthAppts.length / bookingsSent) * 100) : 0,
        positivePct: convs.length > 0 ? Math.round((positiveConvs / convs.length) * 100) : 0,
      });
    } catch (e) {
      console.error("Load error:", e);
    }
  }, [tenantId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!auth) return (<><style>{css}</style><LoginScreen onLogin={setAuth} /></>);
  if (loading || !tenant) return (
    <><style>{css}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--bd)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      </div>
    </>
  );

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "appointments", label: "RDV", icon: "📅" },
    { id: "offers", label: "Services", icon: "💎" },
    { id: "availability", label: "Horaires", icon: "🕐" },
    { id: "conversations", label: "Messages", icon: "💬" },
    { id: "settings", label: "Paramètres", icon: "⚙️" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <div style={{
          width: 220, background: "var(--surface)", borderRight: "1px solid var(--bd)",
          padding: "20px 12px", display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent2)", marginBottom: 4, paddingLeft: 8 }}>NoraSaaS</div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 28, paddingLeft: 8 }}>{tenant.nom_centre}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                background: tab === t.id ? "var(--accent-bg)" : "transparent",
                color: tab === t.id ? "var(--accent2)" : "var(--t2)",
                textAlign: "left", width: "100%",
              }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <button onClick={() => { setAuth(null); setTenant(null); }} style={{ ...btnSecondary, fontSize: 12, marginTop: "auto" }}>
            Déconnexion
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 28, overflowY: "auto", maxHeight: "100vh" }}>
          {tab === "dashboard" && <DashboardTab stats={stats} />}
          {tab === "offers" && <OffersTab offers={offers} tenantId={tenantId} token={token} onRefresh={loadData} />}
          {tab === "availability" && <AvailabilityTab availability={availability} tenantId={tenantId} token={token} onRefresh={loadData} />}
          {tab === "appointments" && <AppointmentsTab appointments={appointments} token={token} onRefresh={loadData} />}
          {tab === "conversations" && <ConversationsTab conversations={conversations} />}
          {tab === "settings" && <SettingsTab tenant={tenant} token={token} onRefresh={loadData} />}
        </div>
      </div>
    </>
  );
}
