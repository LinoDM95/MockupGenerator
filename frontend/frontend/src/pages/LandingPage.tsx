import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
} from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  FileImage,
  Layers,
  Package,
  Rocket,
  Search,
  Send,
  ShoppingBag,
  Tag,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helper: fade-in on scroll                                          */
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
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  SECTION 1 — Hero                                                   */
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

const Hero = () => (
  <section className="relative overflow-hidden">
    {/* Soft mesh gradient background */}
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -top-24 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />
      <div className="absolute top-40 -right-40 h-[400px] w-[400px] rounded-full bg-violet-100/40 blur-3xl" />
      <div className="absolute -bottom-20 -left-32 h-[350px] w-[500px] rounded-full bg-sky-100/40 blur-3xl" />
    </div>

    <div className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pt-36">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700"
        >
          <Zap size={14} /> Print-on-Demand Automation
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
        >
          The Ultimate Print-on-Demand
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Automation Engine.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl"
        >
          Create one template. Generate 100s of mockups. Sync directly to
          Gelato&nbsp;&amp;&nbsp;Etsy. Dominate your niche with advanced analytics.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            Kostenlos starten
            <ArrowRight
              size={18}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
          >
            So funktioniert&apos;s
          </a>
        </motion.div>
      </div>

      {/* Floating mockup grid animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mx-auto mt-20 max-w-4xl"
      >
        <div className="relative rounded-2xl border border-slate-200/60 bg-white/60 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-md sm:p-10">
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
      </motion.div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  SECTION 2 — How it Works (Sticky Scroll)                          */
/* ------------------------------------------------------------------ */
const steps = [
  {
    num: "01",
    title: "Designs hochladen",
    description:
      "Lade deine Designs per Drag & Drop hoch. Das System akzeptiert PNG, JPG und SVG — einzeln oder als Batch mit 20+ Dateien gleichzeitig.",
    icon: Upload,
    visual: "upload",
  },
  {
    num: "02",
    title: "Master-Template anwenden",
    description:
      "Erstelle einmalig ein Mockup-Template. Mit einem Klick wird es auf alle hochgeladenen Designs gleichzeitig angewendet — in Sekunden statt Stunden.",
    icon: Layers,
    visual: "template",
  },
  {
    num: "03",
    title: "Automatisch publizieren",
    description:
      "Deine fertigen Mockups werden direkt an Gelato oder Etsy übermittelt. Listings, Bilder und Tags — alles automatisiert.",
    icon: Send,
    visual: "publish",
  },
];

const StepVisualUpload = () => (
  <div className="relative mx-auto w-full max-w-sm">
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <Upload className="mx-auto mb-3 text-slate-400" size={32} strokeWidth={1.5} />
      <p className="text-sm font-medium text-slate-600">Dateien hierher ziehen</p>
    </div>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: -40, x: (i - 1) * 30 }}
        whileInView={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
        viewport={{ once: true }}
        className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
      >
        <div className={`h-8 w-8 rounded ${["bg-rose-400", "bg-amber-400", "bg-sky-400"][i]}`} />
        <div>
          <p className="text-sm font-medium text-slate-800">
            design-{String(i + 1).padStart(2, "0")}.png
          </p>
          <p className="text-xs text-slate-500">2.4 MB</p>
        </div>
        <Check className="ml-auto text-emerald-500" size={16} />
      </motion.div>
    ))}
  </div>
);

const StepVisualTemplate = () => (
  <div className="relative mx-auto w-full max-w-sm">
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
      <Layers className="text-indigo-600" size={20} strokeWidth={1.75} />
      <span className="text-sm font-semibold text-indigo-800">Master Template</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
          viewport={{ once: true }}
          className="aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-2/3 bg-slate-100" />
          <div className={`h-1/3 ${MOCKUP_COLORS[i] ?? "bg-slate-200"} opacity-70`} />
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
      6 Mockups in 2.3s generiert
    </motion.p>
  </div>
);

const StepVisualPublish = () => (
  <div className="relative mx-auto w-full max-w-sm space-y-4">
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Publishing…</span>
        <span className="text-xs font-semibold text-indigo-600">100%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: "0%" }}
          whileInView={{ width: "100%" }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
          viewport={{ once: true }}
          className="h-full rounded-full bg-indigo-600"
        />
      </div>
    </div>
    {["Gelato Storefront", "Etsy Listing"].map((label, i) => (
      <motion.div
        key={label}
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5 + i * 0.2, duration: 0.4 }}
        viewport={{ once: true }}
        className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
      >
        <Check className="text-emerald-600" size={18} strokeWidth={2} />
        <span className="text-sm font-semibold text-emerald-800">{label}</span>
        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Published
        </span>
      </motion.div>
    ))}
  </div>
);

