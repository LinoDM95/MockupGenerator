/* global React, I */
const { useState } = React;

/* =========================================================
   APP SHELL — sidebar + topbar + content area
   Linear-style, dense, professional
   ========================================================= */
function AppShell({ initialScreen = "generator" }) {
  const [screen, setScreen] = useState(initialScreen);
  const [collapsed, setCollapsed] = useState(false);

  const screenTitles = {
    generator: { label: "Generator", area: "Erstellen", desc: "Motive → Mockups → Listings → Etsy." },
    templates: { label: "Vorlagen-Studio", area: "Erstellen", desc: "Mockup-Templates pflegen und organisieren." },
    "template-editor": { label: "Vorlagen-Editor", area: "Erstellen", desc: "Eine einzelne Vorlage gestalten — Motiv-Boxen, Text, Rahmen." },
    upscaler: { label: "Upscaler", area: "Erstellen", desc: "Motive mit Vertex AI hochskalieren." },
    etsy: { label: "Etsy-Listings", area: "Publizieren", desc: "Entwürfe mit Mockup-Bildern finalisieren." },
    marketing: { label: "Verbreiten", area: "Publizieren", desc: "Pinterest-Pins mit KI-Captions." },
    automation: { label: "Automatisieren", area: "Publizieren", desc: "Batch-Pipeline für Serien." },
    integrations: { label: "Integrationen", area: "Konto", desc: "Etsy · Gelato · Gemini · Vertex · Pinterest." },
    account: { label: "Konto", area: "Konto", desc: "Profil, Sicherheit und Abrechnung." },
  };

  const current = screenTitles[screen] ?? screenTitles.generator;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: collapsed ? "56px 1fr" : "232px 1fr",
      height: "100%", minHeight: 900,
      background: "var(--bg-subtle)",
      color: "var(--fg)",
      transition: "grid-template-columns 0.2s",
    }}>
      <Sidebar screen={screen} setScreen={setScreen} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar screen={screen} current={current} />
        <main style={{ flex: 1, padding: 24, overflow: "auto", minWidth: 0 }}>
          {screen === "generator" && <GeneratorScreen />}
          {screen === "templates" && <TemplatesScreen />}
          {screen === "template-editor" && <TemplateEditorScreen />}
          {screen === "upscaler" && <UpscalerScreen />}
          {screen === "etsy" && <EtsyScreen />}
          {screen === "marketing" && <MarketingScreen />}
          {screen === "automation" && <AutomationScreen />}
          {screen === "integrations" && <IntegrationsScreen />}
          {screen === "account" && <AccountScreen />}
        </main>
      </div>
    </div>
  );
}

