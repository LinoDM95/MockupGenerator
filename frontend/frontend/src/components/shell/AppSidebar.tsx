import {
  ChevronLeft,
  ChevronRight,
  Folder,
  Layers,
  Link2,
  Maximize,
  UserCircle,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Link, NavLink, useLocation } from "react-router-dom";

import { ACCOUNT_PATH } from "../../lib/appNavigation";
import { cn } from "../../lib/ui/cn";
import { useAppStore } from "../../store/appStore";
import { AppLogoMark } from "../ui/branding/AppLogoMark";

const NAV_LOCK_TITLE =
  "Während eines laufenden Vorgangs ist die Navigation gesperrt. Bitte warten oder Vorgang abbrechen.";

type NavItemProps = {
  to: string;
  icon: typeof Layers;
  label: string;
  collapsed: boolean;
  navigationLocked: boolean;
  end?: boolean;
  onNavigate?: () => void;
};

const SidebarNavItem = ({
  to,
  icon: Icon,
  label,
  collapsed,
  navigationLocked,
  end,
  onNavigate,
}: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    onClick={(e) => {
      if (navigationLocked) {
        e.preventDefault();
        return;
      }
      onNavigate?.();
    }}
    title={collapsed ? label : navigationLocked ? NAV_LOCK_TITLE : undefined}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        collapsed && "justify-center px-0 py-2",
        navigationLocked && "pointer-events-none opacity-50",
        isActive
          ? "border-[color:var(--pf-border)] bg-[color:var(--pf-bg-muted)] text-[color:var(--pf-fg)]"
          : "text-[color:var(--pf-fg-muted)] hover:bg-[color:var(--pf-bg-muted)] hover:text-[color:var(--pf-fg)]",
      )
    }
  >
    {({ isActive }) => (
      <>
        <Icon
          size={15}
          strokeWidth={2}
          className={cn(
            "shrink-0",
            isActive ? "text-[color:var(--pf-accent)]" : "text-[color:var(--pf-fg-subtle)]",
          )}
        />
        {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      </>
    )}
  </NavLink>
);

type GroupProps = {
  eyebrow?: string;
  collapsed: boolean;
  children: React.ReactNode;
};

const SidebarGroup = ({ eyebrow, collapsed, children }: GroupProps) => (
  <div className="mb-4">
    {!collapsed && eyebrow ? (
      <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {eyebrow}
      </div>
    ) : null}
    <div className="flex flex-col gap-0.5">{children}</div>
  </div>
);

type AppSidebarProps = {
  variant: "desktop" | "drawer";
  onNavigate?: () => void;
  /** Desktop: eingeklappt (schmale Leiste + Lasche). */
  desktopCollapsed: boolean;
  onDesktopCollapsedChange: (collapsed: boolean) => void;
};

