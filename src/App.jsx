import { useState, useEffect, useCallback, useRef } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "https://negcqsbonsdhvymfujff.supabase.co";
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2Nxc2JvbnNkaHZ5bWZ1amZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTkxNDcsImV4cCI6MjA5MDM3NTE0N30.uD6byRpnau2ddx65tBhrFz_0PeUHrgFerHEBW6T87lM";
const N8N_WH = import.meta.env.VITE_N8N_WEBHOOK || "https://morad1234567.app.n8n.cloud/webhook/e66b1c06-d828-4e22-8473-1ad62aff807b";
const TZ = "Africa/Casablanca";

// ─── Plans — source de vérité dérivée du champ plan dans tenants ─────────────
const PLANS = {
  trial:      { label: "Essai gratuit", color: "#7A8478", convLimit: 300,  praticienLimit: 1,    features: ["bot","resa","mails"] },
  starter:    { label: "Starter",       color: "#5C6960", convLimit: 300,  praticienLimit: 1,    features: ["bot","resa","mails"] },
  pro:        { label: "Pro",           color: "#1D9E75", convLimit: 1000, praticienLimit: 5,    features: ["bot","resa","mails","relances","avis","newsletter","analytics","live","csv"] },
  business:   { label: "Business",      color: "#E89B5A", convLimit: null, praticienLimit: null, features: ["bot","resa","mails","relances","avis","newsletter","analytics","live","csv","predictif","fidelite","bot_perso","rapport_pdf","api"] },
  sur_mesure: { label: "Sur mesure",    color: "#2A6FDB", convLimit: null, praticienLimit: null, features: ["all"] },
};

const hasFeat = (plan, f) => {
  const p = PLANS[plan] || PLANS.starter;
  return p.features.includes("all") || p.features.includes(f);
};

// ─── Supabase helper ─────────────────────────────────────────────────────────
const SB = {
  h: (t) => ({ apikey: SB_KEY, Authorization: `Bearer ${t || SB_KEY}`, "Content-Type": "application/json" }),
  async get(table, q, t)     { const r = await fetch(`${SB_URL}/rest/v1/${table}?${q}`, { headers: this.h(t) }); return r.json(); },
  async post(table, d, t)    { const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: { ...this.h(t), Prefer: "return=representation" }, body: JSON.stringify(d) }); return r.json(); },
  async patch(table, q, d, t){ const r = await fetch(`${SB_URL}/rest/v1/${table}?${q}`, { method: "PATCH", headers: { ...this.h(t), Prefer: "return=representation" }, body: JSON.stringify(d) }); return r.json(); },
  async del(table, id, t)    { await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: this.h(t) }); },
  async auth(email, pw)      { const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) }); if (!r.ok) throw new Error("Identifiants incorrects"); return r.json(); },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const JOURS   = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const JOURS_C = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const tzNow   = () => new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
const fmtD    = (ts, o) => ts ? new Date(ts).toLocaleDateString("fr-FR", { timeZone: TZ, ...o }) : "";
const fmtH    = (ts) => ts ? new Date(ts).toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "";
const fmtFull = (ts) => ts ? new Date(ts).toLocaleString("fr-FR", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const startOM = () => { const n = tzNow(); return new Date(n.getFullYear(), n.getMonth(), 1); };
const daysLeft = (d) => { if (!d) return null; const diff = Math.ceil((new Date(d) - new Date()) / 86400000); return Math.max(0, diff); };

// Normalisation statuts — FR uniquement
const STATUS_COLOR = { "confirmé": "#1D9E75", "confirmed": "#1D9E75", "terminé": "#2A6FDB", "completed": "#2A6FDB", "annulé": "#C0392B", "cancelled": "#C0392B", "absent": "#C97A2F", "no_show": "#C97A2F", "modifié": "#C97A2F" };
const STATUS_LABEL = { "confirmé": "Confirmé", "confirmed": "Confirmé", "terminé": "Terminé", "completed": "Terminé", "annulé": "Annulé", "cancelled": "Annulé", "absent": "Absent", "no_show": "Absent", "modifié": "Modifié" };
const isConfirmed = (s) => ["confirmé", "confirmed"].includes(s);
const isTermine   = (s) => ["terminé", "completed"].includes(s);
const isAnnule    = (s) => ["annulé", "cancelled"].includes(s);
const isAbsent    = (s) => ["absent", "no_show"].includes(s);

const AVATAR_COLORS = ["#1D9E75", "#2A6FDB", "#C97A2F", "#C0392B", "#7A4FBF", "#E89B5A", "#156A4D", "#185FA5"];
const avatarBg  = (name) => AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length];
const initiales = (p, n) => `${(p || "?")[0]}${n ? n[0] : ""}`.toUpperCase();
const arr = (v) => Array.isArray(v) ? v : [];