/* --------------- Sidebar --------------- */
function Sidebar({ screen, setScreen, collapsed, setCollapsed }) {
  const groups = [
    {
      label: "Erstellen",
      items: [
        { id: "generator", label: "Generator", icon: I.layers, count: 12 },
        { id: "templates", label: "Vorlagen-Studio", icon: I.folder, count: 8 },
        { id: "template-editor", label: "Vorlagen-Editor", icon: I.edit },
        { id: "upscaler", label: "Upscaler", icon: I.maximize },
      ],
    },
    {
      label: "Publizieren",
      items: [
        { id: "etsy", label: "Etsy-Listings", icon: I.shoppingBag, count: 47 },
        { id: "marketing", label: "Verbreiten", icon: I.megaphone, paid: true },
        { id: "automation", label: "Automatisieren", icon: I.rocket, paid: true },
      ],
    },
    {
      label: "Konto",
      items: [
        { id: "integrations", label: "Integrationen", icon: I.link2 },
        { id: "account", label: "Konto", icon: I.user },
      ],
    },
  ];

  return (
    <aside style={{
      background: "var(--bg)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "14px 10px" : "14px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10,
        height: 52,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "var(--fg)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="var(--bg)">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        {!collapsed && (
          <>
            <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: 14 }}>PrintFlow</span>
            <button
              onClick={() => setCollapsed(true)}
              className="btn btn-ghost"
              style={{ padding: 4, marginLeft: "auto" }}
              title="Einklappen"
            >
              <I.chevronLeft size={14} />
            </button>
          </>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{ position: "absolute", left: 56, top: 20, width: 18, height: 18, borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg)", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 10 }}
            title="Aufklappen"
          >
            <I.chevronRight size={11} />
          </button>
        )}
      </div>

      {/* Quick search */}
      {!collapsed && (
        <div style={{ padding: "10px 12px 4px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", background: "var(--bg-muted)",
            border: "1px solid var(--border-subtle)", borderRadius: 6,
            cursor: "pointer",
          }}>
            <I.search size={13} color="var(--fg-subtle)" />
            <span className="t-sm subtle" style={{ flex: 1 }}>Suchen…</span>
            <span className="kbd">⌘K</span>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <div style={{ flex: 1, padding: "10px 12px", overflow: "auto" }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 18 }}>
            {!collapsed && (
              <div className="t-eyebrow" style={{ padding: "6px 10px 4px", fontSize: 10 }}>{g.label}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {g.items.map((it) => (
                <div
                  key={it.id}
                  className={"nav-item " + (screen === it.id ? "active" : "")}
                  onClick={() => setScreen(it.id)}
                  title={collapsed ? it.label : undefined}
                  style={collapsed ? { justifyContent: "center", padding: "8px 0" } : {}}
                >
                  <it.icon size={15} className="nav-icon" />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {it.paid && <span className="chip chip-warning" style={{ fontSize: 9, padding: "1px 5px" }}>Pro</span>}
                      {it.count != null && <span className="count">{it.count}</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User footer */}
      {!collapsed && (
        <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 8px", borderRadius: 6, cursor: "pointer",
          }} className="clickable">
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--violet))", display: "grid", placeItems: "center", color: "white", fontSize: 11, fontWeight: 600 }}>LK</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Lukas Krämer</div>
              <div className="t-xs subtle" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>Kern · Free</div>
            </div>
            <I.moreV size={14} color="var(--fg-subtle)" />
          </div>
        </div>
      )}
    </aside>
  );
}

