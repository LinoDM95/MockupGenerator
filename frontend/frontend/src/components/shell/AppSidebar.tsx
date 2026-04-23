import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Folder,
  Layers,
  Link2,
  Maximize,
  UserCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { ACCOUNT_PATH } from "../../lib/appNavigation";
import { cn } from "../../lib/ui/cn";
import { useAppStore } from "../../store/appStore";

const SIDEBAR_COLLAPSED_KEY = "printflow-sidebar-collapsed";

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
};

export const AppSidebar = ({ variant, onNavigate }: AppSidebarProps) => {
  const navigationLocked = useAppStore((s) => s.navigationLocked);
  const templateSets = useAppStore((s) => s.templateSets);
  const artworks = useAppStore((s) => s.artworks);
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const widthClass = collapsed ? "w-14" : "w-[232px]";
  const isDrawer = variant === "drawer";

  const shellClass = cn(
    "flex h-full min-h-0 flex-col border-r border-[color:var(--pf-border)] bg-[color:var(--pf-bg)]",
    widthClass,
    isDrawer && "w-[232px]",
  );

  const integrationsActive = location.pathname.startsWith("/app/integrationen");

  return (
    <aside className={shellClass}>
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center gap-2.5 border-b border-[color:var(--pf-border)] px-3",
          collapsed && !isDrawer && "justify-center px-2",
        )}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100">
          <Zap size={14} className="text-white dark:text-zinc-900" fill="currentColor" />
        </div>
        {!collapsed || isDrawer ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-[color:var(--pf-fg)]">
              PrintFlow
            </span>
            {!isDrawer ? (
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
          </>
        ) : (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            title="Aufklappen"
            aria-label="Seitenleiste aufklappen"
            onClick={() => setCollapsed(false)}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        )}
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

        <SidebarGroup eyebrow="Produkt" collapsed={collapsed && !isDrawer}>
          <SidebarNavItem
            to="/app/roadmap"
            icon={Compass}
            label="Roadmap"
            end
            collapsed={collapsed && !isDrawer}
            navigationLocked={navigationLocked}
            onNavigate={onNavigate}
          />
        </SidebarGroup>

        <SidebarGroup eyebrow="Konto" collapsed={collapsed && !isDrawer}>
          <Link
            to="/app/integrationen/assistent"
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
  );
};
