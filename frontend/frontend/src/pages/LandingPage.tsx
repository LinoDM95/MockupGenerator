import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { ThemeToggle } from "../components/ui/ThemeToggle";
import { cn } from "../lib/cn";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useInView,
} from "framer-motion";
import {
  type LucideIcon,
  ArrowRight,
  BarChart3,
  ChevronUp,
  Check,
  FileImage,
  FolderOpen,
  Layers,
  Key,
  Link2,
  Maximize,
  Megaphone,
  Package,
  Rocket,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";

const appleEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* Helper: Animated Grid Background (Lila Kacheln mit starken Linien) */
/* ------------------------------------------------------------------ */
const AnimatedGrid = ({
  width = 40,
  height = 40,
  numSquares = 30,
  className,
}: {
  width?: number;
  height?: number;
  numSquares?: number;
  className?: string;
}) => {
  const id = useId();

  const squares = useMemo(() => {
    return Array.from({ length: numSquares }).map(() => ({
      x: Math.floor(Math.random() * 50),
      y: Math.floor(Math.random() * 50),
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
  }, [numSquares]);

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x="-1"
          y="-1"
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeWidth="1"
            className="stroke-slate-300/80"
          />
        </pattern>
      </defs>

      {/* 1. Ebene: lila Kacheln */}
      <svg x="-1" y="-1" className="overflow-visible">
        {squares.map((sq, i) => (
          <motion.rect
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{
              duration: sq.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: sq.delay,
            }}
            width={width}
            height={height}
            x={sq.x * width}
            y={sq.y * height}
            className="fill-violet-500"
            strokeWidth="0"
          />
        ))}
      </svg>

      {/* 2. Ebene: Raster-Linien über den Kacheln */}
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Helper: fade-in on scroll                                          */
/* ------------------------------------------------------------------ */
const FadeIn = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 32, filter: "blur(4px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{
        duration: reduceMotion ? 0.2 : 0.8,
        delay: reduceMotion ? 0 : delay,
        ease: appleEase,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* SECTION 1 — Hero                                                   */
/* ------------------------------------------------------------------ */
const MOCKUP_COLORS = [
  "bg-indigo-400",
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-pink-400",
  "bg-teal-400",
  "bg-orange-400",
  "bg-cyan-400",
  "bg-fuchsia-400",
  "bg-lime-400",
];

const bentoCardClass =
  "group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-white/70 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:bg-white hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]";

const bentoCardInnerLight =
  "pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-slate-900/5";

const primaryCtaClass =
  "group relative inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-semibold tracking-wide text-white shadow-lg transition-all duration-300 hover:bg-indigo-700 hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.6)]";

const secondaryCtaClass =
  "inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold tracking-wide text-slate-800 shadow-[0_2px_10px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all duration-300 hover:bg-slate-50";

const Hero = () => {
  const reduceMotion = useReducedMotion();
  return (
  <section className="relative overflow-hidden bg-slate-50 pb-24 pt-32">
    {/* Neues animiertes Grid mit weicher Kante (radial-gradient) */}
    <AnimatedGrid 
      width={40} 
      height={40} 
      numSquares={40} 
      className="z-0 opacity-80 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]" 
    />
    <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-[30%] rounded-full bg-indigo-500/15 blur-[120px] mix-blend-multiply" />

    <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: reduceMotion ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.7, delay: reduceMotion ? 0 : 0.1 }}
          className="text-6xl font-bold tracking-tighter text-slate-900 sm:text-7xl lg:text-[5.5rem] leading-[1.05]"
        >
          Die komplette Print-Pipeline.
          <br />
          <span className="bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent drop-shadow-sm">
            Motiv rein. Etsy raus.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.6, delay: reduceMotion ? 0 : 0.25 }}
          className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-500 sm:text-xl"
        >
          Vorlagen anlegen, Mockups rendern, KI-Texte generieren und direkt als Etsy-Entwurf
          veröffentlichen. Ein nahtloser Prozess in einer einzigen Engine.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.55, delay: reduceMotion ? 0 : 0.35 }}
          className="relative mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-4 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 backdrop-blur-md sm:px-6 sm:py-5"
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-900/5"
            aria-hidden
          />
          <div className="relative">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <Key size={16} className="shrink-0 text-indigo-600" strokeWidth={2} aria-hidden />
            Kostenlos starten · KI mit eigenen API-Keys
          </p>
          <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <li className="flex gap-2.5">
              <Check
                size={16}
                className="mt-0.5 shrink-0 text-emerald-600"
                strokeWidth={2}
                aria-hidden
              />
              <span>
                <strong className="font-semibold text-slate-900">Haupt-Tool</strong> (Generator,
                Vorlagen-Studio, Kern-Workflow bis Etsy/Gelato):{" "}
                <strong className="font-semibold text-slate-900">komplett kostenlos</strong> — ohne
                Abo.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Check
                size={16}
                className="mt-0.5 shrink-0 text-emerald-600"
                strokeWidth={2}
                aria-hidden
              />
              <span>
                <strong className="font-semibold text-slate-900">KI-Upscaler &amp; KI-Texte</strong>{" "}
                (z.&nbsp;B. Tags, Beschreibungen):{" "}
                <strong className="font-semibold text-slate-900">eigene API-Keys eintragen</strong>{" "}
                und nutzen — <strong className="font-semibold text-slate-900">kein Abo</strong> der
                App für diese Funktionen; du zahlst nur deinen Anbieter nach Nutzung.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Check
                size={16}
                className="mt-0.5 shrink-0 text-amber-600"
                strokeWidth={2}
                aria-hidden
              />
              <span>
                <strong className="font-semibold text-slate-900">Kostenpflichtig</strong> sind nur
                der Bereich <strong className="font-semibold text-slate-900">„Verbreiten“</strong>{" "}
                (Marketing) und <strong className="font-semibold text-slate-900">„Automatisieren“</strong>{" "}
                — der Rest der Plattform bleibt frei nutzbar.
              </span>
            </li>
          </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.5, delay: reduceMotion ? 0 : 0.4 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link to="/login" className={primaryCtaClass}>
            Kostenlos starten
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
          <a href="#four-pillars" className={secondaryCtaClass}>
            Plattform entdecken
          </a>
        </motion.div>
      </div>

      {/* Floating mockup grid animation */}
      <motion.div
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9, y: reduceMotion ? 0 : 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0.25 : 0.9,
          delay: reduceMotion ? 0 : 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="mx-auto mt-20 max-w-4xl"
      >
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/50 p-6 shadow-[0_20px_60px_rgb(0,0,0,0.05)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-slate-900/5"
            aria-hidden
          />
          <div className="relative z-10">
          {/* Source design file */}
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="absolute -left-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:-left-8"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FileImage size={20} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">design.png</p>
              <p className="text-xs text-slate-500">Upload</p>
            </div>
          </motion.div>

          {/* Mockup output grid */}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {MOCKUP_COLORS.map((color, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 1.0 + i * 0.06,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`absolute inset-x-2 bottom-2 top-6 rounded ${color} opacity-80`} />
                <div className="absolute inset-x-2 top-1.5 h-3 rounded-sm bg-slate-200" />
              </motion.div>
            ))}
          </div>

          {/* Arrow + label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.5 }}
            className="absolute -right-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg sm:-right-8"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Check size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">12 Mockups</p>
              <p className="text-xs text-emerald-600">Generated</p>
            </div>
          </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
  );
};

/* ------------------------------------------------------------------ */
/* SECTION — Vier Bereiche (wie Hauptnavigation)                      */
/* ------------------------------------------------------------------ */
const PILLARS: {
  title: string;
  description: string;
  icon: LucideIcon;
  chip: string;
}[] = [
  {
    title: "Erstellen",
    description:
      "Vorlagen-Studio, Generator und Etsy-Editor: Mockups aus Vorlagen, Motive und Listings — der Kern deines Shops.",
    icon: Layers,
    chip: "Kern",
  },
  {
    title: "Verbreiten",
    description:
      "Kostenpflichtiger Marketing-Bereich: Pinterest, KI-Captions und Warteschlange — zusätzliche Reichweite neben deinen Etsy-Listings.",
    icon: Megaphone,
    chip: "Social",
  },
  {
    title: "Automatisieren",
    description:
      "Kostenpflichtiger Bereich: experimentelle Pipeline mit Etappen von Upscale über SEO und Mockups bis Gelato — transparent im Fortschritt.",
    icon: Rocket,
    chip: "Extra",
  },
  {
    title: "Integrationen",
    description:
      "Etsy, Gelato, Gemini und Vertex (BYOK), Pinterest-OAuth — einmal verbinden. KI-Upscaler und KI-Texte mit eigenen Keys, ohne App-Abo für diese Funktionen.",
    icon: Link2,
    chip: "Ein Konto",
  },
];

const PillarCard = ({
  title,
  description,
  icon: Icon,
  chip,
  index,
}: (typeof PILLARS)[number] & { index: number }) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduceMotion ? 0.2 : 0.45,
        delay: reduceMotion ? 0 : index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={bentoCardClass}
    >
      <div className={bentoCardInnerLight} aria-hidden />
      <div className="relative z-10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition-transform duration-200 group-hover:scale-[1.03]">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {chip}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
    </motion.div>
  );
};