/* --------------- Topbar --------------- */
function Topbar({ screen, current }) {
  return (
    <header style={{
      height: 52, borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      display: "flex", alignItems: "center", padding: "0 24px",
      flexShrink: 0, gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span className="subtle">{current.area}</span>
        <I.chevronRight size={12} color="var(--fg-faint)" />
        <span style={{ fontWeight: 600 }}>{current.label}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button className="btn btn-ghost btn-sm" title="Aktivität">
          <div className="dot dot-live" style={{ marginRight: 4 }} />
          <span>3 aktiv</span>
        </button>
        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
        <button className="btn btn-ghost btn-sm" title="Feedback"><I.msg size={14} /></button>
        <button className="btn btn-ghost btn-sm" title="Theme"><I.moon size={14} /></button>
        <button className="btn btn-ghost btn-sm" title="Abmelden"><I.logout size={14} /></button>
      </div>
    </header>
  );
}

/* ============================================================
   GENERATOR SCREEN
   3-column: artworks list | preview canvas | properties
   ============================================================ */
function GeneratorScreen() {
  const [selected, setSelected] = useState(2);
  const artworks = [
    { name: "boho-sunset-01.png", size: "2.4 MB", status: "done", colors: ["#f59e0b", "#dc2626"] },
    { name: "mountain-line.png", size: "1.8 MB", status: "done", colors: ["#1e293b", "#0ea5e9"] },
    { name: "abstract-form-03.png", size: "3.1 MB", status: "running", colors: ["#ec4899", "#8b5cf6"] },
    { name: "vintage-poster.png", size: "2.9 MB", status: "queued", colors: ["#0f766e", "#84cc16"] },
    { name: "minimal-geo.png", size: "1.2 MB", status: "queued", colors: ["#7c3aed", "#0ea5e9"] },
    { name: "gradient-wave.png", size: "2.1 MB", status: "draft", colors: ["#f97316", "#06b6d4"] },
    { name: "forest-silhouette.png", size: "2.6 MB", status: "draft", colors: ["#166534", "#84cc16"] },
    { name: "retro-sun.png", size: "1.9 MB", status: "draft", colors: ["#b45309", "#f59e0b"] },
  ];

  return (
    <div style={{ height: "calc(100vh - 100px)", minHeight: 820, display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 16 }}>
      {/* Left: artwork queue */}
      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Motive</div>
            <div className="t-xs subtle">{artworks.length} Dateien · 18.0 MB</div>
          </div>
          <button className="btn btn-secondary btn-sm"><I.upload size={12} /> Upload</button>
        </div>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "var(--bg-muted)", borderRadius: 5, flex: 1 }}>
            <I.search size={12} color="var(--fg-subtle)" />
            <input className="t-xs" placeholder="Filtern…" style={{ background: "transparent", border: "none", outline: "none", color: "var(--fg)", flex: 1, fontSize: 12 }} />
          </div>
          <button className="btn btn-ghost btn-sm" style={{ padding: 5 }}><I.filter size={13} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 6 }}>
          {artworks.map((a, i) => (
            <div
              key={i}
              onClick={() => setSelected(i)}
              style={{
                display: "flex", gap: 10, alignItems: "center",
                padding: 8, borderRadius: 6, cursor: "pointer",
                background: selected === i ? "var(--accent-bg)" : "transparent",
                border: selected === i ? "1px solid var(--accent-border)" : "1px solid transparent",
                marginBottom: 2,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                background: `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})`,
                border: "1px solid var(--border)",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                <div className="t-xs subtle">{a.size}</div>
              </div>
              <StatusDot status={a.status} />
            </div>
          ))}
        </div>
        <div style={{ padding: 10, borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}>
            <I.play size={13} /> Alle generieren
          </button>
        </div>
      </div>

      {/* Center: canvas */}
      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>abstract-form-03.png</div>
          <span className="chip chip-warning chip-dot" style={{ fontSize: 10 }}>Läuft · 3/12</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: 5 }}><I.eye size={13} /></button>
            <button className="btn btn-ghost btn-sm" style={{ padding: 5 }}><I.grid size={13} /></button>
            <button className="btn btn-secondary btn-sm"><I.download size={12} /> ZIP</button>
          </div>
        </div>

        {/* Canvas viewport — mockup grid */}
        <div style={{ flex: 1, padding: 20, background: "var(--bg-subtle)", overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { color: "#f4f1eb", scene: "Wohnzimmer · Sofa", status: "done" },
              { color: "#1a1a1a", scene: "Dunkles Regal", status: "done" },
              { color: "#e8ddd0", scene: "Schlafzimmer", status: "done" },
              { color: "#fafafa", scene: "Minimal weiß", status: "running" },
              { color: "#2d3748", scene: "Büro · Holz", status: "queued" },
              { color: "#d4c5b0", scene: "Esstisch", status: "queued" },
              { color: "#f7e4d4", scene: "Kinderzimmer", status: "queued" },
              { color: "#c5d4c0", scene: "Eingangsflur", status: "queued" },
            ].map((m, i) => (
              <div key={i} style={{
                aspectRatio: "3/4", borderRadius: 8,
                border: "1px solid var(--border)",
                background: m.color, padding: 24, position: "relative",
                overflow: "hidden",
              }}>
                {/* Frame */}
                <div style={{
                  position: "absolute", top: "20%", left: "20%", right: "20%", bottom: "20%",
                  background: `linear-gradient(135deg, #ec4899, #8b5cf6)`,
                  border: "6px solid white",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                  opacity: m.status === "queued" ? 0.25 : 0.9,
                }} />
                <div style={{ position: "absolute", bottom: 8, left: 10, right: 10, fontSize: 10, color: m.color === "#1a1a1a" || m.color === "#2d3748" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)" }}>
                  {m.scene}
                </div>
                <div style={{ position: "absolute", top: 8, right: 8 }}>
                  <StatusDot status={m.status} small />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom progress bar */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
              <span className="muted">Rendering · abstract-form-03.png</span>
              <span className="t-mono">3/12 · ETA 0:42</span>
            </div>
            <div className="progress"><div className="progress-fill" style={{ width: "25%" }} /></div>
          </div>
          <button className="btn btn-secondary btn-sm">Pausieren</button>
          <button className="btn btn-ghost btn-sm" title="Abbrechen"><I.x size={13} /></button>
        </div>
      </div>

      {/* Right: properties / listing */}
      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {["Listing", "Vorlage", "Export"].map((t, i) => (
            <div key={i} style={{
              flex: 1, padding: "10px 12px", fontSize: 12, fontWeight: 500,
              textAlign: "center", cursor: "pointer",
              color: i === 0 ? "var(--fg)" : "var(--fg-muted)",
              borderBottom: i === 0 ? "2px solid var(--accent)" : "2px solid transparent",
            }}>{t}</div>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
          <div style={{ marginBottom: 16, padding: 10, background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <I.sparkles size={13} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Multi-Agent · Gemini</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>3 Agenten diskutieren gerade Titel-Varianten.</div>
          </div>

          <label className="label">Titel</label>
          <input className="input" defaultValue="Boho Abstract Form · Minimalist Wall Art Print" style={{ marginBottom: 14 }} />

          <label className="label">Tags <span className="t-xs subtle">(13/13)</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, minHeight: 40, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 14 }}>
            {["boho wall art", "abstract print", "minimalist", "home decor", "pink", "violet", "living room", "modern art", "scandinavian", "printable", "poster art", "downloadable", "trendy 2026"].map((t, i) => (
              <span key={i} className="chip" style={{ fontSize: 10, padding: "2px 6px" }}>
                {t}
                <I.x size={9} color="var(--fg-subtle)" style={{ marginLeft: 2, cursor: "pointer" }} />
              </span>
            ))}
          </div>

          <label className="label">Beschreibung</label>
          <textarea className="input" rows={5} style={{ fontFamily: "inherit", resize: "vertical", marginBottom: 14 }}
            defaultValue="Zeitloses Boho-Motiv mit warmen Rosé- und Violett-Tönen. Perfekt für moderne Wohn- und Schlafbereiche. Hochauflösender Druck, sofort herunterladbar." />

          <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>SEO-Score</span>
              <span className="chip chip-success" style={{ fontSize: 10 }}>87 · Gut</span>
            </div>
            <div className="progress"><div className="progress-fill success" style={{ width: "87%" }} /></div>
          </div>
        </div>
        <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}><I.sparkles size={12} /> Neu generieren</button>
          <button className="btn btn-accent" style={{ flex: 1, justifyContent: "center" }}><I.send size={12} /> Zu Etsy</button>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status, small }) {
  const map = {
    done: { c: "var(--success)", bg: "var(--success-bg)", label: "OK" },
    running: { c: "var(--warning)", bg: "var(--warning-bg)", label: "…" },
    queued: { c: "var(--fg-faint)", bg: "var(--bg-muted)", label: "–" },
    draft: { c: "var(--fg-subtle)", bg: "var(--bg-muted)", label: "·" },
    error: { c: "var(--danger)", bg: "var(--danger-bg)", label: "!" },
  };
  const s = map[status] ?? map.draft;
  if (small) return <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.c, boxShadow: `0 0 0 3px ${s.bg}` }} />;
  return (
    <div style={{
      width: 20, height: 20, borderRadius: "50%",
      background: s.bg, color: s.c,
      display: "grid", placeItems: "center",
      fontSize: 10, fontWeight: 600,
    }}>
      {status === "done" ? <I.check size={11} stroke={2.75} /> : status === "running" ? <I.loader size={10} className="pulse" /> : s.label}
    </div>
  );
}

Object.assign(window, { AppShell, StatusDot });
