/* global React, I, StatusDot */
const { useState: useS2 } = React;

/* =============== TEMPLATES STUDIO =============== */
function TemplatesScreen() {
  const [selectedSet, setSelectedSet] = useS2(0);
  const sets = [
    { name: "Poster A3 Lifestyle", count: 12, updated: "heute", color: "#f59e0b" },
    { name: "T-Shirt Flat Lay", count: 8, updated: "vor 2 Tagen", color: "#ec4899" },
    { name: "Mug Scenes", count: 6, updated: "vor 1 Woche", color: "#0ea5e9" },
    { name: "Tote Bag Outdoor", count: 4, updated: "vor 2 Wochen", color: "#10b981" },
  ];
  const templates = [
    { n: "Sofa · Hell", bg: "#f4f1eb" },
    { n: "Schlafzimmer", bg: "#e8ddd0" },
    { n: "Minimal Weiß", bg: "#fafafa" },
    { n: "Büro · Holz", bg: "#2d3748" },
    { n: "Flur", bg: "#c5d4c0" },
    { n: "Kinderzimmer", bg: "#f7e4d4" },
    { n: "Regal · Dunkel", bg: "#1a1a1a" },
    { n: "Esstisch", bg: "#d4c5b0" },
    { n: "Küche Retro", bg: "#fde68a" },
    { n: "Lese-Ecke", bg: "#d1c4e9" },
    { n: "Treppenhaus", bg: "#cbd5e1" },
    { n: "Terrasse", bg: "#e7efc4" },
  ];

  return (
    <div style={{ height: "calc(100vh - 100px)", minHeight: 820, display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Vorlagen-Sets</div>
          <button className="btn btn-ghost btn-sm" style={{ padding: 4 }}><I.plus size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 6 }}>
          {sets.map((s, i) => (
            <div key={i} onClick={() => setSelectedSet(i)} style={{
              padding: 10, borderRadius: 6, cursor: "pointer", marginBottom: 2,
              background: selectedSet === i ? "var(--accent-bg)" : "transparent",
              border: selectedSet === i ? "1px solid var(--accent-border)" : "1px solid transparent",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              </div>
              <div className="t-xs subtle">{s.count} Vorlagen · {s.updated}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}><I.upload size={11} /> Import</button>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}><I.download size={11} /> Export</button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Poster A3 Lifestyle</div>
            <div className="t-xs subtle">12 Vorlagen · zuletzt bearbeitet heute 14:32</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm"><I.copy size={12} /> Duplizieren</button>
            <button className="btn btn-accent btn-sm"><I.plus size={12} /> Neue Vorlage</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {templates.map((t, i) => (
              <div key={i} className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}>
                <div style={{ aspectRatio: "3/4", background: t.bg, position: "relative", padding: 20 }}>
                  <div style={{ position: "absolute", inset: "22% 22%", background: "linear-gradient(135deg, #a78bfa, #f472b6)", opacity: 0.75, border: "4px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
                </div>
                <div style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{t.n}</span>
                  <I.moreH size={13} color="var(--fg-subtle)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============== UPSCALER =============== */
function UpscalerScreen() {
  const jobs = [
    { name: "boho-sunset-01.png", from: "1024×1024", to: "4096×4096", status: "done", eta: "—" },
    { name: "mountain-line.png", from: "2048×2048", to: "8192×8192", status: "running", eta: "1:24", progress: 62 },
    { name: "vintage-poster.png", from: "1024×1536", to: "4096×6144", status: "queued", eta: "~3 min" },
    { name: "forest-silhouette.png", from: "1024×1024", to: "4096×4096", status: "queued", eta: "~5 min" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
      <div className="card">
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Upscaler-Queue</div>
            <div className="t-xs subtle">Vertex AI · dein BYOK-Key · 4 Jobs</div>
          </div>
          <button className="btn btn-accent btn-sm"><I.plus size={12} /> Neuer Job</button>
        </div>
        <table className="table">
          <thead><tr><th>Motiv</th><th>Von</th><th>Nach</th><th>Status</th><th>ETA</th><th></th></tr></thead>
          <tbody>
            {jobs.map((j, i) => (
              <tr key={i}>
                <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: `linear-gradient(135deg, #6366f1, #ec4899)` }} />
                  <span style={{ fontWeight: 500 }}>{j.name}</span>
                </td>
                <td className="t-mono subtle">{j.from}</td>
                <td className="t-mono">{j.to} <span className="chip" style={{ fontSize: 10, marginLeft: 6 }}>4×</span></td>
                <td>
                  {j.status === "running" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="progress" style={{ width: 80 }}><div className="progress-fill" style={{ width: `${j.progress}%` }} /></div>
                      <span className="t-xs">{j.progress}%</span>
                    </div>
                  ) : (
                    <span className={`chip chip-${j.status === "done" ? "success" : ""}`} style={{ fontSize: 10 }}>
                      {j.status === "done" ? "Fertig" : "In Queue"}
                    </span>
                  )}
                </td>
                <td className="t-mono t-xs subtle">{j.eta}</td>
                <td><I.moreH size={14} color="var(--fg-subtle)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Neuer Upscale-Job</div>
        <label className="label">Motive auswählen</label>
        <div style={{ border: "1px dashed var(--border-strong)", borderRadius: 8, padding: 24, textAlign: "center", marginBottom: 14 }}>
          <I.upload size={20} color="var(--fg-subtle)" />
          <div className="t-sm" style={{ marginTop: 6 }}>Drag &amp; Drop oder <span style={{ color: "var(--accent)", cursor: "pointer" }}>auswählen</span></div>
        </div>
        <label className="label">Zielauflösung</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
          {["2×", "4×", "8×"].map((x, i) => (
            <button key={i} className={i === 1 ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"} style={{ justifyContent: "center" }}>{x}</button>
          ))}
        </div>
        <label className="label">Modell</label>
        <select className="input" style={{ marginBottom: 14 }}>
          <option>Vertex · imagegeneration@006</option>
          <option>Vertex · imagen-3</option>
        </select>
        <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}><I.sparkles size={13} /> Upscale starten</button>
        <div style={{ marginTop: 14, padding: 10, background: "var(--bg-muted)", borderRadius: 6, fontSize: 11, color: "var(--fg-muted)" }}>
          Geschätzte Kosten: <span className="t-mono" style={{ color: "var(--fg)" }}>~0,08 €</span> pro Motiv. Wird direkt deinem Google-Cloud-Konto belastet.
        </div>
      </div>
    </div>
  );
}

/* =============== ETSY / MARKETING / AUTOMATION / INTEGRATIONS / ACCOUNT =============== */
function EtsyScreen() {
  const listings = [
    { t: "Boho Abstract Form · Minimalist Wall Art", status: "draft", mockups: 8, missing: "Bilder" },
    { t: "Mountain Line · Scandinavian Print", status: "ready", mockups: 8, missing: null },
    { t: "Vintage Sun · Retro Poster", status: "live", mockups: 10, missing: null },
    { t: "Forest Silhouette · Nature Art", status: "draft", mockups: 6, missing: "Tags" },
  ];
  const sm = { draft: "warning", ready: "", live: "success" };
  const lbl = { draft: "Entwurf", ready: "Bereit", live: "Live" };
  return (
    <div className="card">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Etsy-Listings</div>
        <span className="chip">47 gesamt</span>
        <span className="chip chip-warning">12 Entwürfe</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "var(--bg-muted)", borderRadius: 5 }}>
          <I.search size={12} color="var(--fg-subtle)" />
          <input placeholder="Titel, Tag…" style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, width: 180 }} />
        </div>
      </div>
      <table className="table">
        <thead><tr><th>Titel</th><th>Status</th><th>Mockups</th><th>Fehlt</th><th>Letzte Änderung</th><th></th></tr></thead>
        <tbody>{listings.map((l, i) => (
          <tr key={i}>
            <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 4, background: `linear-gradient(135deg, #${(0x333333 + i*0x121212).toString(16)}, #${(0xaaaaaa - i*0x0a0a0a).toString(16)})` }} />
              <span style={{ fontWeight: 500 }}>{l.t}</span>
            </td>
            <td><span className={`chip chip-${sm[l.status]} chip-dot`} style={{ fontSize: 10 }}>{lbl[l.status]}</span></td>
            <td className="t-mono t-sm">{l.mockups}/12</td>
            <td>{l.missing ? <span className="chip chip-warning" style={{ fontSize: 10 }}>{l.missing}</span> : <span className="subtle">—</span>}</td>
            <td className="t-sm subtle">vor {i+1}h</td>
            <td><I.arrowUpRight size={13} color="var(--fg-subtle)" /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function MarketingScreen() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div className="card">
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Pinterest-Queue</div>
          <span className="chip chip-success chip-dot">Verbunden</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm">Board wählen: Wall Art ▾</button>
          <button className="btn btn-accent btn-sm"><I.send size={12} /> Queue starten</button>
        </div>
        <table className="table">
          <thead><tr><th style={{ width: 60 }}>Bild</th><th>Titel</th><th>Caption</th><th>Ziel-URL</th><th>Status</th></tr></thead>
          <tbody>{[0,1,2,3,4].map(i => (
            <tr key={i}>
              <td><div style={{ width: 40, height: 40, borderRadius: 4, background: `linear-gradient(135deg, hsl(${i*60}, 60%, 60%), hsl(${i*60+30}, 60%, 70%))` }} /></td>
              <td style={{ fontWeight: 500 }}>mockup-{String(i+1).padStart(2,"0")}.jpg</td>
              <td className="t-sm muted" style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {i === 0 ? "Warme Boho-Töne für dein Wohnzimmer ✨ #walldecor" : "—"}
                {i > 0 && i < 3 && <button className="btn btn-ghost btn-sm" style={{ padding: 2, marginLeft: 4 }}><I.sparkles size={11} color="var(--accent)" /></button>}
              </td>
              <td className="t-xs t-mono subtle">etsy.com/…</td>
              <td><span className={`chip ${i < 2 ? "chip-success" : ""}`} style={{ fontSize: 10 }}>{i < 2 ? "Gepostet" : i === 2 ? "In Queue" : "Entwurf"}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card" style={{ padding: 18 }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>Reichweite · letzte 7 Tage</div>
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div><div style={{ fontSize: 24, fontWeight: 600 }}>4.2k</div><div className="t-xs subtle">Impressionen</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 600 }}>127</div><div className="t-xs subtle">Klicks</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 600, color: "var(--success)" }}>+18%</div><div className="t-xs subtle">vs. Vorwoche</div></div>
        </div>
        <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 3 }}>
          {[35,52,44,65,58,78,70,90,85,95,72,88].map((h,i)=>(
            <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--accent)", opacity: 0.8, borderRadius: "2px 2px 0 0" }} />
          ))}
        </div>
        <div className="divider" style={{ margin: "18px 0" }} />
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>KI-Caption Vorlage</div>
        <textarea className="input" rows={4} defaultValue="Warme Boho-Töne für dein Wohnzimmer ✨ Hochauflösender Print, sofort downloadbar. #walldecor #boho" style={{ fontFamily: "inherit", resize: "none" }} />
        <button className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}><I.sparkles size={12} /> Neu generieren</button>
      </div>
    </div>
  );
}

function AutomationScreen() {
  const steps = [
    { k: "upscale", l: "Upscale", icon: I.maximize },
    { k: "seo", l: "SEO", icon: I.tag },
    { k: "mockups", l: "Mockups", icon: I.layers },
    { k: "gelato", l: "Gelato", icon: I.package },
  ];
  const tasks = [
    { n: "boho-sunset-01", phase: 4, status: "done" },
    { n: "mountain-line", phase: 4, status: "done" },
    { n: "abstract-form-03", phase: 3, status: "running" },
    { n: "vintage-poster", phase: 2, status: "running" },
    { n: "minimal-geo", phase: 1, status: "running" },
    { n: "gradient-wave", phase: 0, status: "queued" },
    { n: "forest-silhouette", phase: 0, status: "queued" },
    { n: "retro-sun", phase: 0, status: "queued" },
  ];
  return (
    <div>
      {/* Pipeline header */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Pipeline · Batch #124</div>
            <div className="t-xs subtle">8 Motive · gestartet 14:02 · ETA 16:48</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-secondary btn-sm"><I.pause size={12} /> Pausieren</button>
            <button className="btn btn-ghost btn-sm"><I.x size={12} /> Abbrechen</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, position: "relative" }}>
          {steps.map((s, i) => {
            const done = i < 2, live = i === 2;
            return (
              <div key={i} style={{
                padding: 14, border: "1px solid var(--border)", borderRadius: 8,
                background: live ? "var(--accent-bg)" : done ? "var(--success-bg)" : "var(--bg-subtle)",
                borderColor: live ? "var(--accent-border)" : done ? "transparent" : "var(--border)",
                position: "relative",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <s.icon size={14} color={live ? "var(--accent)" : done ? "var(--success)" : "var(--fg-subtle)"} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.l}</span>
                </div>
                <div className="t-mono t-xs" style={{ fontSize: 11 }}>
                  {done ? "8/8 ✓" : live ? "3/8 · 0:42" : "0/8"}
                </div>
                {live && <div className="progress" style={{ marginTop: 6 }}><div className="progress-fill" style={{ width: "37%" }} /></div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>Motive in diesem Batch</div>
        <table className="table">
          <thead><tr><th>Motiv</th><th>Phasen</th><th>Status</th><th>Dauer</th></tr></thead>
          <tbody>{tasks.map((t, i) => (
            <tr key={i}>
              <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 4, background: `linear-gradient(135deg, hsl(${i*45}, 65%, 55%), hsl(${i*45+30}, 65%, 65%))` }} />
                <span style={{ fontWeight: 500 }}>{t.n}.png</span>
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {steps.map((s, si) => {
                    const pass = si < t.phase, live = si === t.phase && t.status === "running";
                    return (
                      <React.Fragment key={si}>
                        {si > 0 && <div style={{ width: 10, height: 2, background: pass ? "var(--success)" : "var(--border)", borderRadius: 1 }} />}
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: pass ? "var(--success)" : live ? "var(--accent)" : "var(--bg-muted)",
                          color: pass || live ? "white" : "var(--fg-faint)",
                          display: "grid", placeItems: "center",
                          fontSize: 10, fontWeight: 600,
                          border: "1px solid " + (pass ? "var(--success)" : live ? "var(--accent)" : "var(--border)"),
                        }}>
                          {pass ? <I.check size={10} stroke={3} /> : live ? <I.loader size={10} className="pulse" /> : si + 1}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </td>
              <td><span className={`chip chip-${t.status === "done" ? "success" : t.status === "running" ? "warning" : ""} chip-dot`} style={{ fontSize: 10 }}>
                {t.status === "done" ? "Fertig" : t.status === "running" ? steps[t.phase]?.l : "Wartet"}
              </span></td>
              <td className="t-mono t-xs subtle">{t.status === "done" ? "4:12" : t.status === "running" ? "läuft" : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function IntegrationsScreen() {
  const items = [
    { name: "Etsy", icon: I.shoppingBag, status: "connected", desc: "Shop: MyPrintsDE · 47 Listings", type: "OAuth" },
    { name: "Gelato", icon: I.package, status: "connected", desc: "Store: 3f8a… · DE-Hub", type: "API Key" },
    { name: "Gemini", icon: I.sparkles, status: "connected", desc: "Projekt: printflow-ai · BYOK", type: "BYOK" },
    { name: "Vertex AI", icon: I.maximize, status: "connected", desc: "Region: europe-west3 · BYOK", type: "BYOK" },
    { name: "Pinterest", icon: I.pin, status: "disconnected", desc: "Nicht verbunden", type: "OAuth" },
  ];
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, padding: 4, background: "var(--bg-muted)", borderRadius: 8, width: "fit-content" }}>
        <button className="btn btn-primary btn-sm">Alle Integrationen</button>
        <button className="btn btn-ghost btn-sm">Geführter Assistent</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--bg-muted)", display: "grid", placeItems: "center", color: "var(--fg-muted)" }}>
              <it.icon size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{it.name}</span>
                <span className="chip" style={{ fontSize: 10 }}>{it.type}</span>
                <span className={`chip ${it.status === "connected" ? "chip-success" : ""} chip-dot`} style={{ fontSize: 10 }}>
                  {it.status === "connected" ? "Verbunden" : "Nicht verbunden"}
                </span>
              </div>
              <div className="t-sm subtle" style={{ marginTop: 2 }}>{it.desc}</div>
            </div>
            <button className={it.status === "connected" ? "btn btn-secondary btn-sm" : "btn btn-accent btn-sm"}>
              {it.status === "connected" ? "Verwalten" : "Verbinden"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountScreen() {
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--violet))", display: "grid", placeItems: "center", color: "white", fontSize: 20, fontWeight: 600 }}>LK</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Lukas Krämer</div>
            <div className="t-sm subtle">lukas@kraemer.dev · Kern (Free) · seit März 2026</div>
          </div>
          <div style={{ marginLeft: "auto" }}><button className="btn btn-accent btn-sm">Pro testen</button></div>
        </div>
        <div className="divider" style={{ margin: "20px 0" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className="label">Anzeigename</label><input className="input" defaultValue="Lukas Krämer" /></div>
          <div><label className="label">E-Mail</label><input className="input" defaultValue="lukas@kraemer.dev" /></div>
          <div><label className="label">Shop-Sprache</label><select className="input"><option>Deutsch</option><option>English</option></select></div>
          <div><label className="label">Zeitzone</label><select className="input"><option>Europe/Berlin</option></select></div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Nutzung diesen Monat</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[{ n: "Mockups", v: "2.847", sub: "kostenlos · ∞" }, { n: "KI-Listings", v: "193", sub: "BYOK · ~4,12€" }, { n: "Upscales", v: "47", sub: "BYOK · ~3,76€" }, { n: "Pins", v: "0", sub: "Pro ab 29€" }].map((m,i)=>(
            <div key={i} style={{ padding: 14, background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <div className="t-xs subtle">{m.n}</div>
              <div style={{ fontSize: 22, fontWeight: 600, fontFeatureSettings: "'tnum'" }}>{m.v}</div>
              <div className="t-xs subtle">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Sicherheit</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>Passwort</div><div className="t-xs subtle">Zuletzt geändert vor 47 Tagen</div></div>
          <button className="btn btn-secondary btn-sm">Ändern</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>Zwei-Faktor-Authentifizierung</div><div className="t-xs subtle">Aktiv · Authenticator App</div></div>
          <span className="chip chip-success" style={{ fontSize: 10 }}>Aktiv</span>
        </div>
      </div>
    </div>
  );
}

/* =============== AUTH SCREEN =============== */
function AuthScreen() {
  const [mode, setMode] = useS2("login");
  return (
    <div style={{ minHeight: 900, background: "var(--bg)", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <div style={{ padding: "64px 64px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--fg)", display: "grid", placeItems: "center" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="var(--bg)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          </div>
          <span style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>PrintFlow</span>
        </div>

        <div style={{ maxWidth: 380 }}>
          <h1 className="t-h2" style={{ margin: "0 0 8px" }}>{mode === "login" ? "Willkommen zurück" : "Konto erstellen"}</h1>
          <p className="t-sm muted" style={{ marginBottom: 32 }}>
            {mode === "login" ? "Melde dich an, um deinen Shop zu verwalten." : "Starte kostenlos — ohne Kreditkarte."}
          </p>

          {mode === "register" && <><label className="label">Name</label><input className="input" placeholder="Max Mustermann" style={{ marginBottom: 14 }} /></>}
          <label className="label">E-Mail</label>
          <input className="input" placeholder="you@example.com" style={{ marginBottom: 14 }} />
          <label className="label" style={{ display: "flex", justifyContent: "space-between" }}>
            Passwort
            {mode === "login" && <a href="#" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12 }}>Vergessen?</a>}
          </label>
          <input className="input" type="password" placeholder="••••••••" style={{ marginBottom: 20 }} />

          <button className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
            {mode === "login" ? "Anmelden" : "Konto erstellen"} <I.arrowRight size={14} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "var(--fg-faint)" }}>
            <div className="divider" style={{ flex: 1 }} /><span className="t-xs">ODER</span><div className="divider" style={{ flex: 1 }} />
          </div>

          <button className="btn btn-secondary btn-lg" style={{ width: "100%", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Weiter mit Google
          </button>

          <div className="t-sm subtle" style={{ marginTop: 32, textAlign: "center" }}>
            {mode === "login" ? "Noch kein Konto?" : "Bereits ein Konto?"}{" "}
            <a onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ color: "var(--accent)", cursor: "pointer" }}>
              {mode === "login" ? "Jetzt kostenlos registrieren" : "Anmelden"}
            </a>
          </div>
        </div>
      </div>

      {/* Right: product showcase */}
      <div style={{ background: "var(--bg-subtle)", borderLeft: "1px solid var(--border)", padding: "64px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div className="bg-grid bg-grid-mask" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "relative", maxWidth: 460 }}>
          <div className="chip chip-accent" style={{ marginBottom: 20 }}>Was gibt's Neues</div>
          <h2 className="t-h3" style={{ margin: "0 0 14px" }}>Multi-Agent Listings sind jetzt live</h2>
          <p className="t-sm muted" style={{ marginBottom: 28 }}>
            Drei KI-Agenten diskutieren deine Tags, Titel und Beschreibung — orientiert an aktuellen Etsy-Trends. Stärker als ein Einzeiler.
          </p>
          <div className="card" style={{ padding: 18, background: "var(--bg-elevated)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["SEO", "Copy", "Trend"].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--bg-muted)", borderRadius: 999, fontSize: 11 }}>
                  <div className="dot dot-live" /> {a}-Agent
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
              <div><span style={{ color: "var(--accent)" }}>SEO</span> › &quot;boho wall art&quot; hat 2.3k Suchen/Monat</div>
              <div><span style={{ color: "var(--violet)" }}>Copy</span> › Titel zu lang, kürze auf 70 Zeichen</div>
              <div><span style={{ color: "var(--success)" }}>Trend</span> › Rosé-Töne +42% in Q2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TemplatesScreen, UpscalerScreen, EtsyScreen, MarketingScreen, AutomationScreen, IntegrationsScreen, AccountScreen, AuthScreen });