const STEP_VISUALS: Record<string, React.FC> = {
  upload: StepVisualUpload,
  template: StepVisualTemplate,
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
    <section id="how-it-works" ref={containerRef} className="relative bg-slate-50 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
            So funktioniert&apos;s
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Drei Schritte. Null Handarbeit.
          </h2>
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
                    <h3 className="mb-3 text-2xl font-bold text-slate-900">{step.title}</h3>
                    <p className="max-w-md text-base text-slate-600 leading-relaxed">
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
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  SECTION 3 — Bento Grid                                             */
/* ------------------------------------------------------------------ */
const BentoGrid = () => (
  <section className="bg-white py-24 lg:py-32">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <FadeIn className="mb-16 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Features
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Alles, was du brauchst.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Von der Mockup-Erstellung über den automatischen Upload bis zur Nischen-Analyse
          — in einer Plattform.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Box 1 — Gelato (large, 2 cols) */}
        <FadeIn className="md:col-span-2">
          <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-lg">
            <div className="mb-6">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Package size={14} /> Gelato Integration
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">
                Direct Gelato Sync
              </h3>
              <p className="max-w-md text-sm text-slate-600 leading-relaxed">
                Dein Design geht direkt in die Gelato-Pipeline. Produkt erstellen,
                Mockups generieren, veröffentlichen — alles in einem Flow.
              </p>
            </div>
            {/* Abstract pipeline visualization */}
            <div className="flex items-center gap-3">
              {[
                { label: "Design", icon: FileImage, bg: "bg-indigo-100 text-indigo-600" },
                { label: "Mockup", icon: Layers, bg: "bg-violet-100 text-violet-600" },
                { label: "Gelato", icon: Rocket, bg: "bg-emerald-100 text-emerald-600" },
              ].map((node, j) => (
                <motion.div key={node.label} className="flex items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + j * 0.15, duration: 0.4 }}
                    viewport={{ once: true }}
                    className={`flex items-center gap-2 rounded-lg ${node.bg} px-4 py-2.5`}
                  >
                    <node.icon size={16} strokeWidth={1.75} />
                    <span className="text-sm font-medium">{node.label}</span>
                  </motion.div>
                  {j < 2 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: 0.3 + j * 0.15 }}
                      viewport={{ once: true }}
                    >
                      <ArrowRight className="text-slate-300" size={18} />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Box 2 — Mockup Engine */}
        <FadeIn delay={0.15}>
          <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <Layers size={14} /> Mockup Engine
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              Create Once, Use Forever
            </h3>
            <p className="mb-6 text-sm text-slate-600 leading-relaxed">
              Ein Master-Template. Unendlich viele Outputs. Lade 20 Designs hoch und
              erhalte in Sekunden 100+ fertige Mockups.
            </p>
            <div className="flex items-start gap-4">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                viewport={{ once: true }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-600"
              >
                <Layers size={24} strokeWidth={1.5} />
              </motion.div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, k) => (
                  <motion.div
                    key={k}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + k * 0.04, duration: 0.25 }}
                    viewport={{ once: true }}
                    className={`h-6 w-6 rounded ${MOCKUP_COLORS[k] ?? "bg-slate-200"} opacity-70`}
                  />
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Box 3 — Etsy Analytics (full width on md) */}
        <FadeIn delay={0.1} className="md:col-span-3">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-lg">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <BarChart3 size={14} /> Etsy Analytics
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">
                  Etsy Niche &amp; Listing Analytics
                </h3>
                <p className="max-w-md text-sm text-slate-600 leading-relaxed">
                  Analysiere Listings, finde profitable Nischen und tracke
                  Competitor-Tags. Datengetriebene Entscheidungen für dein
                  Etsy-Business.
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
              <div className="flex h-32 items-end gap-2 self-end">
                {/* Abstract chart bars */}
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
/*  SECTION 4 — Logo Marquee                                           */
/* ------------------------------------------------------------------ */
const MARQUEE_ITEMS = [
  { icon: ShoppingBag, label: "Etsy" },
  { icon: Package, label: "Gelato" },
  { icon: TrendingUp, label: "Analytics" },
  { icon: Layers, label: "Mockups" },
  { icon: Rocket, label: "Automation" },
  { icon: Search, label: "Niche Research" },
  { icon: FileImage, label: "Templates" },
  { icon: Send, label: "Publishing" },
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
/*  SECTION 5 — Final CTA                                              */
/* ------------------------------------------------------------------ */
const FinalCTA = () => (
  <section className="relative overflow-hidden py-24 lg:py-32">
    <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
    <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-100/50 blur-3xl" />

    <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
      <FadeIn>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Schluss mit manuellen Mockups.
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Starte jetzt.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
          Spare Stunden pro Woche. Automatisiere deinen gesamten Print-on-Demand Workflow
          — von der Idee bis zum fertigen Listing.
        </p>
        <div className="mt-10">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            Kostenlos starten
            <ArrowRight
              size={20}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </FadeIn>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  SECTION 6 — Footer                                                 */
/* ------------------------------------------------------------------ */
const Footer = () => (
  <footer className="border-t border-slate-200 bg-white py-8">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Zap size={16} className="text-indigo-600" strokeWidth={2} />
        Mockup Generator Pro
      </span>
      <p className="text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Mockup Generator Pro. All rights reserved.
      </p>
    </div>
  </footer>
);

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export const LandingPage = () => (
  <div className="min-h-screen bg-white">
    {/* Navbar */}
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          <Zap size={20} className="text-indigo-600" strokeWidth={2} />
          Mockup Generator Pro
        </span>
        <div className="flex items-center gap-3">
          <a
            href="#how-it-works"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline"
          >
            So funktioniert&apos;s
          </a>
          <Link
            to="/login"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700"
          >
            Anmelden
          </Link>
        </div>
      </div>
    </header>

    <Hero />
    <HowItWorks />
    <BentoGrid />
    <Marquee />
    <FinalCTA />
    <Footer />
  </div>
);
