/* global React, I */
const { useState: useTE } = React;

/* =========================================================
   TEMPLATE EDITOR — single-template design surface
   Left: tools + properties · Center: canvas · Right: layers
   ========================================================= */
function TemplateEditorScreen() {
  const [selected, setSelected] = useTE("placeholder-1");
  const [tool, setTool] = useTE("select");
  const [zoom, setZoom] = useTE(75);
  const [snap, setSnap] = useTE(true);
  const [guides, setGuides] = useTE(true);
  const [showPreview, setShowPreview] = useTE(false);

  const layers = [
    { id: "placeholder-1", type: "placeholder", name: "Motiv A3", x: 28, y: 18, w: 44, h: 58, frame: true },
    { id: "text-1", type: "text", name: "Titel · Kollektion", text: "EDITION 2026", x: 28, y: 80, w: 44, h: 5 },
    { id: "rect-1", type: "rect", name: "Akzent-Balken", x: 28, y: 88, w: 12, h: 1.2 },
  ];
  const sel = layers.find(l => l.id === selected);

  const tools = [
    { k: "select", l: "Auswahl", i: I.compass },
    { k: "placeholder", l: "Motiv-Box", i: I.image },
    { k: "draw", l: "Zeichnen", i: I.edit },
    { k: "text", l: "Text", i: I.tag },
    { k: "rect", l: "Rechteck", i: I.grid },
    { k: "circle", l: "Kreis", i: I.loader },
  ];

  return (
    <div style={{
      height: "calc(100vh - 100px)", minHeight: 860,
      display: "grid", gridTemplateColumns: "260px 1fr 300px", gap: 14,
    }}>
      {/* ================= LEFT: TOOLS + PROPERTIES ================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Hinzufügen</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {tools.slice(1).map(t => (
              <button key={t.k} onClick={() => setTool(t.k)}
                className={tool === t.k ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
                style={{ justifyContent: "flex-start" }}>
                <t.i size={12} /> {t.l}
              </button>
            ))}
          </div>
          <div className="divider" style={{ margin: "12px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={snap} onChange={() => setSnap(!snap)} />
              An Raster ausrichten
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={guides} onChange={() => setGuides(!guides)} />
              Smart Guides
            </label>
          </div>
        </div>

        <div className="card" style={{ padding: 14, flex: 1, minHeight: 0, overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <I.settings size={13} color="var(--fg-muted)" />
            <div style={{ fontSize: 13, fontWeight: 600 }}>Eigenschaften</div>
          </div>
          {!sel ? (
            <div style={{ padding: 18, textAlign: "center", border: "1px dashed var(--border-strong)", borderRadius: 8 }}>
              <div className="t-xs subtle">Wähle ein Element auf der Leinwand.</div>
            </div>
          ) : (
            <PropertyForm el={sel} />
          )}
        </div>
      </div>

      {/* ================= CENTER: CANVAS ================= */}
      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {/* Editor topbar */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-ghost btn-sm"><I.chevronLeft size={12} /> Zurück zum Studio</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input defaultValue="Sofa · Hell · A3 Portrait" style={{
                fontSize: 14, fontWeight: 600, border: "none", background: "transparent", outline: "none",
                padding: "2px 4px", borderRadius: 4, minWidth: 220,
              }} onFocus={e => e.target.style.background = "var(--bg-muted)"} onBlur={e => e.target.style.background = "transparent"} />
              <span className="chip" style={{ fontSize: 10 }}>Poster A3 Lifestyle</span>
              <span className="chip chip-success chip-dot" style={{ fontSize: 10 }}>Gespeichert</span>
            </div>
            <div className="t-xs subtle" style={{ marginTop: 1 }}>2480 × 3508 px · auto-save vor 3s</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(!showPreview)}>
            <I.eye size={12} /> {showPreview ? "Editor" : "Vorschau"}
          </button>
          <button className="btn btn-secondary btn-sm"><I.upload size={12} /> BG ersetzen</button>
          <button className="btn btn-accent btn-sm"><I.check size={12} /> Speichern &amp; Schließen</button>
        </div>

        {/* Canvas area */}
        <div style={{
          flex: 1, minHeight: 0, position: "relative", overflow: "auto",
          background: `
            linear-gradient(45deg, #e9e6e0 25%, transparent 25%),
            linear-gradient(-45deg, #e9e6e0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e9e6e0 75%),
            linear-gradient(-45deg, transparent 75%, #e9e6e0 75%)
          `,
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
          backgroundColor: "#f4f1eb",
          padding: 40,
          display: "grid", placeItems: "center",
        }}>
          <CanvasPreview scale={zoom / 100} layers={layers} selected={selected} setSelected={setSelected} showPreview={showPreview} />
        </div>

        {/* Canvas footer */}
        <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: "var(--fg-muted)" }}>
          <span className="t-mono">W 2480 · H 3508</span>
          <div style={{ flex: 1 }} />
          <span>Zoom</span>
          <input type="range" min={25} max={200} value={zoom} onChange={e => setZoom(+e.target.value)} style={{ width: 120 }} />
          <span className="t-mono" style={{ width: 40, textAlign: "right" }}>{zoom}%</span>
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <button className="btn btn-ghost btn-sm" onClick={() => setZoom(75)} style={{ padding: "2px 8px" }}>Anpassen</button>
        </div>
      </div>

      {/* ================= RIGHT: LAYERS + FRAME ================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
        <div className="card" style={{ padding: 12, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ebenen <span className="subtle" style={{ fontWeight: 400 }}>({layers.length})</span></div>
            <div style={{ display: "flex", gap: 2 }}>
              <button className="btn btn-ghost btn-sm" style={{ padding: 3 }}><I.copy size={11} /></button>
              <button className="btn btn-ghost btn-sm" style={{ padding: 3 }}><I.trash size={11} /></button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "auto" }}>
            {[...layers].reverse().map(l => {
              const Ico = l.type === "placeholder" ? I.image : l.type === "text" ? I.tag : I.grid;
              const isSel = selected === l.id;
              return (
                <div key={l.id} onClick={() => setSelected(l.id)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
                  borderRadius: 6, cursor: "pointer",
                  background: isSel ? "var(--accent-bg)" : "transparent",
                  border: isSel ? "1px solid var(--accent-border)" : "1px solid transparent",
                  fontSize: 12, fontWeight: isSel ? 600 : 400,
                  color: isSel ? "var(--accent)" : "var(--fg)",
                }}>
                  <Ico size={12} color={isSel ? "var(--accent)" : "var(--fg-muted)"} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                  <I.eye size={11} color="var(--fg-faint)" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Rahmen (Default)</div>
          <label className="label">Rahmen-Stil</label>
          <select className="input" defaultValue="wood" style={{ marginBottom: 10 }}>
            <option value="none">Ohne</option>
            <option value="wood">Holz · hell</option>
            <option value="dark">Holz · dunkel</option>
            <option value="black">Schwarz Alu</option>
            <option value="white">Weiß Matt</option>
          </select>
          <label className="label">Schatten</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center" }}>Außen</button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}>Innen</button>
          </div>
          <label className="label">Tiefe <span className="t-mono subtle" style={{ float: "right" }}>0.82</span></label>
          <input type="range" min={0} max={100} defaultValue={82} style={{ width: "100%" }} />
        </div>

        <div className="card" style={{ padding: 14, background: "var(--bg-subtle)" }}>
          <div style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "start", gap: 8 }}>
            <I.sparkles size={13} color="var(--accent)" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 2 }}>Tipp</div>
              Platziere Motiv-Boxen auf ebenen Flächen. Motive werden beim Export perspektivisch in die Box projiziert.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyForm({ el }) {
  if (el.type === "placeholder") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label className="label">Name</label>
          <input className="input" defaultValue={el.name} />
        </div>
        <div>
          <label className="label">Position &amp; Größe</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <LabeledNum k="X" v={el.x} />
            <LabeledNum k="Y" v={el.y} />
            <LabeledNum k="W" v={el.w} />
            <LabeledNum k="H" v={el.h} />
          </div>
        </div>
        <div>
          <label className="label">Rotation <span className="t-mono subtle" style={{ float: "right" }}>0°</span></label>
          <input type="range" min={-180} max={180} defaultValue={0} style={{ width: "100%" }} />
        </div>
        <div>
          <label className="label">Motiv-Sättigung <span className="t-mono subtle" style={{ float: "right" }}>1.00</span></label>
          <input type="range" min={0} max={200} defaultValue={100} style={{ width: "100%" }} />
        </div>
        <div style={{ padding: 10, background: "var(--bg-muted)", borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Rahmen-Override</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <input type="checkbox" defaultChecked /> Default-Rahmen verwenden
          </label>
        </div>
      </div>
    );
  }
  if (el.type === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label className="label">Name</label><input className="input" defaultValue={el.name} /></div>
        <div>
          <label className="label">Text</label>
          <textarea className="input" rows={2} defaultValue={el.text} style={{ resize: "none", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", gap: 6 }}>
          <div>
            <label className="label">Schriftart</label>
            <select className="input">
              <option>Inter</option>
              <option>Instrument Serif</option>
              <option>JetBrains Mono</option>
              <option>Helvetica</option>
            </select>
          </div>
          <div>
            <label className="label">Farbe</label>
            <input type="color" defaultValue="#111111" style={{ width: "100%", height: 28, border: "1px solid var(--border)", borderRadius: 4, padding: 0, background: "transparent" }} />
          </div>
        </div>
        <div>
          <label className="label">Schriftgröße <span className="t-mono subtle" style={{ float: "right" }}>42 px</span></label>
          <input type="range" min={10} max={200} defaultValue={42} style={{ width: "100%" }} />
        </div>
        <div>
          <label className="label">Stil</label>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }}>B</button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center", fontStyle: "italic" }}>I</button>
            <div style={{ width: 8 }} />
            <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center" }}>L</button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}>C</button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}>R</button>
          </div>
        </div>
        <div>
          <label className="label">Text-Bogen <span className="t-mono subtle" style={{ float: "right" }}>0°</span></label>
          <input type="range" min={-360} max={360} defaultValue={0} style={{ width: "100%" }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div><label className="label">Name</label><input className="input" defaultValue={el.name} /></div>
      <div>
        <label className="label">Position &amp; Größe</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <LabeledNum k="X" v={el.x} />
          <LabeledNum k="Y" v={el.y} />
          <LabeledNum k="W" v={el.w} />
          <LabeledNum k="H" v={el.h} />
        </div>
      </div>
      <div>
        <label className="label">Füllfarbe</label>
        <input type="color" defaultValue="#111111" style={{ width: "100%", height: 30, border: "1px solid var(--border)", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function LabeledNum({ k, v }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 8, top: 7, fontSize: 10, fontWeight: 600, color: "var(--fg-faint)" }}>{k}</span>
      <input className="input" defaultValue={v} style={{ paddingLeft: 22, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }} />
    </div>
  );
}

function CanvasPreview({ scale, layers, selected, setSelected, showPreview }) {
  // A3 portrait canvas, rendered at ~340x480 base, scale multiplier
  const baseW = 360, baseH = 510;
  return (
    <div style={{
      width: baseW * scale, height: baseH * scale,
      position: "relative", transition: "width 0.15s, height 0.15s",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)",
    }}>
      {/* Background (wall scene) */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #e8ddd0 0%, #e8ddd0 62%, #d4c5b0 62%, #c8b99e 100%)",
      }}>
        {/* wall texture hint */}
        <div style={{ position: "absolute", inset: "0 0 38% 0", background: "repeating-linear-gradient(135deg, transparent 0 20px, rgba(255,255,255,0.03) 20px 21px)" }} />
        {/* sofa silhouette */}
        <div style={{ position: "absolute", left: "10%", right: "10%", bottom: "4%", height: "30%", background: "#6b5a4a", borderRadius: "14px 14px 4px 4px", boxShadow: "0 -6px 20px rgba(0,0,0,0.1)" }} />
        <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "5%", height: "7%", background: "#d9c9b3", borderRadius: 3 }} />
      </div>

      {/* Elements */}
      {layers.map(el => {
        const isSel = !showPreview && selected === el.id;
        const style = {
          position: "absolute",
          left: `${el.x}%`, top: `${el.y}%`,
          width: `${el.w}%`, height: `${el.h}%`,
        };
        if (el.type === "placeholder") {
          return (
            <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelected(el.id); }} style={{ ...style, cursor: "pointer" }}>
              {/* Frame */}
              {el.frame && <div style={{ position: "absolute", inset: -6, background: "linear-gradient(135deg, #c9a178, #8b6a48)", borderRadius: 1, boxShadow: "0 6px 14px rgba(0,0,0,0.25)" }} />}
              {/* Artwork */}
              <div style={{ position: "absolute", inset: 0, background: showPreview
                ? "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fbbf24 100%)"
                : "repeating-linear-gradient(45deg, rgba(99,102,241,0.15) 0 10px, rgba(99,102,241,0.25) 10px 20px)",
                border: showPreview ? "none" : "2px dashed rgba(99,102,241,0.6)",
                display: "grid", placeItems: "center",
              }}>
                {!showPreview && <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(60,50,150,0.8)", textAlign: "center", padding: 4 }}>Motiv-Box<br/>{el.name}</div>}
              </div>
              {isSel && <SelectionRing />}
            </div>
          );
        }
        if (el.type === "text") {
          return (
            <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelected(el.id); }} style={{
              ...style, cursor: "pointer",
              display: "grid", placeItems: "center",
              fontSize: 11 * scale, fontWeight: 600, letterSpacing: "0.12em",
              color: "#1a1a1a", fontFamily: "'JetBrains Mono', monospace",
            }}>
              {el.text}
              {isSel && <SelectionRing />}
            </div>
          );
        }
        return (
          <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelected(el.id); }} style={{
            ...style, cursor: "pointer", background: "#1a1a1a",
          }}>
            {isSel && <SelectionRing />}
          </div>
        );
      })}
    </div>
  );
}

function SelectionRing() {
  const handle = { position: "absolute", width: 8, height: 8, background: "white", border: "1.5px solid #6366f1", borderRadius: 1 };
  return (
    <>
      <div style={{ position: "absolute", inset: -2, border: "1.5px solid #6366f1", pointerEvents: "none" }} />
      <div style={{ ...handle, top: -6, left: -6 }} />
      <div style={{ ...handle, top: -6, right: -6 }} />
      <div style={{ ...handle, bottom: -6, left: -6 }} />
      <div style={{ ...handle, bottom: -6, right: -6 }} />
      <div style={{ ...handle, top: -6, left: "50%", marginLeft: -4 }} />
      <div style={{ ...handle, bottom: -6, left: "50%", marginLeft: -4 }} />
      <div style={{ ...handle, top: "50%", left: -6, marginTop: -4 }} />
      <div style={{ ...handle, top: "50%", right: -6, marginTop: -4 }} />
    </>
  );
}

Object.assign(window, { TemplateEditorScreen });