const exportCSV = (rows, fn) => {
  if (!rows.length) return;
  const k = Object.keys(rows[0]);
  const csv = [k.join(";"), ...rows.map(r => k.map(x => `"${(r[x] || "").toString().replace(/"/g, '""')}"`).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = fn; a.click();
};

// ─── CSS Global — Charte Nora ─────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#FFFFFF; --s1:#FAF6EC; --s2:#F4EFDD; --s3:#EFE6D2;
  --ln:#EFE6D2; --ln2:#D4D0C2;
  --ink:#1A1F1B; --i2:#5C6960; --i3:#7A8478;
  --br:#1D9E75; --brdk:#156A4D; --brs:rgba(29,158,117,.08);
  --rd:#C0392B; --rds:rgba(192,57,43,.08);
  --am:#C97A2F; --ams:rgba(201,122,47,.10);
  --bl:#2A6FDB; --bls:rgba(42,111,219,.08);
  --cu:#E89B5A;
  --fn:'Inter',system-ui,sans-serif; --mn:'JetBrains Mono',monospace;
  --r1:6px; --r2:10px; --r3:14px; --rp:999px;
}
[data-theme="dark"]{
  --bg:#0E120F; --s1:#161B17; --s2:#1E241F; --s3:#232A24;
  --ln:#232A24; --ln2:#313A32;
  --ink:#F2EFE6; --i2:#A8B0A6; --i3:#7A8478;
  --br:#2EB287; --brdk:#59C8A4; --brs:rgba(46,178,135,.10);
  --rds:rgba(192,57,43,.14); --ams:rgba(201,122,47,.14); --bls:rgba(42,111,219,.12);
}
html,body,#root{height:100%}
body{font-family:var(--fn);background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;line-height:1.5;font-size:14px}
input,select,textarea,button{font-family:inherit}
input::placeholder,textarea::placeholder{color:var(--i3)}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:up .2s ease-out}
.ly{display:flex;min-height:100vh}
.sb{width:192px;flex-shrink:0;background:var(--s1);border-right:1px solid var(--ln);display:flex;flex-direction:column;padding:16px 10px}
.mn{flex:1;overflow-y:auto;max-height:100vh;padding:26px;background:var(--bg)}
.sb-logo{display:flex;align-items:baseline;gap:4px;font-weight:800;font-size:20px;letter-spacing:-.04em;padding:0 8px;margin-bottom:2px}
.sb-logo em{width:7px;height:7px;border-radius:50%;background:var(--br);display:inline-block;margin-bottom:2px;font-style:normal}
.sb-ten{font-size:11px;color:var(--i3);padding:0 8px;margin-bottom:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--mn)}
.sb-nav{display:flex;flex-direction:column;gap:1px;flex:1}
.sb-b{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--r1);border:none;cursor:pointer;font-size:13px;font-weight:500;background:transparent;color:var(--i2);text-align:left;width:100%;transition:background .12s,color .12s}
.sb-b:hover{background:var(--brs);color:var(--ink)}
.sb-b.on{background:var(--brs);color:var(--br)}
.sb-bx{margin-left:auto;font-size:10px;padding:1px 6px;border-radius:var(--rp);font-weight:700;color:#fff;background:var(--br);font-family:var(--mn)}
.sb-bx.w{background:var(--am)}
.sb-ft{border-top:1px solid var(--ln);padding-top:10px;margin-top:6px;display:flex;flex-direction:column;gap:1px}
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--s1);border-top:1px solid var(--ln);justify-content:space-around;padding:4px 0 env(safe-area-inset-bottom,4px);z-index:100}
.mob-b{display:flex;flex-direction:column;align-items:center;gap:1px;border:none;cursor:pointer;padding:5px 3px;border-radius:var(--r1);background:transparent;color:var(--i3);font-size:9px;font-weight:500;position:relative}
.mob-b.on{color:var(--br)}
.card{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r3)}
.cp{padding:16px}
.ch{padding:12px 16px;border-bottom:1px solid var(--ln);display:flex;align-items:center;justify-content:space-between}
.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kc{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r2);padding:14px}
.kl{font-size:10px;color:var(--i3);font-family:var(--mn);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
.kv{font-size:24px;font-weight:800;letter-spacing:-.04em;line-height:1}
.ks{font-size:10px;color:var(--i3);margin-top:3px;font-family:var(--mn)}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--rp);border:none;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .12s,transform .1s;white-space:nowrap}
.btn:active{transform:scale(.98)}
.bp{background:var(--br);color:#fff}.bp:hover{opacity:.88}
.bg2{background:transparent;color:var(--i2);border:1px solid var(--ln2)}.bg2:hover{background:var(--s2);color:var(--ink)}
.bd{background:transparent;color:var(--rd);border:1px solid var(--rd)}.bd:hover{background:var(--rds)}
.sm{padding:5px 11px;font-size:12px;border-radius:var(--r1)}
.btn:disabled{opacity:.4;cursor:not-allowed}
.inp{width:100%;padding:9px 12px;border-radius:var(--r1);border:1px solid var(--ln2);background:var(--bg);color:var(--ink);font-size:14px;outline:none;transition:border-color .12s,box-shadow .12s}
.inp:focus{border-color:var(--br);box-shadow:0 0 0 3px var(--brs)}
.ism{padding:6px 10px;font-size:13px}
.lbl{font-size:10px;color:var(--i3);display:block;margin-bottom:4px;font-family:var(--mn);text-transform:uppercase;letter-spacing:.08em}
.sel{width:100%;padding:8px 12px;border-radius:var(--r1);border:1px solid var(--ln2);background:var(--bg);color:var(--ink);font-size:13px;outline:none}
.sel:focus{border-color:var(--br)}
.pill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:var(--rp);font-size:11px;font-weight:500;font-family:var(--mn)}
.tbl{width:100%;border-collapse:collapse}
.tbl th{font-size:10px;color:var(--i3);font-family:var(--mn);text-transform:uppercase;letter-spacing:.08em;padding:9px 14px;border-bottom:1px solid var(--ln);text-align:left;font-weight:500}
.tbl td{padding:10px 14px;border-bottom:1px solid var(--ln);font-size:13px;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:var(--s1)}
.ptr{height:5px;background:var(--s3);border-radius:var(--rp);overflow:hidden}
.ptf{height:100%;border-radius:var(--rp);transition:width .5s ease}
.fts{display:flex;gap:5px;flex-wrap:wrap}
.ft{padding:5px 13px;border-radius:var(--rp);border:1px solid var(--ln2);font-size:12px;font-weight:500;cursor:pointer;background:transparent;color:var(--i2);transition:all .12s}
.ft.on{background:var(--br);color:#fff;border-color:var(--br)}
.ft:hover:not(.on){border-color:var(--br);color:var(--ink)}
.sh{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px}
.st{font-size:18px;font-weight:700;letter-spacing:-.02em}
.ey{font-family:var(--mn);font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--br);margin-bottom:4px}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:var(--mn);color:#fff;flex-shrink:0}
.ag-w{overflow-x:auto}
.ag-g{display:grid;grid-template-columns:52px repeat(7,1fr);min-width:580px}
.ag-dh{text-align:center;padding:7px 3px;border-bottom:1px solid var(--ln);border-left:1px solid var(--ln);font-size:10px;font-family:var(--mn);color:var(--i3)}
.ag-dh.tc{color:var(--br);font-weight:700}
.ag-c{border-left:1px solid var(--ln);border-bottom:1px dashed var(--s3);min-height:40px;position:relative;padding:1px}
.ag-c.nh{background:var(--brs)}
.ag-b{position:absolute;inset:1px;border-radius:3px;padding:2px 4px;font-size:9px;font-weight:600;overflow:hidden;cursor:pointer;line-height:1.3}
.ag-t{font-size:9px;color:var(--i3);font-family:var(--mn);text-align:right;padding:2px 5px 0 0;border-right:1px solid var(--ln)}
.cc{max-width:76%}
.bc{background:var(--s2);border:1px solid var(--ln);border-radius:12px 12px 12px 3px;padding:8px 12px;font-size:13px}
.bb{border-radius:12px 12px 3px 12px;padding:8px 12px;font-size:13px}
.bb.bot{background:var(--brs);border:1px solid rgba(29,158,117,.2)}
.bb.sal{background:var(--ams);border:1px solid rgba(201,122,47,.25)}
.bts{font-size:9px;color:var(--i3);margin-top:2px;font-family:var(--mn)}
.pc{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r3);padding:1rem;position:relative;display:flex;flex-direction:column}
.pc.cur{border:2px solid var(--br)}
.ptb{position:absolute;top:-1px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:600;padding:2px 12px;border-radius:0 0 8px 8px;white-space:nowrap}
.pfl{list-style:none;display:flex;flex-direction:column;gap:5px;flex:1}
.pfl li{font-size:11px;display:flex;gap:6px;align-items:flex-start;line-height:1.4}
.pfl li .ck{flex-shrink:0;width:11px;font-size:10px;margin-top:1px}
.pfl li.y{color:var(--i2)}.pfl li.y .ck{color:var(--br)}
.pfl li.n{color:var(--i3)}.pfl li.n .ck{color:var(--ln2)}
.pfl li.hi{color:var(--ink);font-weight:500}.pfl li.hi .ck{color:var(--br)}
@media(max-width:768px){.sb{display:none}.mob-nav{display:flex!important}.mn{padding:14px 12px 80px}.kg{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr!important}}
@media(max-width:1100px){.kg{grid-template-columns:repeat(2,1fr)}}
@media(min-width:769px){.mob-nav{display:none!important}}
`;

// ─── Composants partagés ──────────────────────────────────────────────────────
function Spin({ s = 32 }) {
  return <div style={{ width: s, height: s, border: "3px solid var(--ln)", borderTopColor: "var(--br)", borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />;
}

function SPill({ status }) {
  const c = STATUS_COLOR[status] || "#7A8478";
  const l = STATUS_LABEL[status] || status || "";
  return <span className="pill" style={{ background: `${c}15`, color: c }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: c, display: "inline-block" }} />{l}</span>;
}

function Av({ prenom, nom, size = 34, couleur }) {
  const bg = couleur || avatarBg(prenom);
  return <div className="av" style={{ width: size, height: size, background: bg, fontSize: size * .35 }}>{initiales(prenom, nom)}</div>;
}

function Mdl({ title, onClose, children, w = 480 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--bg)", border: "1px solid var(--ln)", borderRadius: "var(--r3)", width: "100%", maxWidth: w, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: "1px solid var(--ln)" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          <button onClick={onClose} className="btn bg2 sm">✕</button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [ld, setLd] = useState(false);
  const go = async () => { setLd(true); setErr(""); try { onLogin(await SB.auth(email, pw)); } catch (e) { setErr(e.message); } setLd(false); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.04em" }}>nora<span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--br)", marginLeft: 2, verticalAlign: "middle", marginBottom: 3 }} /></div>
          <div style={{ fontSize: 11, color: "var(--i3)", marginTop: 5, fontFamily: "var(--mn)", textTransform: "uppercase", letterSpacing: ".12em" }}>Espace établissement</div>
        </div>
        <div className="card cp" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {err && <div style={{ background: "var(--rds)", color: "var(--rd)", padding: "9px 13px", borderRadius: "var(--r1)", fontSize: 13 }}>{err}</div>}
          <div><label className="lbl">Email</label><input className="inp" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.ma" /></div>
          <div><label className="lbl">Mot de passe</label><input className="inp" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()} /></div>
          <button className="btn bp" onClick={go} disabled={ld} style={{ width: "100%", padding: 12, marginTop: 4, justifyContent: "center" }}>{ld ? "Connexion..." : "Se connecter →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ stats, conversations, appointments, tenant }) {
  const plan = tenant?.plan || "trial";
  const pi   = PLANS[plan] || PLANS.starter;
  const [df, setDf] = useState(""); const [dt, setDt] = useState("");

  const today    = tzNow(); const todayStr = today.toDateString();
  const fA = a => { if (df && new Date(a.scheduled_at) < new Date(df)) return false; if (dt && new Date(a.scheduled_at) > new Date(dt + "T23:59:59")) return false; return true; };
  const fC = c => { if (df && new Date(c.timestamp) < new Date(df)) return false; if (dt && new Date(c.timestamp) > new Date(dt + "T23:59:59")) return false; return true; };
  const fa = appointments.filter(fA); const fc = conversations.filter(fC);

  const rdvConf = fa.filter(a => isConfirmed(a.status)).length;
  const rdvTerm = fa.filter(a => isTermine(a.status)).length;
  const rdvAnn  = fa.filter(a => isAnnule(a.status)).length;
  const rdvAbs  = fa.filter(a => isAbsent(a.status)).length;
  const ca      = fa.filter(a => isTermine(a.status)).reduce((s, a) => s + (a.prix || 0), 0);
  const cliU    = new Set(fc.map(c => c.customer_phone)).size;
  const convN   = fc.length;
  const tauxC   = stats.bookingsSent > 0 ? Math.round((rdvConf / stats.bookingsSent) * 100) : 0;
  const sentP   = convN > 0 ? Math.round((fc.filter(c => c.sentiment === "positif").length / convN) * 100) : 0;

  const rdvToday = appointments.filter(a => a.scheduled_at && new Date(a.scheduled_at).toDateString() === todayStr && isConfirmed(a.status)).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const l14  = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - 13 + i); return d; });
  const rbd  = l14.map(d => ({ lbl: JOURS_C[d.getDay()], isT: d.toDateString() === todayStr, cnt: appointments.filter(a => a.scheduled_at && new Date(a.scheduled_at).toDateString() === d.toDateString() && isConfirmed(a.status)).length }));
  const mx   = Math.max(...rbd.map(d => d.cnt), 1);

  const convM = conversations.filter(c => new Date(c.timestamp) >= startOM()).length;
  const cpct  = pi.convLimit ? Math.min(Math.round((convM / pi.convLimit) * 100), 100) : 0;
  const cc    = cpct > 90 ? "var(--rd)" : cpct > 70 ? "var(--am)" : "var(--br)";
  const trL   = daysLeft(tenant?.trial_ends_at);
  const inTr  = plan === "trial" && trL !== null && trL >= 0;

  return (
    <div className="fade">
      <div className="sh">
        <div><div className="ey">Vue d'ensemble</div><div className="st">Tableau de bord</div></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" className="inp ism" style={{ width: 138 }} value={df} onChange={e => setDf(e.target.value)} />
          <span style={{ color: "var(--i3)", fontSize: 12 }}>→</span>
          <input type="date" className="inp ism" style={{ width: 138 }} value={dt} onChange={e => setDt(e.target.value)} />
          {(df || dt) && <button className="btn bg2 sm" onClick={() => { setDf(""); setDt(""); }}>✕ Réinitialiser</button>}
        </div>
      </div>

      {inTr && (
        <div style={{ background: "var(--brs)", border: "1px solid rgba(29,158,117,.3)", borderRadius: "var(--r3)", padding: "12px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--br)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, color: "var(--brdk)", fontWeight: 500 }}>Période d'essai gratuite — aucune carte débitée avant la fin</div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: "var(--br)", fontFamily: "var(--mn)" }}>{trL}</div><div style={{ fontSize: 10, color: "var(--brdk)", fontFamily: "var(--mn)" }}>jours restants</div></div>
        </div>
      )}

      <div className="kg" style={{ marginBottom: 14 }}>
        <div className="kc"><div className="kl">RDV confirmés</div><div className="kv" style={{ color: "var(--br)" }}>{rdvConf}</div><div className="ks">{df ? "période" : "ce mois"}</div></div>
        <div className="kc"><div className="kl">RDV terminés</div><div className="kv" style={{ color: "var(--bl)" }}>{rdvTerm}</div><div className="ks">encaissés</div></div>
        <div className="kc"><div className="kl">RDV annulés</div><div className="kv" style={{ color: "var(--rd)" }}>{rdvAnn}</div><div className="ks">+ {rdvAbs} absents</div></div>
        <div className="kc"><div className="kl">CA estimé</div><div className="kv" style={{ fontSize: 18, fontFamily: "var(--mn)" }}>{ca.toLocaleString("fr-FR")}<span style={{ fontSize: 12, color: "var(--i3)" }}> MAD</span></div><div className="ks">RDV terminés</div></div>
        <div className="kc"><div className="kl">Conversations</div><div className="kv">{convN}</div><div className="ks">clients contactés</div></div>
        <div className="kc"><div className="kl">Clients uniques</div><div className="kv">{cliU}</div><div className="ks">{df ? "période" : "ce mois"}</div></div>
        <div className="kc"><div className="kl">Taux conversion</div><div className="kv">{tauxC}<span style={{ fontSize: 14, color: "var(--i3)" }}>%</span></div><div className="ks">conversations → RDV</div></div>
        <div className="kc"><div className="kl">Sentiment positif</div><div className="kv">{sentP}<span style={{ fontSize: 14, color: "var(--i3)" }}>%</span></div><div className="ks">des conversations</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, marginBottom: 12 }} className="g2">
        <div className="card">
          <div className="ch"><span style={{ fontSize: 13, fontWeight: 600 }}>Activité — 14 derniers jours</span><span className="ey" style={{ margin: 0 }}>RDV confirmés</span></div>
          <div style={{ padding: "12px 14px 10px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 68 }}>
              {rbd.map((d, i) => { const h = d.cnt > 0 ? Math.max((d.cnt / mx) * 58, 6) : 2; return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {d.cnt > 0 && <div style={{ fontSize: 8, fontFamily: "var(--mn)", color: "var(--i3)" }}>{d.cnt}</div>}
                  <div style={{ width: "100%", height: h, background: d.isT ? "var(--br)" : "var(--s3)", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
                  <div style={{ fontSize: 8, fontFamily: "var(--mn)", color: d.isT ? "var(--br)" : "var(--i3)", fontWeight: d.isT ? 700 : 400 }}>{d.lbl}</div>
                </div>
              ); })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ch"><span style={{ fontSize: 13, fontWeight: 600 }}>Aujourd'hui</span><span style={{ fontFamily: "var(--mn)", fontSize: 11, color: "var(--br)" }}>{rdvToday.length} RDV</span></div>
          <div style={{ maxHeight: 140, overflowY: "auto" }}>
            {rdvToday.length === 0
              ? <div style={{ padding: "16px", fontSize: 13, color: "var(--i3)", textAlign: "center" }}>Aucun RDV aujourd'hui</div>
              : rdvToday.map(a => (
                <div key={a.id} style={{ padding: "8px 14px", borderBottom: "1px solid var(--ln)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontFamily: "var(--mn)", fontSize: 12, color: "var(--br)", fontWeight: 600, minWidth: 36 }}>{fmtH(a.scheduled_at)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.customer_name || "Client"}</div>
                    <div style={{ fontSize: 11, color: "var(--i3)" }}>{a.service_name}</div>
                  </div>
                  {a.personnel_nom && <div style={{ fontSize: 11, color: "var(--i3)", flexShrink: 0 }}>{a.personnel_nom}</div>}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Abonnement</span>
          <span className="pill" style={{ background: `${pi.color}15`, color: pi.color, fontFamily: "var(--mn)" }}>{pi.label}</span>
        </div>
        <div style={{ padding: "13px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="g2">
          <div>
            <div className="kl" style={{ marginBottom: 7 }}>Conversations ce mois</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mn)", color: "var(--i3)", marginBottom: 5 }}>
              <span>{convM} utilisées</span><span style={{ color: cc }}>{pi.convLimit ? `/ ${pi.convLimit}` : "Illimité"}</span>
            </div>
            {pi.convLimit && <>
              <div className="ptr"><div className="ptf" style={{ width: `${cpct}%`, background: cc }} /></div>
              <div style={{ fontSize: 10, color: cc, fontFamily: "var(--mn)", marginTop: 3 }}>{cpct}%{cpct > 90 && " — limite proche !"}</div>
            </>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--i2)" }}>Voir les détails et options</div>
            <button className="btn bg2 sm">Abonnement →</button>
          </div>
        </div>
        {cpct > 80 && <div style={{ margin: "0 16px 12px", padding: "9px 13px", background: "var(--ams)", border: "1px solid rgba(201,122,47,.3)", borderRadius: "var(--r1)", fontSize: 12, color: "var(--am)" }}>⚠️ Vous approchez de la limite mensuelle. Contactez-nous pour passer au plan supérieur.</div>}
      </div>
    </div>
  );
}

// ─── RENDEZ-VOUS ──────────────────────────────────────────────────────────────
function RDVTab({ appointments, personnel, token, onRefresh }) {
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [wo, setWo] = useState(0);
  const [df, setDf] = useState(""); const [dt, setDt] = useState("");
  const [conf, setConf] = useState(null);

  const today = tzNow(); const todayStr = today.toDateString();
  const ws = (() => { const d = new Date(today); d.setDate(d.getDate() - d.getDay() + wo * 7); d.setHours(0, 0, 0, 0); return d; })();
  const wd = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; });
  const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

  const fil = appointments.filter(a => {
    if (filter === "confirmé"  && !isConfirmed(a.status)) return false;
    if (filter === "terminé"   && !isTermine(a.status))   return false;
    if (filter === "annulé"    && !isAnnule(a.status))    return false;
    if (filter === "absent"    && !isAbsent(a.status))    return false;
    if (filter === "modifié"   && a.status !== "modifié") return false;
    if (search && !(a.customer_name || "").toLowerCase().includes(search.toLowerCase()) && !(a.customer_phone || "").includes(search)) return false;
    if (df && new Date(a.scheduled_at) < new Date(df)) return false;
    if (dt && new Date(a.scheduled_at) > new Date(dt + "T23:59:59")) return false;
    return true;
  });

  const upd = async (id, s) => { await SB.patch("appointments", `id=eq.${id}`, { status: s }, token); onRefresh(); setConf(null); };
  const adh = (day, h) => appointments.filter(a => { if (!a.scheduled_at) return false; const d = new Date(a.scheduled_at); return d.toDateString() === day.toDateString() && d.getHours() === h; });
  const getP = id => personnel.find(p => p.id === id);

  return (
    <div className="fade">
      <div className="sh">
        <div><div className="ey">Planning</div><div className="st">Rendez-vous</div></div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {["list", "agenda"].map(v => <button key={v} className="btn bg2 sm" style={view === v ? { background: "var(--brs)", color: "var(--br)", borderColor: "var(--br)" } : {}} onClick={() => setView(v)}>{v === "list" ? "📋 Liste" : "📅 Agenda"}</button>)}
          <button className="btn bg2 sm" onClick={() => exportCSV(fil.map(a => ({ Client: a.customer_name || "", Tel: a.customer_phone || "", Service: a.service_name || "", Date: fmtD(a.scheduled_at, { day: "2-digit", month: "2-digit", year: "numeric" }), Heure: fmtH(a.scheduled_at), Statut: STATUS_LABEL[a.status] || a.status || "", Praticien: a.personnel_nom || "" })), "rdv-nora.csv")}>⬇ CSV</button>
        </div>
      </div>

      {view === "agenda" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="ch">
            <button className="btn bg2 sm" onClick={() => setWo(w => w - 1)}>← Préc.</button>
            <span style={{ fontFamily: "var(--mn)", fontSize: 12, color: "var(--i2)" }}>{fmtD(ws, { day: "numeric", month: "short" })} — {fmtD(wd[6], { day: "numeric", month: "short", year: "numeric" })}</span>
            <div style={{ display: "flex", gap: 6 }}>{wo !== 0 && <button className="btn bg2 sm" onClick={() => setWo(0)}>Aujourd'hui</button>}<button className="btn bg2 sm" onClick={() => setWo(w => w + 1)}>Suiv. →</button></div>
          </div>
          <div className="ag-w">
            <div className="ag-g">
              <div style={{ borderBottom: "1px solid var(--ln)" }} />
              {wd.map((d, i) => { const iT = d.toDateString() === todayStr; return (
                <div key={i} className={`ag-dh ${iT ? "tc" : ""}`}>
                  <div style={{ fontSize: 9, textTransform: "uppercase" }}>{JOURS_C[d.getDay()]}</div>
                  <div style={{ fontSize: 16, fontWeight: iT ? 800 : 500, lineHeight: 1.2 }}>{d.getDate()}</div>
                </div>
              ); })}
            </div>
            <div style={{ maxHeight: 440, overflowY: "auto" }}>
              {HOURS.map(h => (
                <div key={h} className="ag-g">
                  <div className="ag-t">{String(h).padStart(2, "0")}h</div>
                  {wd.map((d, di) => { const aa = adh(d, h); const isN = d.toDateString() === todayStr && today.getHours() === h; return (
                    <div key={di} className={`ag-c ${isN ? "nh" : ""}`}>
                      {aa.map(a => { const c = STATUS_COLOR[a.status] || "#7A8478"; return (
                        <div key={a.id} className="ag-b" style={{ background: `${c}18`, borderLeft: `3px solid ${c}`, color: c }} title={`${a.customer_name} — ${a.service_name}`}>
                          {fmtH(a.scheduled_at)} {a.customer_name || "Client"}
                          <div style={{ fontWeight: 400, opacity: .8 }}>{a.service_name}</div>
                        </div>
                      ); })}
                    </div>
                  ); })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <input className="inp ism" style={{ maxWidth: 190 }} placeholder="🔍 Nom ou numéro..." value={search} onChange={e => setSearch(e.target.value)} />
            <input type="date" className="inp ism" style={{ maxWidth: 136 }} value={df} onChange={e => setDf(e.target.value)} />
            <span style={{ alignSelf: "center", color: "var(--i3)", fontSize: 12 }}>→</span>
            <input type="date" className="inp ism" style={{ maxWidth: 136 }} value={dt} onChange={e => setDt(e.target.value)} />
            {(df || dt) && <button className="btn bg2 sm" onClick={() => { setDf(""); setDt(""); }}>✕</button>}
          </div>
          <div className="fts" style={{ marginBottom: 10 }}>
            {[["all", "Tous"], ["confirmé", "Confirmés"], ["terminé", "Terminés"], ["annulé", "Annulés"], ["absent", "Absents"], ["modifié", "Modifiés"]].map(([v, l]) => (
              <button key={v} className={`ft ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            {fil.length === 0
              ? <div style={{ padding: 32, textAlign: "center", color: "var(--i3)", fontSize: 13 }}>Aucun rendez-vous.</div>
              : <table className="tbl">
                  <thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Heure</th><th>Praticien</th><th>Statut</th><th>Actions</th></tr></thead>
                  <tbody>
                    {fil.map(a => { const p = getP(a.personnel_id); return (
                      <tr key={a.id}>
                        <td><div style={{ fontWeight: 600 }}>{a.customer_name || "—"}</div><div style={{ fontSize: 11, color: "var(--i3)", fontFamily: "var(--mn)" }}>{a.customer_phone}</div></td>
                        <td>{a.service_name || "—"}</td>
                        <td style={{ fontFamily: "var(--mn)", fontSize: 12 }}>{fmtD(a.scheduled_at, { day: "2-digit", month: "short" })}</td>
                        <td style={{ fontFamily: "var(--mn)", fontSize: 13, fontWeight: 600, color: "var(--br)" }}>{fmtH(a.scheduled_at)}</td>
                        <td>{p ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Av prenom={p.prenom} nom={p.nom} size={24} couleur={p.couleur} /><span style={{ fontSize: 12 }}>{p.prenom}</span></div> : <span style={{ fontSize: 12, color: "var(--i3)" }}>{a.personnel_nom || "—"}</span>}</td>
                        <td><SPill status={a.status} /></td>
                        <td>{isConfirmed(a.status) && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn bg2 sm" title="Terminé" onClick={() => setConf({ id: a.id, action: "terminé", lbl: `Marquer "${a.customer_name || "ce RDV"}" comme terminé ?` })}>✓</button>
                            <button className="btn bg2 sm" style={{ color: "var(--am)" }} title="Absent" onClick={() => setConf({ id: a.id, action: "absent", lbl: "Marquer comme absent ?" })}>∅</button>
                            <button className="btn bg2 sm" style={{ color: "var(--rd)" }} title="Annuler" onClick={() => setConf({ id: a.id, action: "annulé", lbl: "Annuler ce rendez-vous ?" })}>✕</button>
                          </div>
                        )}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
            }
          </div>
          <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", marginTop: 6 }}>{fil.length} rendez-vous</div>
        </>
      )}

      {conf && (
        <Mdl title="Confirmation" onClose={() => setConf(null)}>
          <p style={{ marginBottom: 16, color: "var(--i2)", fontSize: 14 }}>{conf.lbl}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn bg2" onClick={() => setConf(null)}>Annuler</button>
            <button className="btn bp" onClick={() => upd(conf.id, conf.action)}>Confirmer</button>
          </div>
        </Mdl>
      )}
    </div>
  );
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────
function ServicesTab({ offers, categories, tenantId, token, onRefresh }) {
  const [ec, setEc] = useState(null); const [cf, setCf] = useState({});
  const [eo, setEo] = useState(null); const [of2, setOf2] = useState({});

  const saveCat = async () => {
    if (!cf.nom) return;
    const d = { tenant_id: tenantId, ...cf };
    if (ec === "new") await SB.post("categories", d, token); else await SB.patch("categories", `id=eq.${ec}`, d, token);
    setEc(null); setCf({}); onRefresh();
  };
  const delCat = async id => { if (!window.confirm("Supprimer cette catégorie ?")) return; await SB.del("categories", id, token); onRefresh(); };

  const startO = (cid = null) => { setOf2({ service: "", prix: "", type_tarif: "duree", duree_minutes: 60, nb_seances: "", category_id: cid || "", promo: "", description: "", active: true, upsell_ids: [] }); setEo("new"); };
  const startEO = o => { setOf2({ ...o, upsell_ids: o.upsell_ids || [] }); setEo(o.id); };
  const saveO = async () => {
    const d = { tenant_id: tenantId, service: of2.service, prix: Number(of2.prix) || 0, type_tarif: of2.type_tarif || "duree", duree_minutes: of2.type_tarif === "seances" ? null : Number(of2.duree_minutes) || 60, nb_seances: of2.type_tarif === "seances" ? Number(of2.nb_seances) || null : null, category_id: of2.category_id || null, promo: of2.promo || null, description: of2.description || null, active: of2.active !== false, upsell_ids: of2.upsell_ids || [] };
    if (eo === "new") await SB.post("offers", d, token); else await SB.patch("offers", `id=eq.${eo}`, d, token);
    setEo(null); setOf2({}); onRefresh();
  };
  const delO   = async id => { if (!window.confirm("Supprimer ?")) return; await SB.del("offers", id, token); onRefresh(); };
  const togO   = async o  => { await SB.patch("offers", `id=eq.${o.id}`, { active: !o.active }, token); onRefresh(); };

  const ocs = id => id === "none" ? offers.filter(o => !o.category_id) : offers.filter(o => o.category_id === id);
  const cats2 = [...categories, { id: "none", nom: "Sans catégorie" }];

  return (
    <div className="fade">
      <div className="sh">
        <div><div className="ey">Catalogue</div><div className="st">Services</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn bg2 sm" onClick={() => { setEc("new"); setCf({ nom: "", description: "" }); }}>+ Catégorie</button>
          <button className="btn bp" onClick={() => startO()}>+ Service</button>
        </div>
      </div>

      {ec && (
        <div className="card cp" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{ec === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="g2">
            <div><label className="lbl">Nom *</label><input className="inp ism" value={cf.nom || ""} onChange={e => setCf(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Visage, Corps, Ongles" /></div>
            <div><label className="lbl">Description</label><input className="inp ism" value={cf.description || ""} onChange={e => setCf(f => ({ ...f, description: e.target.value }))} placeholder="Optionnel" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn bg2" onClick={() => setEc(null)}>Annuler</button>
            <button className="btn bp" onClick={saveCat} disabled={!cf.nom}>Enregistrer</button>
          </div>
        </div>
      )}

      {eo && (
        <div className="card cp" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{eo === "new" ? "Nouveau service" : "Modifier le service"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="g2">
            <div><label className="lbl">Nom du service *</label><input className="inp ism" value={of2.service || ""} onChange={e => setOf2(f => ({ ...f, service: e.target.value }))} placeholder="Ex : Soin hydratant visage" /></div>
            <div><label className="lbl">Prix (MAD) *</label><input type="number" className="inp ism" value={of2.prix || ""} onChange={e => setOf2(f => ({ ...f, prix: e.target.value }))} placeholder="350" /></div>
            <div>
              <label className="lbl">Type de tarification</label>
              <select className="sel" value={of2.type_tarif || "duree"} onChange={e => setOf2(f => ({ ...f, type_tarif: e.target.value }))}>
                <option value="duree">À la durée (ex : 90 min)</option>
                <option value="seances">En séances (ex : pack 5 séances)</option>
              </select>
            </div>
            {of2.type_tarif === "seances"
              ? <div><label className="lbl">Nombre de séances</label><input type="number" className="inp ism" value={of2.nb_seances || ""} onChange={e => setOf2(f => ({ ...f, nb_seances: e.target.value }))} placeholder="5" /></div>
              : <div><label className="lbl">Durée (minutes)</label><input type="number" className="inp ism" value={of2.duree_minutes || ""} onChange={e => setOf2(f => ({ ...f, duree_minutes: e.target.value }))} placeholder="60" /></div>
            }
            <div>
              <label className="lbl">Catégorie</label>
              <select className="sel" value={of2.category_id || ""} onChange={e => setOf2(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Sans catégorie</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div><label className="lbl">Promotion</label><input className="inp ism" value={of2.promo || ""} onChange={e => setOf2(f => ({ ...f, promo: e.target.value }))} placeholder="-20% ce mois" /></div>
            <div style={{ gridColumn: "1/-1" }}><label className="lbl">Description</label><textarea className="inp ism" rows={2} value={of2.description || ""} onChange={e => setOf2(f => ({ ...f, description: e.target.value }))} style={{ resize: "vertical" }} /></div>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="lbl">Upsells suggérés (services complémentaires)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                {offers.filter(o => o.id !== eo).map(o => { const sel = (of2.upsell_ids || []).includes(o.id); return (
                  <button key={o.id} type="button" className="btn bg2 sm" style={sel ? { background: "var(--brs)", color: "var(--br)", borderColor: "var(--br)" } : {}} onClick={() => setOf2(f => ({ ...f, upsell_ids: sel ? (f.upsell_ids || []).filter(id => id !== o.id) : [...(f.upsell_ids || []), o.id] }))}>
                    {o.service}
                  </button>
                ); })}
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={of2.active !== false} onChange={e => setOf2(f => ({ ...f, active: e.target.checked }))} /> Service actif
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn bg2" onClick={() => setEo(null)}>Annuler</button>
            <button className="btn bp" onClick={saveO} disabled={!of2.service || !of2.prix}>Enregistrer</button>
          </div>
        </div>
      )}

      {cats2.map(cat => {
        const co = ocs(cat.id);
        if (co.length === 0 && cat.id === "none") return null;
        return (
          <div key={cat.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", textTransform: "uppercase", letterSpacing: ".12em" }}>{cat.nom}</div>
              <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: "var(--rp)", background: "var(--s2)", color: "var(--i3)" }}>{co.length}</span>
              {cat.id !== "none" && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
                  <button className="btn bg2 sm" onClick={() => startO(cat.id)}>+ Service</button>
                  <button className="btn bg2 sm" onClick={() => { setEc(cat.id); setCf({ nom: cat.nom, description: cat.description || "" }); }}>Modifier</button>
                  <button className="btn bg2 sm" style={{ color: "var(--rd)" }} onClick={() => delCat(cat.id)}>Suppr.</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {co.map(o => (
                <div key={o.id} className="card" style={{ padding: "11px 14px", opacity: o.active ? 1 : .55, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{o.service}</span>
                      {!o.active && <span className="pill" style={{ background: "var(--rds)", color: "var(--rd)" }}>Inactif</span>}
                      {o.promo && <span className="pill" style={{ background: "var(--ams)", color: "var(--am)" }}>{o.promo}</span>}
                      <span className="pill" style={{ background: "var(--s2)", color: "var(--i3)" }}>
                        {o.type_tarif === "seances" ? `${o.nb_seances} séance${o.nb_seances > 1 ? "s" : ""}` : `${o.duree_minutes} min`}
                      </span>
                    </div>
                    {o.description && <div style={{ fontSize: 11, color: "var(--i3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>{o.description}</div>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--br)", fontFamily: "var(--mn)", whiteSpace: "nowrap" }}>{Number(o.prix).toLocaleString("fr-FR")} MAD</div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button className="btn bg2 sm" onClick={() => togO(o)}>{o.active ? "Désactiver" : "Activer"}</button>
                    <button className="btn bg2 sm" onClick={() => startEO(o)}>Modifier</button>
                    <button className="btn bg2 sm" style={{ color: "var(--rd)", borderColor: "var(--rd)" }} onClick={() => delO(o.id)}>✕</button>
                  </div>
                </div>
              ))}
              {co.length === 0 && <div style={{ padding: "11px 14px", fontSize: 13, color: "var(--i3)", borderRadius: "var(--r3)", border: "1px dashed var(--ln)" }}>Aucun service dans cette catégorie.</div>}
            </div>
          </div>
        );
      })}
      {offers.length === 0 && !eo && <div style={{ textAlign: "center", padding: 48, color: "var(--i3)", fontSize: 14 }}>Créez d'abord une catégorie, puis ajoutez vos services.</div>}
    </div>
  );
}

// ─── PERSONNEL ────────────────────────────────────────────────────────────────
function PersonnelTab({ personnel, offers, tenantId, plan, token, onRefresh }) {
  const [ed, setEd] = useState(null); const [fm, setFm] = useState({});
  const pi     = PLANS[plan] || PLANS.starter;
  const actifs = personnel.filter(p => p.statut !== "inactif").length;
  const canAdd = !pi.praticienLimit || actifs < pi.praticienLimit;
  const AC = ["#1D9E75", "#2A6FDB", "#C97A2F", "#C0392B", "#7A4FBF", "#E89B5A", "#156A4D", "#185FA5"];

  const start = (p = null) => { setFm(p ? { ...p, services_ids: p.services_ids || [] } : { prenom: "", nom: "", services_ids: [], statut: "actif", couleur: AC[personnel.length % AC.length] }); setEd(p ? p.id : "new"); };
  const save  = async () => { const d = { tenant_id: tenantId, ...fm }; if (ed === "new") await SB.post("personnel", d, token); else await SB.patch("personnel", `id=eq.${ed}`, d, token); setEd(null); onRefresh(); };
  const del   = async id => { if (!window.confirm("Supprimer ?")) return; await SB.del("personnel", id, token); onRefresh(); };
  const togS  = async p => { const nx = p.statut === "actif" ? "conge" : p.statut === "conge" ? "inactif" : "actif"; await SB.patch("personnel", `id=eq.${p.id}`, { statut: nx }, token); onRefresh(); };

  const sc = { actif: "var(--br)", conge: "var(--am)", inactif: "var(--i3)" };
  const sl = { actif: "Actif", conge: "En congé", inactif: "Inactif" };

  return (
    <div className="fade">
      <div className="sh">
        <div><div className="ey">Équipe</div><div className="st">Personnel</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {pi.praticienLimit && <span style={{ fontFamily: "var(--mn)", fontSize: 11, color: "var(--i3)" }}>{actifs} / {pi.praticienLimit} praticiens</span>}
          {canAdd
            ? <button className="btn bp" onClick={() => start()}>+ Praticien</button>
            : <span style={{ fontSize: 12, color: "var(--am)" }}>Limite atteinte — passez au plan supérieur</span>
          }
        </div>
      </div>

      {ed && (
        <div className="card cp" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{ed === "new" ? "Nouveau praticien" : "Modifier"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="g2">
            <div><label className="lbl">Prénom *</label><input className="inp ism" value={fm.prenom || ""} onChange={e => setFm(f => ({ ...f, prenom: e.target.value }))} placeholder="Karima" /></div>
            <div><label className="lbl">Nom</label><input className="inp ism" value={fm.nom || ""} onChange={e => setFm(f => ({ ...f, nom: e.target.value }))} placeholder="Benali" /></div>
            <div><label className="lbl">Statut</label><select className="sel" value={fm.statut || "actif"} onChange={e => setFm(f => ({ ...f, statut: e.target.value }))}><option value="actif">Actif</option><option value="conge">En congé</option><option value="inactif">Inactif</option></select></div>
            <div><label className="lbl">Couleur avatar</label><div style={{ display: "flex", gap: 5, marginTop: 4 }}>{AC.map(c => <div key={c} onClick={() => setFm(f => ({ ...f, couleur: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: fm.couleur === c ? "3px solid var(--ink)" : "3px solid transparent" }} />)}</div></div>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="lbl">Services pratiqués</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                {offers.map(o => { const sel = (fm.services_ids || []).includes(o.id); return (
                  <button key={o.id} type="button" className="btn bg2 sm" style={sel ? { background: "var(--brs)", color: "var(--br)", borderColor: "var(--br)" } : {}} onClick={() => setFm(f => ({ ...f, services_ids: sel ? (f.services_ids || []).filter(id => id !== o.id) : [...(f.services_ids || []), o.id] }))}>
                    {o.service}
                  </button>
                ); })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn bg2" onClick={() => setEd(null)}>Annuler</button>
            <button className="btn bp" onClick={save} disabled={!fm.prenom}>Enregistrer</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
        {personnel.map(p => {
          const svcs = offers.filter(o => (p.services_ids || []).includes(o.id));
          return (
            <div key={p.id} className="card cp" style={{ opacity: p.statut === "inactif" ? .5 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 11 }}>
                <Av prenom={p.prenom} nom={p.nom} size={42} couleur={p.couleur} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.prenom} {p.nom || ""}</div>
                  <span className="pill" style={{ background: `${sc[p.statut] || "var(--i3)"}15`, color: sc[p.statut] || "var(--i3)" }}>{sl[p.statut] || p.statut}</span>
                </div>
              </div>
              {svcs.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>{svcs.map(s => <span key={s.id} className="pill" style={{ background: "var(--s2)", color: "var(--i2)" }}>{s.service}</span>)}</div>}
              <div style={{ display: "flex", gap: 5, borderTop: "1px solid var(--ln)", paddingTop: 10 }}>
                <button className="btn bg2 sm" onClick={() => togS(p)}>{p.statut === "actif" ? "Congé" : p.statut === "conge" ? "Réactiver" : "Activer"}</button>
                <button className="btn bg2 sm" onClick={() => start(p)}>Modifier</button>
                <button className="btn bg2 sm" style={{ color: "var(--rd)", borderColor: "var(--rd)", marginLeft: "auto" }} onClick={() => del(p.id)}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
      {personnel.length === 0 && !ed && <div style={{ textAlign: "center", padding: 48, color: "var(--i3)", fontSize: 14 }}>Ajoutez votre première praticienne ou votre équipe.</div>}
    </div>
  );
}

// ─── HORAIRES ─────────────────────────────────────────────────────────────────
function HorairesTab({ availability, tenantId, token, onRefresh }) {
  const [ed, setEd] = useState(null); const [fm, setFm] = useState({});
  const save = async dow => {
    const ex = availability.find(a => a.day_of_week === dow);
    const d = { tenant_id: tenantId, day_of_week: dow, start_time: fm.s || "09:00", end_time: fm.e || "19:00", is_closed: fm.c || false };
    if (ex) await SB.patch("availability", `id=eq.${ex.id}`, d, token); else await SB.post("availability", d, token);
    setEd(null); onRefresh();
  };
  const today = tzNow().getDay();
  return (
    <div className="fade">
      <div className="sh"><div><div className="ey">Planning</div><div className="st">Horaires d'ouverture</div></div></div>
      <div className="card" style={{ overflow: "hidden" }}>
        {JOURS.map((name, dow) => {
          const av = availability.find(a => a.day_of_week === dow); const isEd = ed === dow; const isT = today === dow;
          return (
            <div key={dow} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--ln)", opacity: av?.is_closed ? .5 : 1, background: isT ? "var(--brs)" : "transparent" }}>
              <div style={{ width: 104, fontWeight: isT ? 700 : 500, fontSize: 14, color: isT ? "var(--br)" : "var(--ink)" }}>{name}</div>
              {!isEd && (<>
                <div style={{ flex: 1 }}>
                  {!av ? <span style={{ fontSize: 13, color: "var(--i3)" }}>—</span>
                    : av.is_closed ? <span className="pill" style={{ background: "var(--rds)", color: "var(--rd)" }}>Fermé</span>
                    : <span style={{ fontFamily: "var(--mn)", fontSize: 13, color: "var(--i2)", fontWeight: 500 }}>{av.start_time?.slice(0, 5)} → {av.end_time?.slice(0, 5)}</span>}
                </div>
                <button className="btn bg2 sm" onClick={() => { setFm({ s: av?.start_time?.slice(0, 5) || "09:00", e: av?.end_time?.slice(0, 5) || "19:00", c: av?.is_closed || false }); setEd(dow); }}>Modifier</button>
              </>)}
              {isEd && (
                <div style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
                  <input type="time" className="inp ism" style={{ width: 112 }} value={fm.s} onChange={e => setFm(f => ({ ...f, s: e.target.value }))} />
                  <span style={{ color: "var(--i3)" }}>→</span>
                  <input type="time" className="inp ism" style={{ width: 112 }} value={fm.e} onChange={e => setFm(f => ({ ...f, e: e.target.value }))} />
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={fm.c || false} onChange={e => setFm(f => ({ ...f, c: e.target.checked }))} /> Fermé</label>
                  <button className="btn bp sm" onClick={() => save(dow)}>OK</button>
                  <button className="btn bg2 sm" onClick={() => setEd(null)}>Annuler</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LIVE ─────────────────────────────────────────────────────────────────────
const TMPLS = ["Votre rendez-vous est confirmé ✅", "Nous sommes complets pour ce créneau, souhaitez-vous une autre date ?", "Bonjour ! Je vous recontacte dans quelques instants.", "Merci de votre confiance 🙏 À bientôt !", "Quel service souhaitez-vous réserver ?", "Votre demande est bien enregistrée."];

function ConvLive({ phone, name, tenantId, tenant, token, onBack, onTenantRefresh }) {
  const [msgs, setMsgs] = useState([]); const [rep, setRep] = useState(""); const [snd, setSnd] = useState(false); const [pau, setPau] = useState(false); const [mode, setMode] = useState("saas");
  const bRef = useRef(null); const pollRef = useRef(null);
  const bp = (tenant?.paused_phones || []).includes(phone);

  const load = useCallback(async () => { const d = await SB.get("conversations", `tenant_id=eq.${tenantId}&customer_phone=eq.${encodeURIComponent(phone)}&order=timestamp.asc&limit=100`, token); if (Array.isArray(d)) setMsgs(d); }, [phone, tenantId, token]);
  useEffect(() => { load(); pollRef.current = setInterval(load, 3000); return () => clearInterval(pollRef.current); }, [load]);
  useEffect(() => { msgs.length > 0 && bRef.current?.scrollIntoView({ behavior: "auto" }); }, [msgs]);

  const pause  = async () => { setPau(true); const p = [...(tenant?.paused_phones || [])]; if (!p.includes(phone)) p.push(phone); await SB.patch("tenants", `id=eq.${tenantId}`, { paused_phones: p }, token); await onTenantRefresh(); setPau(false); };
  const resume = async () => { setPau(true); const p = (tenant?.paused_phones || []).filter(x => x !== phone); await SB.patch("tenants", `id=eq.${tenantId}`, { paused_phones: p }, token); await onTenantRefresh(); setPau(false); };

  const send = async () => {
    if (!rep.trim()) return; setSnd(true);
    try {
      const pnd = await SB.get("conversations", `tenant_id=eq.${tenantId}&customer_phone=eq.${encodeURIComponent(phone)}&bot_response=is.null&order=timestamp.desc&limit=1`, token);
      if (pnd?.length > 0) await SB.patch("conversations", `id=eq.${pnd[0].id}`, { bot_response: rep, reply_channel: "saas" }, token);
      else await SB.post("conversations", { tenant_id: tenantId, customer_phone: phone, customer_name: name, client_message: null, bot_response: rep, reply_channel: "saas", booking_link_sent: "non" }, token);
      await fetch(N8N_WH, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: phone, from: tenant?.phone_whatsapp, message: rep }) });
      setRep(""); await load();
    } catch { alert("Erreur envoi"); }
    setSnd(false);
  };

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 11, borderBottom: "1px solid var(--ln)", marginBottom: 11, flexShrink: 0 }}>
        <button className="btn bg2 sm" onClick={onBack}>← Retour</button>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{name || phone}</div><div style={{ fontSize: 10, color: "var(--i3)", fontFamily: "var(--mn)" }}>{phone}</div></div>
        <span className="pill" style={{ background: bp ? "var(--ams)" : "var(--brs)", color: bp ? "var(--am)" : "var(--br)" }}>{bp ? "⏸ Pause" : "🤖 Bot actif"}</span>
        {!bp ? <button className="btn bg2 sm" style={{ color: "var(--am)", borderColor: "var(--am)" }} onClick={pause} disabled={pau}>{pau ? "..." : "Pause bot"}</button>
             : <button className="btn bp sm" onClick={resume} disabled={pau}>{pau ? "..." : "Reprendre bot"}</button>}
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
        {msgs.map(m => (
          <div key={m.id}>
            {m.client_message && <div style={{ display: "flex", justifyContent: "flex-start" }}><div className="cc"><div className="bc">{m.client_message}</div><div className="bts">👤 Client · {fmtFull(m.timestamp)}</div></div></div>}
            {m.bot_response   && <div style={{ display: "flex", justifyContent: "flex-end" }}><div className="cc"><div className={`bb ${m.reply_channel ? "sal" : "bot"}`}>{m.bot_response}</div><div className="bts" style={{ textAlign: "right" }}>{m.reply_channel ? "🧑‍💼 Salon" : "🤖 Nora"} · {fmtFull(m.timestamp)}</div></div></div>}
          </div>
        ))}
        {msgs.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--i3)", fontSize: 13 }}>Aucun message.</div>}
        <div ref={bRef} />
      </div>

      {bp && (
        <div style={{ borderTop: "1px solid var(--ln)", paddingTop: 11, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
            {[["saas", "💻 Répondre ici"], ["whatsapp", "📱 Via WhatsApp"]].map(([v, l]) => (
              <button key={v} className="btn bg2 sm" style={mode === v ? { background: "var(--brs)", color: "var(--br)", borderColor: "var(--br)" } : {}} onClick={() => setMode(v)}>{l}</button>
            ))}
          </div>
          {mode === "saas" ? (
            <>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 7 }}>
                {TMPLS.map((t, i) => <button key={i} className="btn bg2 sm" style={{ fontSize: 11 }} onClick={() => setRep(t)}>{t.slice(0, 28)}{t.length > 28 ? "…" : ""}</button>)}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <textarea className="inp" value={rep} onChange={e => setRep(e.target.value)} placeholder="Votre réponse..." rows={2} style={{ resize: "none", flex: 1 }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button className="btn bp" onClick={send} disabled={snd || !rep.trim()} style={{ alignSelf: "flex-end", padding: "9px 13px" }}>{snd ? "..." : "Envoyer"}</button>
              </div>
            </>
          ) : (
            <div style={{ background: "var(--ams)", border: "1px solid rgba(201,122,47,.3)", borderRadius: "var(--r1)", padding: "9px 12px", fontSize: 12, color: "var(--am)" }}>
              ⚠️ Répondez depuis WhatsApp. Les messages ne seront pas enregistrés. Pensez à cliquer "Reprendre bot" une fois terminé.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LiveTab({ conversations, tenantId, tenant, token, onTenantRefresh, plan }) {
  const [sel, setSel] = useState(null); const [res, setRes] = useState(null);
  const paused = tenant?.paused_phones || []; const now = new Date();

  if (!hasFeat(plan, "live")) return (
    <div className="fade" style={{ textAlign: "center", padding: 64 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Live disponible en plan Pro et supérieur</div>
      <div style={{ fontSize: 13, color: "var(--i3)" }}>Pausez le bot, répondez manuellement, gérez vos conversations en temps réel.</div>
    </div>
  );

  const byP = {}; [...conversations].forEach(c => { if (!byP[c.customer_phone] || new Date(c.timestamp) > new Date(byP[c.customer_phone].timestamp)) byP[c.customer_phone] = c; });
  const live = Object.values(byP).filter(c => (now - new Date(c.timestamp)) / 60000 <= 30).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const pausedActive = paused.filter(p => byP[p]);

  const handleResume = async (e, phone) => { e.stopPropagation(); setRes(phone); const p = paused.filter(x => x !== phone); await SB.patch("tenants", `id=eq.${tenantId}`, { paused_phones: p }, token); await onTenantRefresh(); setRes(null); };

  if (sel) return <ConvLive phone={sel.phone} name={sel.name} tenantId={tenantId} tenant={tenant} token={token} onBack={() => setSel(null)} onTenantRefresh={onTenantRefresh} />;

  return (
    <div className="fade">
      <div className="sh"><div><div className="ey">Temps réel</div><div className="st">Conversations live</div></div><span style={{ fontFamily: "var(--mn)", fontSize: 12, color: live.length > 0 ? "var(--br)" : "var(--i3)" }}>{live.length} active{live.length > 1 ? "s" : ""}</span></div>

      {pausedActive.length > 0 && (
        <div style={{ background: "var(--ams)", border: "1px solid rgba(201,122,47,.35)", borderRadius: "var(--r3)", padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--am)", marginBottom: 8 }}>⏸ {pausedActive.length} bot{pausedActive.length > 1 ? "s" : ""} en pause</div>
          {pausedActive.map(phone => { const c = byP[phone]; return (
            <div key={phone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,122,47,.07)", borderRadius: "var(--r1)", padding: "8px 12px", marginTop: 5 }}>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>{c?.customer_name || phone}</div><div style={{ fontSize: 10, color: "var(--i3)", fontFamily: "var(--mn)" }}>{phone}</div></div>
              <button className="btn bp sm" onClick={e => handleResume(e, phone)} disabled={res === phone}>{res === phone ? "..." : "Reprendre bot"}</button>
            </div>
          ); })}
        </div>
      )}

      {live.length === 0
        ? <div style={{ textAlign: "center", padding: 56, color: "var(--i3)" }}><div style={{ fontSize: 32, marginBottom: 10 }}>💬</div><div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucune conversation en cours</div><div style={{ fontSize: 12 }}>Les conversations des 30 dernières minutes apparaissent ici.</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {live.map(c => { const isPaused = paused.includes(c.customer_phone); const diff = Math.round((now - new Date(c.timestamp)) / 60000); return (
              <div key={c.customer_phone} className="card" style={{ padding: "12px 16px", cursor: "pointer", borderColor: isPaused ? "var(--am)" : "var(--ln)" }} onClick={() => setSel({ phone: c.customer_phone, name: c.customer_name })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: isPaused ? "var(--am)" : "var(--br)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.customer_name || c.customer_phone}</span>
                    {isPaused && <span className="pill" style={{ background: "var(--ams)", color: "var(--am)" }}>⏸ Pause</span>}
                  </div>
                  <span style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)" }}>il y a {diff} min</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--i2)", paddingLeft: 15 }}>{c.bot_response ? `${c.reply_channel ? "🧑‍💼" : "🤖"} ${c.bot_response.slice(0, 90)}` : c.client_message ? `👤 ${c.client_message.slice(0, 90)}` : ""}</div>
              </div>
            ); })}
          </div>
      }
    </div>
  );
}

// ─── HISTORIQUE ───────────────────────────────────────────────────────────────
function HistoriqueTab({ conversations, appointments }) {
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all"); const [df, setDf] = useState(""); const [dt, setDt] = useState(""); const [sel, setSel] = useState(null);
  const SE = { positif: "😊", "négatif": "😤", neutre: "😐" };

  const byP = {}; [...conversations].forEach(c => { if (!byP[c.customer_phone] || new Date(c.timestamp) > new Date(byP[c.customer_phone].timestamp)) byP[c.customer_phone] = c; });
  let uniq = Object.values(byP).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (search)          uniq = uniq.filter(c => (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (c.customer_phone || "").includes(search));
  if (filter === "lien")    uniq = uniq.filter(c => c.booking_link_sent === "oui");
  if (filter === "positif") uniq = uniq.filter(c => c.sentiment === "positif");
  if (filter === "negatif") uniq = uniq.filter(c => c.sentiment === "négatif");
  if (df) uniq = uniq.filter(c => new Date(c.timestamp) >= new Date(df));
  if (dt) uniq = uniq.filter(c => new Date(c.timestamp) <= new Date(dt + "T23:59:59"));

  const csv = () => exportCSV(uniq.map(c => ({ Client: c.customer_name || "", Téléphone: c.customer_phone || "", Dernière: fmtD(c.timestamp, { day: "2-digit", month: "2-digit", year: "numeric" }), Sentiment: c.sentiment || "", Lien: c.booking_link_sent || "" })), "historique-nora.csv");

  if (sel) {
    const msgs    = conversations.filter(c => c.customer_phone === sel.phone).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const rdvCli  = appointments.filter(a => a.customer_phone === sel.phone).sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    return (
      <div className="fade">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button className="btn bg2 sm" onClick={() => setSel(null)}>← Retour</button>
          <div><div style={{ fontSize: 14, fontWeight: 700 }}>{sel.name || sel.phone}</div><div style={{ fontSize: 10, color: "var(--i3)", fontFamily: "var(--mn)" }}>{msgs.length} échanges · {sel.phone}</div></div>
        </div>
        {rdvCli.length > 0 && (
          <div className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
            <div className="ch"><span style={{ fontSize: 12, fontWeight: 600 }}>Rendez-vous de ce client</span></div>
            <table className="tbl"><thead><tr><th>Service</th><th>Date</th><th>Statut</th></tr></thead>
              <tbody>{rdvCli.slice(0, 5).map(a => <tr key={a.id}><td>{a.service_name}</td><td style={{ fontFamily: "var(--mn)", fontSize: 11 }}>{fmtD(a.scheduled_at, { day: "2-digit", month: "short", year: "numeric" })}</td><td><SPill status={a.status} /></td></tr>)}</tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {msgs.map(m => (
            <div key={m.id} className="card" style={{ padding: 13 }}>
              <div style={{ fontSize: 10, color: "var(--i3)", fontFamily: "var(--mn)", marginBottom: 5 }}>{fmtFull(m.timestamp)}</div>
              {m.client_message && <div style={{ fontSize: 13, color: "var(--i2)", marginBottom: 4 }}>👤 {m.client_message}</div>}
              {m.bot_response   && <div style={{ fontSize: 13 }}>{m.reply_channel ? "🧑‍💼" : "🤖"} {m.bot_response}</div>}
              <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                {m.booking_link_sent === "oui" && <span className="pill" style={{ background: "var(--brs)", color: "var(--br)" }}>Lien envoyé</span>}
                {m.interest && <span className="pill" style={{ background: "var(--bls)", color: "var(--bl)" }}>{m.interest}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade">
      <div className="sh"><div><div className="ey">Clients</div><div className="st">Historique</div></div><button className="btn bg2 sm" onClick={csv}>⬇ CSV</button></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input className="inp ism" style={{ maxWidth: 190 }} placeholder="🔍 Nom ou numéro..." value={search} onChange={e => setSearch(e.target.value)} />
        <input type="date" className="inp ism" style={{ maxWidth: 136 }} value={df} onChange={e => setDf(e.target.value)} />
        <span style={{ alignSelf: "center", color: "var(--i3)", fontSize: 12 }}>→</span>
        <input type="date" className="inp ism" style={{ maxWidth: 136 }} value={dt} onChange={e => setDt(e.target.value)} />
        {(df || dt) && <button className="btn bg2 sm" onClick={() => { setDf(""); setDt(""); }}>✕</button>}
      </div>
      <div className="fts" style={{ marginBottom: 12 }}>
        {[["all", "Tous"], ["lien", "Lien envoyé"], ["positif", "Positif 😊"], ["negatif", "Négatif 😤"]].map(([v, l]) => (
          <button key={v} className={`ft ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>Client</th><th>Dernière conv.</th><th>Sentiment</th><th>Lien</th><th>Intérêt</th></tr></thead>
          <tbody>
            {uniq.slice(0, 200).map(c => (
              <tr key={c.customer_phone} style={{ cursor: "pointer" }} onClick={() => setSel({ phone: c.customer_phone, name: c.customer_name })}>
                <td><div style={{ fontWeight: 600 }}>{c.customer_name || "—"}</div><div style={{ fontSize: 10, color: "var(--i3)", fontFamily: "var(--mn)" }}>{c.customer_phone}</div></td>
                <td style={{ fontFamily: "var(--mn)", fontSize: 11 }}>{fmtD(c.timestamp, { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td>{SE[c.sentiment] || "—"} <span style={{ fontSize: 11, color: "var(--i3)" }}>{c.sentiment || ""}</span></td>
                <td>{c.booking_link_sent === "oui" ? <span className="pill" style={{ background: "var(--brs)", color: "var(--br)" }}>Oui</span> : "—"}</td>
                <td style={{ fontSize: 11, color: "var(--i2)" }}>{c.interest || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {uniq.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--i3)", fontSize: 13 }}>Aucune conversation trouvée.</div>}
      </div>
      <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", marginTop: 6 }}>{uniq.length} clients</div>
    </div>
  );
}

// ─── ABONNEMENT ───────────────────────────────────────────────────────────────
function AbonnementTab({ tenant, conversations }) {
  const plan   = tenant?.plan || "trial";
  const pi     = PLANS[plan] || PLANS.starter;
  const [period, setPeriod] = useState("m");
  const mult   = period === "m" ? 1 : period === "6" ? .85 : .75;

  const trL      = daysLeft(tenant?.trial_ends_at);
  const inTrial  = plan === "trial" && trL !== null && trL >= 0;
  const convM    = conversations.filter(c => new Date(c.timestamp) >= startOM()).length;
  const cliM     = new Set(conversations.filter(c => new Date(c.timestamp) >= startOM()).map(c => c.customer_phone)).size;
  const cpct     = pi.convLimit ? Math.min(Math.round((convM / pi.convLimit) * 100), 100) : 0;
  const cc       = cpct > 90 ? "var(--rd)" : cpct > 70 ? "var(--am)" : "var(--br)";

  const ALL_PLANS = [
    { key: "starter",    label: "Starter",    angle: "Je démarre",              base: 399,  convLimit: 300,  praticiens: "1 praticien · 1 établissement",
      feats: ["Bot WhatsApp FR · AR · Darija", "Réservation automatique 24h/24", "Confirmation & rappels par mail", "Gestion annulations & modifications", "Dashboard & KPIs de base"],
      locked: ["Relances clients inactifs", "Demande d'avis Google post-RDV", "Newsletter clients", "Analytics offres", "Live + pause bot", "Export CSV"] },
    { key: "pro",        label: "Pro",         angle: "Je veux plus de clients", base: 599,  convLimit: 1000, praticiens: "5 praticiens · 1 établissement",
      feats: ["Tout Starter", "Relances clients inactifs par mail", "Demande d'avis Google après RDV", "Newsletter clients par mail", "Analytics offres (top services, heures creuses)", "Live + pause bot par client", "Historique clients enrichi + export CSV"],
      locked: ["Analytics prédictif & promos IA", "Programme fidélité points", "Rapport mensuel PDF", "Bot personnalisé (ton + script)", "Jusqu'à 3 établissements", "API & webhooks"] },
    { key: "business",   label: "Business",    angle: "Je pilote mon activité",  base: 999,  convLimit: null, praticiens: "Personnel illimité · 3 établissements",
      feats: ["Tout Pro", "Analytics prédictif — créneaux vides & suggestions promos", "Gestion promos & offres flash via le bot", "Programme fidélité points", "Rapport mensuel PDF automatique par mail", "Bot personnalisé — ton, nom, script propre", "API & webhooks", "Support prioritaire"],
      locked: [] },
    { key: "sur_mesure", label: "Sur mesure",  angle: "Groupe & franchise",      base: null, convLimit: null, praticiens: "Illimité · établissements illimités",
      feats: ["Tout Business", "Établissements illimités", "Volume conversations négocié", "SLA garanti 99,9%", "Account manager dédié", "Formation équipe sur mesure", "Facturation personnalisée", "Support 7j/7"],
      locked: [] },
  ];

  const INVOICES = [
    { date: "01 mai 2026", desc: "Plan Pro · Mensuel", mt: "599 MAD", s: "Payé" },
    { date: "01 avr. 2026", desc: "Plan Pro · Mensuel", mt: "599 MAD", s: "Payé" },
    { date: "01 mar. 2026", desc: "Plan Pro · Mensuel", mt: "599 MAD", s: "Payé" },
    { date: "Démarrage",    desc: "Essai gratuit — 14 jours", mt: "0 MAD", s: "Gratuit" },
  ];

  return (
    <div className="fade">
      <div className="sh"><div><div className="ey">Facturation</div><div className="st">Mon abonnement</div></div></div>

      {inTrial && (
        <div style={{ background: "var(--brs)", border: "1px solid rgba(29,158,117,.3)", borderRadius: "var(--r3)", padding: "14px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--br)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--brdk)" }}>Période d'essai gratuite en cours</div>
            <div style={{ fontSize: 12, color: "var(--brdk)", opacity: .8, marginTop: 2 }}>Aucune carte débitée avant la fin de l'essai. Choisissez votre plan ci-dessous.</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--br)", fontFamily: "var(--mn)", lineHeight: 1 }}>{trL}</div>
            <div style={{ fontSize: 10, color: "var(--brdk)", fontFamily: "var(--mn)" }}>jours restants</div>
          </div>
        </div>
      )}

      {!inTrial && (
        <div className="card" style={{ marginBottom: 14, borderColor: pi.color, borderWidth: 1.5 }}>
          <div style={{ padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4 }}>Plan actuel</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.03em", color: pi.color }}>{pi.label}</div>
              <div style={{ fontSize: 12, color: "var(--i3)", fontFamily: "var(--mn)", marginTop: 2 }}>{tenant?.plan_expire_at ? `Renouvellement le ${fmtD(tenant.plan_expire_at, { day: "numeric", month: "long", year: "numeric" })}` : "Actif sans limite"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div className="kl" style={{ marginBottom: 7 }}>Conversations ce mois</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--mn)" }}>{convM}</span>
                  {pi.convLimit && <span style={{ fontSize: 13, color: "var(--i3)" }}>/ {pi.convLimit}</span>}
                </div>
                {pi.convLimit ? (<><div className="ptr" style={{ marginBottom: 4 }}><div className="ptf" style={{ width: `${cpct}%`, background: cc }} /></div><div style={{ fontSize: 10, color: cc, fontFamily: "var(--mn)" }}>{cpct}%{cpct > 90 && " — limite proche !"}</div></>) : <div style={{ fontSize: 12, color: "var(--br)", fontFamily: "var(--mn)" }}>Illimité</div>}
              </div>
              <div>
                <div className="kl" style={{ marginBottom: 7 }}>Clients uniques ce mois</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--mn)" }}>{cliM}</div>
              </div>
            </div>
          </div>
          {cpct > 80 && <div style={{ margin: "0 18px 14px", padding: "9px 13px", background: "var(--ams)", border: "1px solid rgba(201,122,47,.3)", borderRadius: "var(--r1)", fontSize: 12, color: "var(--am)" }}>⚠️ Vous approchez de la limite mensuelle. Contactez-nous pour passer au plan supérieur.</div>}
        </div>
      )}

      <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 10 }}>Changer de plan</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
        {[["m", "Mensuel", null], ["6", "6 mois", "-15%"], ["a", "Annuel", "-25%"]].map(([v, l, r]) => (
          <button key={v} className={`ft ${period === v ? "on" : ""}`} onClick={() => setPeriod(v)}>
            {l}{r && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: "var(--rp)", background: period === v ? "rgba(255,255,255,.2)" : "var(--brs)", color: period === v ? "#fff" : "var(--br)", marginLeft: 5 }}>{r}</span>}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }} className="g2">
        {ALL_PLANS.map(p => {
          const isCur  = plan === p.key;
          const price  = p.base ? Math.round(p.base * mult) : null;
          const oldP   = p.base && period !== "m" ? p.base : null;
          const isDown = ["starter", "pro", "business"].indexOf(p.key) < ["starter", "pro", "business"].indexOf(plan);
          return (
            <div key={p.key} className={`pc ${isCur ? "cur" : ""}`}>
              {isCur && <div className="ptb" style={{ background: "var(--br)", color: "#fff" }}>Plan actuel</div>}
              {!isCur && p.key === "pro" && !["business", "sur_mesure"].includes(plan) && <div className="ptb" style={{ background: "var(--ink)", color: "#fff" }}>Le plus choisi</div>}
              <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", textTransform: "uppercase", letterSpacing: ".12em", marginTop: 12, marginBottom: 4 }}>{p.angle}</div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8, color: isCur ? pi.color : "var(--ink)" }}>{p.label}</div>
              {price
                ? <><div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mn)", lineHeight: 1 }}>{price.toLocaleString("fr-FR")} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--i3)" }}>MAD/mois</span></div>{oldP && <div style={{ fontSize: 11, color: "var(--i3)", textDecoration: "line-through", fontFamily: "var(--mn)", marginTop: 2 }}>{oldP} MAD</div>}</>
                : <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>Devis<br />personnalisé</div>}
              <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", marginTop: 6, marginBottom: 8 }}>
                {p.convLimit ? `${p.convLimit.toLocaleString("fr-FR")} conv./mois` : "Illimité"} · {p.praticiens}
              </div>
              <div style={{ height: 0.5, background: "var(--ln)", margin: "6px 0" }} />
              <ul className="pfl" style={{ marginBottom: 10 }}>
                {p.feats.map((f, i)  => <li key={i}  className={i === 0 && p.key !== "starter" ? "y" : "y"}><span className="ck">✓</span>{f}</li>)}
                {p.locked.map((f, i) => <li key={`l${i}`} className="n"><span className="ck">✗</span>{f}</li>)}
              </ul>
              {isCur
                ? <button className="btn bg2 sm" disabled style={{ width: "100%", justifyContent: "center", opacity: .5 }}>Plan actuel</button>
                : p.key === "sur_mesure"
                  ? <button className="btn bg2 sm" style={{ width: "100%", justifyContent: "center" }}>Nous contacter</button>
                  : isDown
                    ? <button className="btn bg2 sm" style={{ width: "100%", justifyContent: "center" }}>Rétrograder</button>
                    : <button className="btn bp sm" style={{ width: "100%", justifyContent: "center" }}>Passer à {p.label}</button>}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: "var(--i3)", textAlign: "center", marginBottom: 20, fontFamily: "var(--mn)" }}>
        1 conversation = 1 client unique par tranche de 24h · 14 jours gratuits · Résiliable à tout moment
      </div>

      <div style={{ fontFamily: "var(--mn)", fontSize: 10, color: "var(--i3)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 10 }}>Historique des paiements</div>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Description</th><th style={{ textAlign: "right" }}>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {INVOICES.map((inv, i) => (
              <tr key={i}>
                <td style={{ fontFamily: "var(--mn)", fontSize: 11 }}>{inv.date}</td>
                <td>{inv.desc}</td>
                <td style={{ fontFamily: "var(--mn)", fontWeight: 600, textAlign: "right" }}>{inv.mt}</td>
                <td><span className="pill" style={{ background: inv.s === "Payé" ? "var(--brs)" : "var(--s2)", color: inv.s === "Payé" ? "var(--br)" : "var(--i3)" }}>{inv.s}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PARAMÈTRES ───────────────────────────────────────────────────────────────
function ParamsTab({ tenant, token, onRefresh }) {
  const [form, setForm] = useState({ ...tenant }); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [copied, setCopied] = useState(false);

  const save = async () => {
    setSaving(true);
    const { id, created_at, user_id, paused_phones, plan, trial_ends_at, plan_started_at, plan_expire_at, ...rest } = form;
    await SB.patch("tenants", `id=eq.${tenant.id}`, rest, token);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); onRefresh();
  };

  const copy = () => { navigator.clipboard.writeText(tenant.booking_url || `https://book.nora.ma?tenant=${tenant.id}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const FI = [["Nom de l'établissement", "nom_centre", "text"], ["Adresse", "adresse", "text"], ["Tél. gérant", "phone_gerant", "text"], ["Email", "email_gerant", "email"], ["WhatsApp de l'établissement", "phone_whatsapp", "text"]];
  const FB = [["Nom du bot", "nom_bot", "text"], ["Google Maps", "lien_google_maps", "text"], ["Google Review", "lien_google_review", "text"], ["Paiements acceptés", "paiement", "text"], ["Parking", "parking", "text"]];

  return (
    <div className="fade">
      <div className="sh">
        <div><div className="ey">Configuration</div><div className="st">Paramètres</div></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 12, color: "var(--br)", fontFamily: "var(--mn)" }}>✓ Enregistré</span>}
          <button className="btn bp" onClick={save} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card cp">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Lien de réservation</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--s2)", borderRadius: "var(--r1)", padding: "9px 13px" }}>
            <span style={{ fontFamily: "var(--mn)", fontSize: 11, color: "var(--br)", flex: 1, wordBreak: "break-all" }}>{tenant.booking_url || `https://book.nora.ma?tenant=${tenant.id}`}</span>
            <button className="btn bg2 sm" onClick={copy}>{copied ? "✓ Copié !" : "Copier"}</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--i3)", marginTop: 6 }}>Ce lien est envoyé par Nora à vos clients pour réserver en ligne.</div>
        </div>
        <div className="card cp">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Informations de l'établissement</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="g2">
            {FI.map(([l, k, t]) => <div key={k}><label className="lbl">{l}</label><input type={t} className="inp ism" value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>)}
            <div style={{ gridColumn: "1/-1" }}><label className="lbl">Message hors horaires</label><input className="inp ism" value={form.message_ferme || ""} onChange={e => setForm(f => ({ ...f, message_ferme: e.target.value }))} placeholder="Ex : Nous sommes fermés, revenez demain dès 9h !" /></div>
          </div>
        </div>
        <div className="card cp">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Configuration du bot Nora</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="g2">
            {FB.map(([l, k]) => <div key={k}><label className="lbl">{l}</label><input className="inp ism" value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>)}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={form.fidelite || false} onChange={e => setForm(f => ({ ...f, fidelite: e.target.checked }))} /> Programme fidélité</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={form.liste_attente || false} onChange={e => setForm(f => ({ ...f, liste_attente: e.target.checked }))} /> Liste d'attente</label>
          </div>
        </div>
        <div className="card cp">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Intégrations</div>
          <div><label className="lbl">Webhook de notification (n8n)</label><input className="inp ism" value={form.notification_webhook_url || ""} onChange={e => setForm(f => ({ ...f, notification_webhook_url: e.target.value }))} placeholder="https://..." /><div style={{ fontSize: 11, color: "var(--i3)", marginTop: 4 }}>URL appelée à chaque nouveau RDV via le booking web.</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth]         = useState(null);
  const [tenant, setTenant]     = useState(null);
  const [tab, setTab]           = useState("dashboard");
  const [loading, setLoading]   = useState(false);
  const [theme, setTheme]       = useState(() => localStorage.getItem("nora.theme") || "light");
  const [offers, setOffers]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [availability, setAvail]    = useState([]);
  const [appointments, setAppts]    = useState([]);
  const [conversations, setConvs]   = useState([]);
  const [liveConvs, setLiveConvs]   = useState([]);
  const [personnel, setPersonnel]   = useState([]);
  const [stats, setStats]           = useState({ bookingsSent: 0 });

  const token    = auth?.access_token;
  const tenantId = tenant?.id;
  const plan     = tenant?.plan || "trial";

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("nora.theme", theme); }, [theme]);

  useEffect(() => {
    if (!auth) return;
    (async () => {
      setLoading(true);
      try { const t = await SB.get("tenants", `user_id=eq.${auth.user?.id}&select=*`, token); if (t?.length) setTenant(t[0]); else { alert("Aucun établissement associé."); setAuth(null); } }
      catch { setAuth(null); }
      setLoading(false);
    })();
  }, [auth]);

  const loadData = useCallback(async () => {
    if (!tenantId || !token) return;
    try {
      const [off, cats, avail, appts, convs, pers, tFresh] = await Promise.all([
        SB.get("offers",        `tenant_id=eq.${tenantId}&select=*&order=service`,          token),
        SB.get("categories",    `tenant_id=eq.${tenantId}&select=*&order=ordre,nom`,         token),
        SB.get("availability",  `tenant_id=eq.${tenantId}&select=*&order=day_of_week`,       token),
        SB.get("appointments",  `tenant_id=eq.${tenantId}&select=*&order=scheduled_at.desc&limit=500`, token),
        SB.get("conversations", `tenant_id=eq.${tenantId}&select=*&order=timestamp.desc&limit=1000`,   token),
        SB.get("personnel",     `tenant_id=eq.${tenantId}&select=*&order=prenom`,            token),
        SB.get("tenants",       `id=eq.${tenantId}&select=*`,                                token),
      ]);
      setOffers(arr(off)); setCategories(arr(cats)); setAvail(arr(avail));
      setAppts(arr(appts)); setConvs(arr(convs)); setPersonnel(arr(pers));
      if (tFresh?.length) setTenant(tFresh[0]);
      setStats({ bookingsSent: arr(convs).filter(c => c.booking_link_sent === "oui").length });
    } catch (e) { console.error(e); }
  }, [tenantId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshTenant = useCallback(async () => { if (!tenantId || !token) return; const t = await SB.get("tenants", `id=eq.${tenantId}&select=*`, token); if (t?.length) setTenant(t[0]); }, [tenantId, token]);

  useEffect(() => { if (!tenantId || !token) return; const iv = setInterval(refreshTenant, 10000); return () => clearInterval(iv); }, [tenantId, token, refreshTenant]);

  useEffect(() => {
    if (!tenantId || !token) return;
    const iv = setInterval(async () => { const c = await SB.get("conversations", `tenant_id=eq.${tenantId}&select=*&order=timestamp.desc&limit=100`, token); if (Array.isArray(c)) setLiveConvs(c); }, 5000);
    return () => clearInterval(iv);
  }, [tenantId, token]);

  // Notification browser
  useEffect(() => {
    if (!liveConvs.length) return;
    const now = new Date(); const recent = liveConvs.filter(c => (now - new Date(c.timestamp)) < 30000);
    if (recent.length > 0 && document.hidden && Notification.permission === "granted") new Notification("Nora — Nouveau message", { body: recent[0].client_message || "Nouveau message client" });
  }, [liveConvs]);

  if (!auth)           return <><style>{CSS}</style><Login onLogin={setAuth} /></>;
  if (loading || !tenant) return <><style>{CSS}</style><div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><Spin s={40} /></div></>;

  const now = new Date();
  const byP = {}; [...liveConvs].forEach(c => { if (!byP[c.customer_phone] || new Date(c.timestamp) > new Date(byP[c.customer_phone].timestamp)) byP[c.customer_phone] = c; });
  const liveCount  = Object.values(byP).filter(c => (now - new Date(c.timestamp)) / 60000 <= 30).length;
  const pauseCount = (tenant?.paused_phones || []).length;

  const TABS = [
    { id: "dashboard",   icon: "◈", label: "Tableau de bord" },
    { id: "rdv",         icon: "◷", label: "Rendez-vous" },
    { id: "services",    icon: "◆", label: "Services" },
    { id: "personnel",   icon: "◉", label: "Personnel" },
    { id: "horaires",    icon: "◎", label: "Horaires" },
    { id: "live",        icon: "◐", label: "Live", badge: liveCount > 0 ? liveCount : pauseCount > 0 ? "!" : null, badgePause: pauseCount > 0 && liveCount === 0 },
    { id: "historique",  icon: "◑", label: "Historique" },
    { id: "abonnement",  icon: "◇", label: "Abonnement" },
    { id: "params",      icon: "◌", label: "Paramètres" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="ly">
        <aside className="sb">
          <div className="sb-logo">nora<em /></div>
          <div className="sb-ten">{tenant.nom_centre}</div>
          <nav className="sb-nav">
            {TABS.map(t => (
              <button key={t.id} className={`sb-b ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
                <span style={{ fontSize: 16, width: 18, textAlign: "center", flexShrink: 0 }}>{t.icon}</span>
                {t.label}
                {t.badge && <span className={`sb-bx ${t.badgePause ? "w" : ""}`}>{t.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sb-ft">
            <button className="sb-b" onClick={() => setTheme(th => th === "light" ? "dark" : "light")} style={{ fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>{theme === "dark" ? "☀" : "🌙"}</span>{theme === "dark" ? "Mode clair" : "Mode sombre"}
            </button>
            <button className="sb-b" style={{ color: "var(--rd)" }} onClick={() => { setAuth(null); setTenant(null); }}>
              <span style={{ fontSize: 14 }}>←</span>Déconnexion
            </button>
          </div>
        </aside>

        <main className="mn">
          {tab === "dashboard"  && <Dashboard   stats={stats} conversations={conversations} appointments={appointments} tenant={tenant} />}
          {tab === "rdv"        && <RDVTab       appointments={appointments} personnel={personnel} token={token} onRefresh={loadData} />}
          {tab === "services"   && <ServicesTab  offers={offers} categories={categories} tenantId={tenantId} token={token} onRefresh={loadData} />}
          {tab === "personnel"  && <PersonnelTab personnel={personnel} offers={offers} tenantId={tenantId} plan={plan} token={token} onRefresh={loadData} />}
          {tab === "horaires"   && <HorairesTab  availability={availability} tenantId={tenantId} token={token} onRefresh={loadData} />}
          {tab === "live"       && <LiveTab       conversations={liveConvs} tenantId={tenantId} tenant={tenant} token={token} onTenantRefresh={refreshTenant} plan={plan} />}
          {tab === "historique" && <HistoriqueTab conversations={conversations} appointments={appointments} />}
          {tab === "abonnement" && <AbonnementTab tenant={tenant} conversations={conversations} />}
          {tab === "params"     && <ParamsTab     tenant={tenant} token={token} onRefresh={loadData} />}
        </main>

        <nav className="mob-nav">
          {TABS.map(t => (
            <button key={t.id} className={`mob-b ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label.split(" ")[0]}
              {t.badge && <span className="sb-bx" style={{ position: "absolute", top: 1, right: 1, fontSize: 9, padding: "0 3px" }}>{t.badge}</span>}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
