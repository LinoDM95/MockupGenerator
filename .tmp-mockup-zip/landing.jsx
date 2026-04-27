/* global React, I */
const { useState } = React;

/* =========================================================
   LANDING PAGE — conversion-first, Linear/Vercel aesthetic
   ========================================================= */
function Landing() {
  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", minHeight: "100%" }}>
      <LandingNav />
      <LandingHero />
      <LandingLogos />
      <LandingProblem />
      <LandingWorkflow />
      <LandingFeatures />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}

function Logo({ size = 16 }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6,
      background: "var(--fg)",
      display: "grid", placeItems: "center", flexShrink: 0,
    }}>
      <svg width={13} height={13} viewBox="0 0 24 24" fill="var(--bg)" stroke="none">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </div>
  );
}

function LandingNav() {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      borderBottom: "1px solid var(--border)",
      background: "color-mix(in oklab, var(--bg) 88%, transparent)",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo />
          <span style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>PrintFlow</span>
        </div>
        <div style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 13 }}>
          <a className="muted" href="#workflow" style={{ textDecoration: "none", color: "var(--fg-muted)" }}>Workflow</a>
          <a className="muted" href="#features" style={{ textDecoration: "none", color: "var(--fg-muted)" }}>Features</a>
          <a className="muted" href="#pricing" style={{ textDecoration: "none", color: "var(--fg-muted)" }}>Preise</a>
          <a className="muted" href="#integrations" style={{ textDecoration: "none", color: "var(--fg-muted)" }}>Integrationen</a>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm">Anmelden</button>
          <button className="btn btn-primary btn-sm">Kostenlos starten <I.arrowRight size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function LandingHero() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div className="bg-grid bg-grid-mask" style={{
        position: "absolute", inset: 0, zIndex: 0,
      }} />
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        padding: "96px 24px 64px", textAlign: "center",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "4px 12px 4px 4px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 999, fontSize: 12, marginBottom: 28,
        }}>
          <span className="chip chip-accent" style={{ fontSize: 10 }}>Neu</span>
          <span className="muted">Multi-Agent Listings jetzt mit Trend-Daten</span>
          <I.arrowRight size={12} />
        </div>
        <h1 className="t-display" style={{ margin: "0 0 20px", maxWidth: 860, marginInline: "auto" }}>
          Die komplette Print-Pipeline.<br/>
          <span style={{ color: "var(--fg-muted)" }}>Motiv rein. Etsy raus.</span>
        </h1>
        <p className="t-body muted" style={{ maxWidth: 580, margin: "0 auto 36px" }}>
          Vorlagen anlegen, Mockups rendern, KI-Texte generieren und direkt als
          Etsy-Entwurf veröffentlichen. Ein nahtloser Ablauf mit PrintFlow.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 64 }}>
          <button className="btn btn-primary btn-lg">Kostenlos starten <I.arrowRight size={14} /></button>
          <button className="btn btn-secondary btn-lg">Live-Demo ansehen</button>
        </div>

        {/* App preview card */}
        <HeroAppPreview />
      </div>
    </section>
  );
}