const FourPillars = () => (
  <section id="four-pillars" className="relative border-b border-slate-100 bg-white py-20 lg:py-24">
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-indigo-50/50 to-transparent" />
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <FadeIn className="mb-12 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Die Plattform
        </p>
        <h2 className="text-4xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl">
          Vier Bereiche in der App
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
          Dieselbe Struktur wie in der App: vier Bereiche für Erstellen, Sichtbarkeit,
          Automatisierung und technische Anbindungen.
        </p>
      </FadeIn>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p, i) => (
          <PillarCard key={p.title} {...p} index={i} />
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* SECTION 2 — How it Works (Sticky Scroll)                          */
/* ------------------------------------------------------------------ */
const steps = [
  {
    num: "01",
    title: "Motive hochladen",
    description:
      "Zieh deine Motive in den Generator — einzeln oder als Batch. Das sind die Rohdesigns für alle weiteren Schritte.",
    icon: Upload,
    visual: "upload",
  },
  {
    num: "02",
    title: "Vorlage wählen — Mockups automatisch",
    description:
      "Deine Mockup-Vorlagen kommen aus dem Vorlagen-Studio (einmalig anlegen). Du wählst nur die Vorlage; alle Mockups werden daraus automatisch generiert — kein manuelles Zusammenklicken pro Bild.",
    icon: Layers,
    visual: "template",
  },
  {
    num: "03",
    title: "Titel, Tags & Beschreibung",
    description:
      "Pflege Listing-Texte selbst oder mit KI: Die KI kann sich an aktuelle Markt-Trends und Statistiken orientieren — mit eigenem API-Key (BYOK), ohne Abo der App für diese KI-Funktionen. Beim Multi-Agent-Listing arbeiten mehrere „Agenten“ wie in einer Diskussion zusammen — für stärkere, differenziertere Ergebnisse als ein Einzeiler.",
    icon: Sparkles,
    visual: "listing",
  },
  {
    num: "04",
    title: "Gelato & Etsy-Entwurf",
    description:
      "Das Motiv wird mit allen Metadaten nach Gelato übernommen. Bei Etsy entsteht ein Listing-Entwurf mit Texten — du fügst nur noch die generierten Mockup-Bilder ins Listing ein, dann ist der Gang live.",
    icon: Send,
    visual: "publish",
  },
];

const StepVisualUpload = () => (
  <div className="relative mx-auto w-full max-w-sm">
    <AnimatedGrid 
      width={24} 
      height={24} 
      numSquares={15} 
      className="absolute inset-0 -z-10 rounded-[2rem] opacity-40 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]" 
    />
    <div className="relative rounded-2xl border border-slate-200/60 bg-white/70 p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-900/5"
        aria-hidden
      />
      <div className="relative rounded-xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/30 px-6 py-8">
        <Upload className="mx-auto mb-3 text-indigo-400" size={32} strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-600">Dateien hierher ziehen</p>
      </div>
    </div>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: -40, x: (i - 1) * 30 }}
        whileInView={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
        viewport={{ once: true }}
        className="relative mt-3 flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 backdrop-blur-sm"
      >
        <div className={`h-8 w-8 shrink-0 rounded-md ${["bg-rose-400", "bg-amber-400", "bg-sky-400"][i]}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            design-{String(i + 1).padStart(2, "0")}.png
          </p>
          <p className="text-xs text-slate-500">2.4 MB</p>
        </div>
        <Check className="ml-auto shrink-0 text-emerald-500" size={16} />
      </motion.div>
    ))}
  </div>
);

const StepVisualTemplate = () => (
  <div className="relative mx-auto w-full max-w-sm">
    <div className="relative mb-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-r from-indigo-50/90 to-white/80 px-4 py-3 shadow-[0_4px_24px_rgb(79,70,229,0.08)] ring-1 ring-indigo-900/5">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-900/5"
        aria-hidden
      />
      <Layers className="relative shrink-0 text-indigo-600" size={20} strokeWidth={1.75} />
      <span className="relative text-sm font-semibold text-indigo-900">Vorlage aus Vorlagen-Studio</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
          viewport={{ once: true }}
          className="aspect-[3/4] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgb(0,0,0,0.05)] ring-1 ring-slate-900/5 transition-transform duration-300 hover:-translate-y-0.5"
        >
          <div className="h-2/3 bg-slate-100" />
          <div className={`h-1/3 ${MOCKUP_COLORS[i] ?? "bg-slate-200"} opacity-80`} />
        </motion.div>
      ))}
    </div>
    <motion.p
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      viewport={{ once: true }}
      className="mt-3 text-center text-xs font-medium text-slate-500"
    >
      Mockups automatisch aus Vorlage
    </motion.p>
  </div>
);

const StepVisualListingText = () => (
  <div className="relative mx-auto w-full max-w-sm space-y-3">
    <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/80 px-4 py-3 shadow-[0_4px_20px_rgb(79,70,229,0.07)] ring-1 ring-indigo-900/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
        <Users size={16} strokeWidth={1.75} className="shrink-0 text-indigo-600" aria-hidden />
        Multi-Agent Listing
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-indigo-950/85">
        Mehrere KI-Rollen im Austausch — stärkere Texte als ein Einzeiler, orientiert an
        aktuellen Trends und Markt-Statistiken.
      </p>
    </div>
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Titel · Tags · Beschreibung
      </p>
      <div className="h-2.5 w-4/5 rounded bg-slate-200" />
      <div className="flex flex-wrap gap-1.5">
        {["Sommer", "Poster", "Wohnzimmer"].map((t) => (
          <span
            key={t}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="h-1.5 w-full rounded bg-slate-100" />
        <div className="h-1.5 w-[92%] rounded bg-slate-100" />
        <div className="h-1.5 w-[70%] rounded bg-slate-100" />
      </div>
      <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[10px] font-medium text-emerald-800">
        <Sparkles size={12} className="text-emerald-600" aria-hidden />
        KI optional · oder manuell
      </div>
    </div>
  </div>
);

const StepVisualPublish = () => {
  const reduceMotion = useReducedMotion();
  return (
  <div className="relative mx-auto w-full max-w-sm space-y-4">
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/50 p-5 shadow-[0_24px_48px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10"
        aria-hidden
      />
      <div className="relative z-10 mb-4 flex items-center gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-sm bg-gradient-to-br from-indigo-400/90 to-violet-500/80 shadow-sm"
            />
          ))}
        </div>
        <div>
          <p className="text-sm font-medium text-white">Export &amp; Etsy</p>
          <p className="text-[10px] uppercase tracking-widest text-indigo-200/55">
            Liquid Pipeline
          </p>
        </div>
      </div>
      <div className="relative z-10 mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-indigo-100/90">Fortschritt</span>
        <span className="font-mono tabular-nums text-violet-200">100%</span>
      </div>
      <div className="relative z-10 h-2.5 w-full overflow-hidden rounded-full bg-black/60 ring-1 ring-inset ring-white/10">
        {!reduceMotion ? (
          <motion.div
            className="absolute inset-y-0 left-0 h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent blur-[2px]"
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        ) : null}
        <motion.div
          className="relative z-[1] h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 shadow-[0_0_14px_rgba(139,92,246,0.65)]"
          initial={{ width: "0%" }}
          whileInView={{ width: "100%" }}
          transition={{
            duration: 1.5,
            delay: 0.35,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          }}
          viewport={{ once: true }}
        />
      </div>
      <p className="relative z-10 mt-3 text-[11px] leading-relaxed text-indigo-200/55">
        Export &amp; Etsy-Entwurf — gleicher Fokus wie im App-Wartebereich.
      </p>
    </div>
    {[
      { title: "Gelato", sub: "Produkt, Bilder, Tags, Beschreibung" },
      { title: "Etsy", sub: "Listing-Entwurf mit Texten" },
    ].map(({ title, sub }, i) => (
      <motion.div
        key={title}
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5 + i * 0.2, duration: 0.4 }}
        viewport={{ once: true }}
        className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center"
      >
        <Check className="shrink-0 text-emerald-600 sm:mt-0" size={18} strokeWidth={2} aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-emerald-900">{title}</span>
          <p className="text-xs text-emerald-800/90">{sub}</p>
        </div>
        <span className="shrink-0 self-start rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:self-center">
          {i === 0 ? "Synchron" : "Entwurf"}
        </span>
      </motion.div>
    ))}
    <p className="text-center text-xs leading-relaxed text-slate-500">
      Letzter Schritt auf Etsy: die generierten Mockup-Bilder ins Listing legen — dann
      veröffentlichen.
    </p>
  </div>
  );
};

const StepVisualAfterFlow = () => (
  <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-violet-200/50 bg-gradient-to-br from-violet-50/95 to-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] ring-1 ring-slate-900/5">
    <div
      className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-slate-900/5"
      aria-hidden
    />
    <div className="relative z-10">
    <div className="mb-3 flex flex-wrap items-center gap-2 text-violet-900">
      <Rocket size={18} strokeWidth={1.75} aria-hidden />
      <span className="text-sm font-semibold">Automatisieren</span>
      <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
        Kostenpflichtig · Vorschau
      </span>
    </div>
    <p className="mb-4 text-xs leading-relaxed text-violet-900/90">
      Für große Serien: experimentelle Pipeline mit Etappen (u. a. Upscale, SEO, Mockups,
      Gelato) — <strong className="font-semibold">kostenpflichtiger Bereich</strong>, nicht der
      gleiche Weg wie der kostenlose Kern-Workflow oben.
    </p>
    <div className="flex flex-col gap-2">
      {["Upscale", "SEO", "Mockups", "Gelato"].map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08 + i * 0.07, duration: 0.25 }}
          viewport={{ once: true }}
          className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white/90 px-3 py-2 text-xs font-medium text-violet-900"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
            {i + 1}
          </span>
          {label}
          <Check className="ml-auto text-emerald-600" size={14} strokeWidth={2} aria-hidden />
        </motion.div>
      ))}
    </div>
    </div>
  </div>
);

const STEP_VISUALS: Record<string, React.FC> = {
  upload: StepVisualUpload,
  template: StepVisualTemplate,
  listing: StepVisualListingText,
  publish: StepVisualPublish,
};

const HowItWorks = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how-it-works" ref={containerRef} className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
      {/* Auch hier ein leichter Hintergrundeffekt, aber dezent */}
      <AnimatedGrid 
        width={48} 
        height={48} 
        numSquares={20} 
        className="z-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]" 
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
            So funktioniert&apos;s
          </p>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl">
            Vier Schritte — vom Motiv zum Etsy-Entwurf
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
            Der gesamte Kernablauf der Plattform an einem Ort: Kurztexte links, Beispiele
            rechts — von Rohmotiv bis Gelato und Etsy-Entwurf.
          </p>
        </FadeIn>

        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-8 top-0 hidden h-full w-px bg-slate-200 lg:block">
            <motion.div
              style={{ height: progressHeight }}
              className="w-full bg-indigo-600"
            />
          </div>

          <div className="space-y-24 lg:space-y-32">
            {steps.map((step, i) => {
              const Visual = STEP_VISUALS[step.visual];
              return (
                <div key={step.num} className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                  <FadeIn delay={0.1} className="lg:pl-20">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                        <step.icon size={22} strokeWidth={1.75} />
                      </div>
                      <span className="text-sm font-bold text-slate-400">{step.num}</span>
                    </div>
                    <h3 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="max-w-md text-base leading-relaxed text-slate-500">
                      {step.description}
                    </p>
                  </FadeIn>
                  <FadeIn delay={0.25} className={i % 2 === 1 ? "lg:order-first" : ""}>
                    {Visual ? <Visual /> : null}
                  </FadeIn>
                </div>
              );
            })}
          </div>

          <div
            id="after-core-flow"
            className="mt-24 border-t border-slate-200 pt-20 lg:mt-32 lg:pt-28"
          >
            <FadeIn className="mb-10 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
                Noch mehr
              </p>
              <h3 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
                Automatisierungs-Pipeline
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
                Zusätzlich zum manuellen Kern-Workflow: eine experimentelle Pipeline für
                viele Motive auf einmal — mit klaren Etappen und Fortschritt pro Motiv.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <StepVisualAfterFlow />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* SECTION — Zusatzmodule (Upscaler & Verbreiten getrennt)            */
/* ------------------------------------------------------------------ */
const ExtraModules = () => (
  <section id="extra-modules" className="border-b border-slate-100 bg-white py-20 lg:py-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <FadeIn className="mb-12 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Optional
        </p>
        <h2 className="text-4xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl">
          Zusatzmodule — einzeln nutzbar
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
          <span className="font-medium text-slate-800">
            KI-Upscaler (Vertex, BYOK) und Verbreiten (Pinterest)
          </span>{" "}
          sind zusätzliche Module: den Upscaler nutzt du mit eigenem API-Key —{" "}
          <span className="font-medium text-slate-800">kein Abo der App</span> für diese
          KI-Funktion. <span className="font-medium text-slate-800">Verbreiten (Marketing)</span>{" "}
          ist kostenpflichtig und vom kostenlosen Kern-Workflow getrennt.
        </p>
      </FadeIn>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <FadeIn>
          <div className={`${bentoCardClass} bg-gradient-to-br from-slate-50/95 to-white`}>
            <div className={bentoCardInnerLight} aria-hidden />
            <div className="relative z-10 flex h-full flex-col">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900">
              <Maximize size={14} strokeWidth={1.75} aria-hidden />
              KI-Upscaler
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              Vertex · Bildqualität hochfahren
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">
              Eigenes Google-Cloud-Dienstkonto (BYOK): API-Key eintragen und nutzen —{" "}
              <strong className="font-semibold text-slate-800">kein Abo der App</strong> für den
              Upscaler. Motive vor dem Export oder für den Druck hochskalieren; im Generator
              nutzt du parallel KI für Texte/Tags ebenfalls mit eigenem Key (Gemini).
            </p>
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.08}>
          <div className={`${bentoCardClass} border-rose-100/50 bg-gradient-to-br from-rose-50/85 to-white`}>
            <div className={bentoCardInnerLight} aria-hidden />
            <div className="relative z-10 flex h-full flex-col">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
              <Megaphone size={14} strokeWidth={1.75} aria-hidden />
              Verbreiten · Marketing
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              Pinterest &amp; Sichtbarkeit
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">
              <strong className="font-semibold text-slate-800">Kostenpflichtiger Marketing-Bereich:</strong>{" "}
              Pinterest verbinden, Boards wählen, Pins mit KI-Captions aus der Warteschlange
              posten — Reichweite neben Etsy (Bereich „Verbreiten“), unabhängig vom kostenlosen
              Haupt-Tool.
            </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* SECTION 3 — Bento Grid (2×2)                                       */
/* ------------------------------------------------------------------ */
const BentoGrid = () => (
  <section className="bg-white py-24 lg:py-32">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <FadeIn className="mb-16 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Features
        </p>
        <h2 className="text-4xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl">
          Alles im Überblick
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
          Funktionen und Anbindungen im Überblick — ohne den Ablauf von oben zu wiederholen.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FadeIn>
          <div className={bentoCardClass}>
            <div className={bentoCardInnerLight} aria-hidden />
            <div className="relative z-10 flex h-full flex-col">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Layers size={14} strokeWidth={1.75} /> Erstellen
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">
              Generator, Vorlagen-Studio, Etsy
            </h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-500">
              Mockups aus Vorlagen erzeugen, Sets im Vorlagen-Studio pflegen und Etsy-Listings
              bearbeiten — der zentrale Arbeitsbereich für deinen Shop.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {[Layers, FolderOpen, ShoppingBag].map((Ic, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + j * 0.06, duration: 0.25 }}
                  viewport={{ once: true }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
                >
                  <Ic size={18} strokeWidth={1.75} />
                </motion.div>
              ))}
            </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className={bentoCardClass}>
            <div className={bentoCardInnerLight} aria-hidden />
            <div className="relative z-10 flex h-full flex-col">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
              <Megaphone size={14} strokeWidth={1.75} /> Verbreiten
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">
              Verbreiten
            </h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-500">
              <strong className="font-semibold text-slate-800">Kostenpflichtiger Marketing-Bereich:</strong>{" "}
              Pinterest anbinden, Boards wählen und Pins mit KI-Captions aus der Warteschlange
              — für Reichweite neben Etsy.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-3">
              <Sparkles size={18} className="text-rose-600" strokeWidth={1.75} />
              <span className="text-sm font-medium text-rose-900">KI · Captions &amp; Queue</span>
            </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className={bentoCardClass}>
            <div className={bentoCardInnerLight} aria-hidden />
            <div className="relative z-10 flex h-full flex-col">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                <Rocket size={14} strokeWidth={1.75} /> Automatisieren
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                Kostenpflichtig · Vorschau
              </span>
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">
              Pipeline: mehrere Motive, klare Etappen
            </h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-500">
              Experimenteller Lauf mit Phasen wie Upscale, SEO, Mockups und Gelato —{" "}
              <strong className="font-semibold text-slate-800">kostenpflichtiger Bereich</strong>;
              Status pro Motiv, nicht produktionsreif, aber transparenter Überblick.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Upscale", "SEO", "Mockups", "Gelato"].map((label, i) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.2 }}
                  viewport={{ once: true }}
                  className="rounded-lg bg-violet-100/80 px-2.5 py-1 text-xs font-medium text-violet-900"
                >
                  {label}
                </motion.span>
              ))}
            </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className={bentoCardClass}>
            <div className={bentoCardInnerLight} aria-hidden />
            <div className="relative z-10 flex h-full flex-col">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900">
              <Link2 size={14} strokeWidth={1.75} /> Integrationen
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">
              Etsy, Gelato, KI, Pinterest
            </h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-500">
              OAuth für Etsy und Pinterest, Gelato-Store und API, Gemini für Texte sowie
              Vertex für den Upscaler (BYOK) — zentral konfiguriert.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Etsy", icon: ShoppingBag },
                { label: "Gelato", icon: Package },
                { label: "Gemini", icon: Sparkles },
                { label: "Vertex", icon: Maximize },
              ].map(({ label, icon: Ic }, i) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  <Ic size={12} strokeWidth={1.75} className="text-slate-500" />
                  {label}
                </motion.span>
              ))}
            </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.06} className="md:col-span-2">
          <div className={bentoCardClass}>
            <div className={bentoCardInnerLight} aria-hidden />
            <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  <BarChart3 size={14} strokeWidth={1.75} /> Etsy Analytics
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">
                  Nischen &amp; Listings
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                  Listings analysieren, Tags und Trends im Blick — ergänzend zu
                  Erstellung und Verbreitung.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Wall Art", "Poster", "T-Shirt", "Mug", "Tote Bag"].map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex h-32 items-end gap-2">
                {[35, 52, 44, 65, 58, 78, 70, 90, 85, 95].map((h, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + idx * 0.06, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 opacity-80"
                  />
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* SECTION 4 — Logo Marquee                                           */
/* ------------------------------------------------------------------ */
const MARQUEE_ITEMS = [
  { icon: ShoppingBag, label: "Etsy" },
  { icon: Package, label: "Gelato" },
  { icon: Sparkles, label: "KI · Gemini" },
  { icon: Maximize, label: "Upscaler · Vertex" },
  { icon: Megaphone, label: "Pinterest" },
  { icon: FolderOpen, label: "Vorlagen-Studio" },
  { icon: TrendingUp, label: "Analytics" },
  { icon: Layers, label: "Mockups" },
  { icon: Rocket, label: "Pipeline" },
  { icon: Search, label: "Niche Research" },
  { icon: FileImage, label: "Templates" },
  { icon: Send, label: "Publishing" },
  { icon: Link2, label: "Integrationen" },
];

const Marquee = () => (
  <section className="overflow-hidden border-y border-slate-200 bg-slate-50 py-10">
    <div className="relative flex">
      <div className="animate-marquee flex shrink-0 items-center gap-12 pr-12">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 text-slate-400"
          >
            <item.icon size={20} strokeWidth={1.5} />
            <span className="whitespace-nowrap text-sm font-semibold tracking-wide">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div className="animate-marquee flex shrink-0 items-center gap-12 pr-12" aria-hidden>
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 text-slate-400"
          >
            <item.icon size={20} strokeWidth={1.5} />
            <span className="whitespace-nowrap text-sm font-semibold tracking-wide">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* SECTION 5 — Final CTA                                              */
/* ------------------------------------------------------------------ */
const FinalCTA = () => (
  <section className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
    {/* Finales Grid mit dichterer Kachelanordnung für einen krönenden Abschluss */}
    <AnimatedGrid 
      width={32} 
      height={32} 
      numSquares={60} 
      className="z-0 opacity-100 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" 
    />
    <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[480px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-[100px]" />

    <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
      <FadeIn>
        <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900 sm:text-5xl lg:text-6xl">
          Schluss mit manuellen Mockups.
          <br />
          <span className="bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Starte jetzt.
          </span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-slate-500">
          Motive, Vorlagen-Mockups, Listing-Texte mit oder ohne KI (eigene API-Keys), Gelato-Export
          und Etsy-Listing-Entwurf — der Kern kostenlos; KI-Upscaler &amp; Co. per BYOK ohne
          App-Abo. Marketing &amp; Automatisierung kostenpflichtig.
        </p>
        <div className="mt-10">
          <Link to="/login" className={`${primaryCtaClass} text-lg`}>
            Kostenlos starten
            <ArrowRight
              size={20}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </FadeIn>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* SECTION 6 — Footer                                                 */
/* ------------------------------------------------------------------ */
const Footer = () => (
  <footer className="border-t border-slate-200/60 bg-slate-50 py-12">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
      <span className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900">
        <Zap size={18} className="text-indigo-600" fill="currentColor" strokeWidth={2} />
        Creative Engine
      </span>
      <p className="text-sm font-medium text-slate-400">
        &copy; {new Date().getFullYear()} Alle Rechte vorbehalten.
      </p>
    </div>
  </footer>
);

/* ------------------------------------------------------------------ */
/* Scroll-to-top (erscheint nach etwas Scroll)                         */
/* ------------------------------------------------------------------ */
const SCROLL_TOP_THRESHOLD_PX = 360;

const LandingScrollToTop = () => {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_TOP_THRESHOLD_PX);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="scroll-top"
          type="button"
          aria-label="Nach oben scrollen"
          title="Nach oben"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.92 }}
          transition={{
            duration: reduceMotion ? 0.12 : 0.28,
            ease: appleEase,
          }}
          onClick={handleScrollToTop}
          className={cn(
            "group fixed z-40 flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14",
            "bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 sm:bottom-8 sm:right-6",
            "rounded-2xl bg-white text-indigo-600",
            "shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/5",
            "transition-[box-shadow,transform,background-color] duration-300 ease-out",
            "hover:scale-[1.04] hover:bg-indigo-50/90 hover:text-indigo-700",
            "hover:shadow-[0_16px_48px_rgba(79,70,229,0.2)] hover:ring-indigo-500/25",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20",
            "active:scale-[0.97] dark:bg-slate-800 dark:text-indigo-300 dark:ring-white/10",
            "dark:hover:bg-slate-700/95 dark:hover:text-indigo-200 dark:hover:ring-indigo-400/25",
          )}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/12 via-transparent to-violet-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-fuchsia-500/10 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />
          <ChevronUp
            className="relative z-10 shrink-0"
            size={22}
            strokeWidth={2.25}
            aria-hidden
          />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
/* ------------------------------------------------------------------ */
export const LandingPage = () => (
  <div className="min-h-screen bg-slate-50 font-sans">
    <LandingScrollToTop />
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:px-6">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/40 bg-white/70 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:px-6">
        <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-inner">
            <Zap size={16} className="text-white" fill="currentColor" />
          </span>
          Creative Engine
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#how-it-works"
            className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600 sm:inline"
          >
            So funktioniert&apos;s
          </a>
          <a
            href="#four-pillars"
            className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600 sm:inline"
          >
            Bereiche
          </a>
          <ThemeToggle size="sm" className="shrink-0" />
          <Link
            to="/login"
            className="rounded-full bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md ring-1 ring-inset ring-indigo-500/30 transition-all hover:scale-[1.02] hover:bg-indigo-700"
          >
            Anmelden
          </Link>
        </div>
      </div>
    </header>

    <Hero />
    <HowItWorks />
    <FourPillars />
    <ExtraModules />
    <BentoGrid />
    <Marquee />
    <FinalCTA />
    <Footer />
  </div>
);