export const AppSidebar = ({
  variant,
  onNavigate,
  desktopCollapsed: collapsed,
  onDesktopCollapsedChange: setCollapsed,
}: AppSidebarProps) => {
  const navigationLocked = useAppStore((s) => s.navigationLocked);
  const templateSets = useAppStore((s) => s.templateSets);
  const artworks = useAppStore((s) => s.artworks);
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const widthClass = collapsed ? "w-14" : "w-[232px]";
  const isDrawer = variant === "drawer";

  const shellWrapperClass = cn(
    "relative z-10 h-full min-h-0 shrink-0",
    isDrawer ? "w-[232px]" : widthClass,
    !isDrawer &&
      !reduceMotion &&
      "transition-[width] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)]",
  );

  const asideClass = cn(
    "flex h-full min-h-0 w-full flex-col overflow-x-hidden border-r border-[color:var(--pf-border)] bg-[color:var(--pf-bg)]",
  );

  const integrationsActive = location.pathname.startsWith("/app/integrationen");

  return (
    <div className={shellWrapperClass}>
      <aside className={asideClass}>
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-[color:var(--pf-border)] px-3",
          collapsed && !isDrawer ? "justify-center" : "gap-2.5",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 w-full items-center",
            collapsed && !isDrawer ? "justify-center" : "min-w-0 flex-1 gap-2.5",
          )}
        >
          <AppLogoMark tileClassName="h-6 w-6" iconSize={14} />
          {!collapsed || isDrawer ? (
            <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-[color:var(--pf-fg)]">
              PrintFlow
            </span>
          ) : null}
          {!collapsed && !isDrawer ? (
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              title="Einklappen"
              aria-label="Seitenleiste einklappen"
              onClick={() => setCollapsed(true)}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5"
        aria-label="App"
      >
        <SidebarGroup eyebrow="Erstellen" collapsed={collapsed && !isDrawer}>
          <SidebarNavItem
            to="/app/erstellen/generator"
            icon={Layers}
            label="Generator"
            collapsed={collapsed && !isDrawer}
            navigationLocked={navigationLocked}
            onNavigate={onNavigate}
          />
          <SidebarNavItem
            to="/app/erstellen/vorlagen"
            icon={Folder}
            label="Vorlagen-Studio"
            collapsed={collapsed && !isDrawer}
            navigationLocked={navigationLocked}
            onNavigate={onNavigate}
          />
          <SidebarNavItem
            to="/app/erstellen/upscaler"
            icon={Maximize}
            label="Upscaler"
            collapsed={collapsed && !isDrawer}
            navigationLocked={navigationLocked}
            onNavigate={onNavigate}
          />
        </SidebarGroup>

        <SidebarGroup eyebrow="Konto" collapsed={collapsed && !isDrawer}>
          <Link
            to="/app/integrationen/alle"
            onClick={(e) => {
              if (navigationLocked) {
                e.preventDefault();
                return;
              }
              onNavigate?.();
            }}
            title={collapsed && !isDrawer ? "Integrationen" : navigationLocked ? NAV_LOCK_TITLE : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              collapsed && !isDrawer && "justify-center px-0 py-2",
              navigationLocked && "pointer-events-none opacity-50",
              integrationsActive
                ? "border-[color:var(--pf-border)] bg-[color:var(--pf-bg-muted)] text-[color:var(--pf-fg)]"
                : "text-[color:var(--pf-fg-muted)] hover:bg-[color:var(--pf-bg-muted)] hover:text-[color:var(--pf-fg)]",
            )}
          >
            <Link2
              size={15}
              strokeWidth={2}
              className={cn(
                "shrink-0",
                integrationsActive
                  ? "text-[color:var(--pf-accent)]"
                  : "text-[color:var(--pf-fg-subtle)]",
              )}
            />
            {!collapsed || isDrawer ? (
              <span className="min-w-0 flex-1 truncate">Integrationen</span>
            ) : null}
          </Link>
          <SidebarNavItem
            to={ACCOUNT_PATH}
            icon={UserCircle}
            label="Konto"
            end
            collapsed={collapsed && !isDrawer}
            navigationLocked={navigationLocked}
            onNavigate={onNavigate}
          />
        </SidebarGroup>
      </nav>

      {!collapsed || isDrawer ? (
        <div className="shrink-0 border-t border-[color:var(--pf-border)] p-3">
          <div className="rounded-lg px-2 py-1.5 text-[11px] text-[color:var(--pf-fg-muted)]">
            <span className="font-medium text-[color:var(--pf-fg)]">Sets</span>{" "}
            {templateSets.length} · <span className="font-medium text-[color:var(--pf-fg)]">Motive</span>{" "}
            {artworks.length}
          </div>
        </div>
      ) : null}
      </aside>
      {collapsed && !isDrawer ? (
        <button
          type="button"
          className={cn(
            // fixed: immer sichtbar (alle Routen, Scroll), oben bündig zur 52px-Kopfzeile der Sidebar
            "group pointer-events-auto fixed left-[calc(3.5rem-1px)] top-1 z-[50] -translate-x-px",
            "hidden md:flex",
            "h-10 w-8 items-center justify-center",
            "rounded-r-[13px] rounded-l-[7px]",
            "border border-[color:var(--pf-border)] border-l-transparent",
            "bg-[color:var(--pf-bg)]",
            "text-[color:var(--pf-fg-subtle)]",
            "shadow-[0_2px_8px_rgb(0,0,0,0.05),0_1px_2px_rgb(0,0,0,0.04),inset_1px_0_0_rgba(255,255,255,0.55)]",
            "ring-1 ring-slate-900/[0.06] dark:shadow-[0_4px_16px_rgba(0,0,0,0.28),inset_1px_0_0_rgba(255,255,255,0.05)] dark:ring-white/[0.08]",
            !reduceMotion &&
              "hover:border-indigo-200/70 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-violet-50/90 hover:text-indigo-600 hover:shadow-[0_6px_20px_-4px_rgba(79,70,229,0.18),0_2px_6px_rgb(0,0,0,0.05)] dark:hover:border-indigo-500/25 dark:hover:from-indigo-950/50 dark:hover:to-violet-950/40 dark:hover:text-indigo-300",
            reduceMotion &&
              "hover:border-[color:var(--pf-border)] hover:bg-[color:var(--pf-bg-muted)] hover:text-[color:var(--pf-fg)] hover:shadow-[0_2px_8px_rgb(0,0,0,0.05)]",
            !reduceMotion &&
              "transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pf-bg-subtle)] dark:focus-visible:ring-offset-zinc-950",
          )}
          title="Seitenleiste aufklappen"
          aria-label="Seitenleiste aufklappen"
          aria-expanded={false}
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight
            size={15}
            strokeWidth={2.25}
            className={cn(
              "shrink-0 opacity-90",
              !reduceMotion && "transition-transform duration-200 ease-out group-hover:translate-x-px",
            )}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
};