function HeroAppPreview() {
  return (
    <div style={{
      position: "relative", maxWidth: 1080, margin: "0 auto",
      border: "1px solid var(--border)", borderRadius: 14,
      background: "var(--bg-elevated)",
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
    }}>
      {/* Window chrome */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-subtle)",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <div style={{
          marginLeft: 12, padding: "3px 10px",
          background: "var(--bg)", border: "1px solid var(--border)",
          borderRadius: 6, fontSize: 11, color: "var(--fg-muted)",
          fontFamily: "'JetBrains Mono', monospace", flex: 1, textAlign: "center", maxWidth: 280,
        }}>
          app.printflow.io/erstellen/generator
        </div>
      </div>

      {/* Mini app grid */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 280px", height: 380 }}>
        <aside style={{ borderRight: "1px solid var(--border)", padding: 14, background: "var(--bg-subtle)" }}>
          <div className="t-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Erstellen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="nav-item active"><I.layers size={14} /> Generator <span className="count">12</span></div>
            <div className="nav-item"><I.folder size={14} /> Vorlagen-Studio</div>
            <div className="nav-item"><I.maximize size={14} /> Upscaler</div>
          </div>
          <div className="t-eyebrow" style={{ marginBottom: 10, marginTop: 18, fontSize: 10 }}>Publizieren</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="nav-item"><I.shoppingBag size={14} /> Etsy</div>
            <div className="nav-item"><I.megaphone size={14} /> Verbreiten</div>
            <div className="nav-item"><I.rocket size={14} /> Automatisieren</div>
          </div>
        </aside>
        <main style={{ padding: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div className="t-h4" style={{ margin: 0 }}>Generator</div>
              <div className="t-xs subtle">12 Motive · Vorlage: Poster A3 Lifestyle</div>
            </div>
            <button className="btn btn-accent btn-sm"><I.play size={12} /> Alle generieren</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {["#6366f1","#ec4899","#f59e0b","#10b981","#0ea5e9","#8b5cf6","#f43f5e","#14b8a6","#a855f7","#f97316","#22c55e","#3b82f6"].map((c, i) => (
              <div key={i} style={{
                aspectRatio: "3/4", borderRadius: 6, border: "1px solid var(--border)",
                background: "var(--bg-subtle)", padding: 6, position: "relative"
              }}>
                <div style={{ background: c, opacity: 0.75, height: "100%", borderRadius: 3 }} />
                <div style={{
                  position: "absolute", top: 4, right: 4, width: 14, height: 14,
                  borderRadius: "50%", background: "var(--success)", display: "grid", placeItems: "center"
                }}>
                  <I.check size={9} stroke={3} />
                </div>
              </div>
            ))}
          </div>
        </main>
        <aside style={{ borderLeft: "1px solid var(--border)", padding: 14, overflow: "hidden" }}>
          <div className="t-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Fortschritt</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span>Mockups</span><span className="t-mono muted">12/12</span>
              </div>
              <div className="progress"><div className="progress-fill success" style={{ width: "100%" }} /></div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span>KI-Listings</span><span className="t-mono muted">9/12</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: "75%" }} /></div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span>Etsy-Entwurf</span><span className="t-mono muted">0/12</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: "0%" }} /></div>
            </div>
          </div>
          <div style={{ marginTop: 18, padding: 10, background: "var(--accent-bg)", borderRadius: 8, border: "1px solid var(--accent-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>
              ETA: ~2 Min
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
              9 Listings offen. Gelato-Sync parallel.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LandingLogos() {
  const items = [
    { name: "Etsy", icon: I.shoppingBag },
    { name: "Gelato", icon: I.package },
    { name: "Pinterest", icon: I.pin },
    { name: "Gemini", icon: I.sparkles },
    { name: "Vertex AI", icon: I.maximize },
  ];
  return (
    <section id="integrations" style={{
      borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
      background: "var(--bg-subtle)",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto", padding: "32px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap",
      }}>
        <div className="t-sm subtle" style={{ whiteSpace: "nowrap" }}>Nativ integriert</div>
        <div style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-muted)" }}>
              <it.icon size={18} />
              <span style={{ fontWeight: 500, fontSize: 14 }}>{it.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingProblem() {
  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="t-eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Für Etsy-Seller</div>
        <h2 className="t-h1" style={{ margin: "0 0 48px", maxWidth: 720 }}>
          Print-on-Demand ist ein Klickmarathon.<br/>
          <span className="muted">Wir haben ihn abgeschafft.</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 36, borderRight: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
            <div className="t-eyebrow" style={{ color: "var(--danger)", marginBottom: 14 }}>Ohne PrintFlow</div>
            {[
              "Jedes Mockup in Photoshop oder Canva einzeln zusammenbauen",
              "Titel, Tags und Beschreibungen manuell schreiben — pro Listing",
              "Gelato-Produkt, Etsy-Listing, Pinterest-Pin: drei separate Oberflächen",
              "Keine Batch-Operations — Serien von 50 Motiven dauern Tage",
              "Abo zahlen für Features, die man nicht braucht",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}>
                <I.x size={16} stroke={2.25} color="var(--danger)" />
                <span className="t-sm muted">{t}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 36 }}>
            <div className="t-eyebrow" style={{ color: "var(--success)", marginBottom: 14 }}>Mit PrintFlow</div>
            {[
              "Motiv hochladen — Mockups aus Vorlagen in Sekunden",
              "KI-Multi-Agent schreibt Titel, Tags & Beschreibung anhand aktueller Trends",
              "Gelato-Produkt + Etsy-Entwurf werden in einem Schritt vorbereitet",
              "Automatisieren-Pipeline läuft 50+ Motive parallel mit transparentem Status",
              "Kernworkflow komplett kostenlos — KI optional via eigene API-Keys (BYOK)",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}>
                <I.check size={16} stroke={2.25} color="var(--success)" />
                <span className="t-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingWorkflow() {
  const steps = [
    { n: "01", title: "Motive hochladen", desc: "Einzeln oder als Batch in den Generator ziehen.", icon: I.upload },
    { n: "02", title: "Vorlage wählen", desc: "Mockups werden aus deinem Vorlagen-Studio automatisch gerendert.", icon: I.layers },
    { n: "03", title: "Listing-Texte", desc: "Selbst schreiben oder mit KI-Multi-Agent auf Basis aktueller Trends.", icon: I.sparkles },
    { n: "04", title: "Gelato & Etsy", desc: "Produkt-Sync und Listing-Entwurf in einem Rutsch.", icon: I.send },
  ];
  return (
    <section id="workflow" style={{ padding: "96px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="t-eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Workflow</div>
        <h2 className="t-h1" style={{ margin: "0 0 48px", maxWidth: 640 }}>
          Vier Schritte — vom Motiv zum Etsy-Entwurf.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              padding: 24, background: "var(--bg-elevated)",
              border: "1px solid var(--border)", borderRadius: 12,
              position: "relative",
            }}>
              <div className="t-mono subtle" style={{ fontSize: 11, marginBottom: 14 }}>{s.n}</div>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--bg-muted)",
                display: "grid", placeItems: "center", marginBottom: 14, color: "var(--accent)",
              }}>
                <s.icon size={16} />
              </div>
              <div className="t-h4" style={{ margin: "0 0 6px" }}>{s.title}</div>
              <div className="t-sm muted">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFeatures() {
  return (
    <section id="features" style={{ padding: "96px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="t-eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Plattform</div>
        <h2 className="t-h1" style={{ margin: "0 0 48px", maxWidth: 720 }}>
          Vier Bereiche. Eine Oberfläche.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <FeatureCard
            tag="Erstellen · kostenlos"
            tagType="success"
            title="Generator, Vorlagen-Studio, Upscaler"
            desc="Der Kern deines Shops: Mockups aus Vorlagen rendern, Templates im Studio pflegen, Motive per KI-Upscaler (BYOK Vertex) hochskalieren."
            big
          />
          <FeatureCard
            tag="Verbreiten · kostenpflichtig"
            tagType="warning"
            title="Pinterest-Marketing mit KI-Captions"
            desc="Boards verbinden, Pins aus der Warteschlange veröffentlichen. Reichweite neben Etsy."
          />
          <FeatureCard
            tag="Automatisieren · kostenpflichtig"
            tagType="warning"
            title="Batch-Pipeline für 50+ Motive"
            desc="Upscale → SEO → Mockups → Gelato. Transparenter Fortschritt pro Motiv."
          />
          <FeatureCard
            tag="Integrationen · zentral"
            tagType="default"
            title="Etsy · Gelato · Gemini · Vertex · Pinterest"
            desc="OAuth und BYOK an einem Ort. Einmal verbinden, überall nutzbar."
            big
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ tag, tagType = "default", title, desc, big }) {
  return (
    <div style={{
      padding: 28, background: "var(--bg-elevated)",
      border: "1px solid var(--border)", borderRadius: 12,
      gridColumn: big ? "auto" : "auto",
      minHeight: big ? 240 : 200,
    }}>
      <span className={`chip chip-${tagType === "success" ? "success" : tagType === "warning" ? "warning" : ""}`}>
        {tag}
      </span>
      <div className="t-h3" style={{ margin: "20px 0 8px" }}>{title}</div>
      <div className="t-sm muted" style={{ maxWidth: 520 }}>{desc}</div>
    </div>
  );
}

function LandingPricing() {
  return (
    <section id="pricing" style={{ padding: "96px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="t-eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Preise</div>
        <h2 className="t-h1" style={{ margin: "0 0 12px" }}>Fairer Preis, keine Überraschungen.</h2>
        <p className="t-body muted" style={{ maxWidth: 580, marginBottom: 48 }}>
          Der Kern-Workflow ist komplett kostenlos. KI nutzt du mit deinen eigenen API-Keys — du zahlst nur deinen Anbieter.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <PlanCard
            name="Kern"
            price="0 €"
            tag="Kostenlos · für immer"
            desc="Alles, was du für Print-on-Demand auf Etsy brauchst."
            features={[
              "Generator · unbegrenzte Mockups",
              "Vorlagen-Studio · alle Features",
              "Etsy-Listing-Entwurf",
              "Gelato-Produkt-Sync",
              "Community-Support",
            ]}
            cta="Kostenlos starten"
          />
          <PlanCard
            name="KI · BYOK"
            price="0 €"
            priceSub="+ API-Kosten"
            tag="Eigene Keys · ohne Abo"
            desc="KI-Upscaler und KI-Listings mit deinen eigenen Keys. Kein Abo."
            features={[
              "KI-Upscaler (Vertex AI, BYOK)",
              "KI-Listings (Gemini, BYOK)",
              "Multi-Agent Listings mit Trend-Daten",
              "Kein Aufschlag auf API-Nutzung",
              "Prioritäts-Support",
            ]}
            cta="Keys hinterlegen"
          />
          <PlanCard
            name="Pro"
            price="29 €"
            priceSub="pro Monat"
            tag="Verbreiten · Automatisieren"
            desc="Für Power-Seller mit großen Serien und Pinterest-Strategie."
            features={[
              "Pinterest-Marketing + KI-Captions",
              "Automatisieren-Pipeline (Batch)",
              "Upscale → SEO → Mockups → Gelato",
              "Parallele Jobs, transparenter Fortschritt",
              "E-Mail-Support",
            ]}
            cta="Pro testen"
            featured
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({ name, price, priceSub, tag, desc, features, cta, featured }) {
  return (
    <div style={{
      padding: 28,
      background: "var(--bg-elevated)",
      border: featured ? "1px solid var(--accent)" : "1px solid var(--border)",
      borderRadius: 12,
      position: "relative",
      boxShadow: featured ? "0 0 0 3px var(--accent-bg)" : "none",
    }}>
      {featured && (
        <div style={{
          position: "absolute", top: -10, right: 16,
          padding: "2px 10px", background: "var(--accent)", color: "var(--accent-fg)",
          borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
        }}>
          BELIEBT
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="t-h4">{name}</div>
        <div className="t-xs subtle">{tag}</div>
      </div>
      <div style={{ display: "baseline", margin: "18px 0 6px" }}>
        <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>{price}</span>
        {priceSub && <span className="t-sm muted" style={{ marginLeft: 8 }}>{priceSub}</span>}
      </div>
      <div className="t-sm muted" style={{ marginBottom: 18, minHeight: 44 }}>{desc}</div>
      <button className={featured ? "btn btn-accent" : "btn btn-secondary"} style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}>
        {cta}
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <I.check size={14} stroke={2.25} color="var(--success)" />
            <span className="t-sm">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingCTA() {
  return (
    <section style={{ padding: "96px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <h2 className="t-h1" style={{ margin: "0 0 16px" }}>
          Schluss mit manuellen Mockups.
        </h2>
        <p className="t-body muted" style={{ maxWidth: 520, margin: "0 auto 32px" }}>
          Der Kern ist kostenlos. KI per BYOK, ohne Abo. Starte in 2 Minuten.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-primary btn-lg">Kostenlos starten <I.arrowRight size={14} /></button>
          <button className="btn btn-secondary btn-lg">Doku lesen</button>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "32px 24px", background: "var(--bg-subtle)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo /><span style={{ fontWeight: 600 }}>PrintFlow</span>
          <span className="t-xs subtle" style={{ marginLeft: 12 }}>© 2026 · Made in Germany</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12, color: "var(--fg-muted)" }}>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Impressum</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Datenschutz</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>AGB</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Status</a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Landing });
