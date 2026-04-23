import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { fetchCurrentUser, type CurrentUser } from "../../api/auth";
import { registerAppNavigate } from "../../lib/appNavigation";
import { syncAppStoreWithPathname } from "../../lib/appNavigationSync";
import {
  persistSidebarCollapsedDesktop,
  readInitialSidebarCollapsedDesktop,
} from "../../lib/shell/sidebarCollapsedStorage";
import { cn } from "../../lib/ui/cn";
import { useAppStore } from "../../store/appStore";
import { AIActivityPanel } from "../ai/AIActivityPanel";
import { FeedbackNotificationPoller } from "../feedback/FeedbackNotificationPoller";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { DialogHost } from "./DialogHost";

const MainFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-zinc-500">
    Laden…
  </div>
);

const AuthenticatedApp = () => {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const isDenseWorkspace =
    /^\/app\/(erstellen|publizieren|integrationen)\//.test(location.pathname) ||
    /^\/app\/konto\/?$/.test(location.pathname);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsedDesktop, setSidebarCollapsedDesktop] = useState(
    readInitialSidebarCollapsedDesktop,
  );

  useEffect(() => {
    registerAppNavigate(navigate);
    return () => registerAppNavigate(null);
  }, [navigate]);

  useEffect(() => {
    syncAppStoreWithPathname(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    void fetchCurrentUser().then(setUser, () => setUser(null));
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    persistSidebarCollapsedDesktop(sidebarCollapsedDesktop);
  }, [sidebarCollapsedDesktop]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[color:var(--pf-bg-subtle)] font-sans text-[color:var(--pf-fg)] selection:bg-indigo-500/20 dark:selection:bg-indigo-400/20">
      <FeedbackNotificationPoller />
      <AIActivityPanel />
      <DialogHost />

      <div className="flex min-h-0 min-h-[100dvh] flex-1">
        <div className="hidden min-h-0 md:flex">
          <AppSidebar
            variant="desktop"
            desktopCollapsed={sidebarCollapsedDesktop}
            onDesktopCollapsedChange={setSidebarCollapsedDesktop}
          />
        </div>

        {mobileNavOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[200] bg-zinc-950/40 md:hidden"
              aria-label="Menü schließen"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-[210] flex max-w-[85vw] shadow-[0_12px_40px_rgba(0,0,0,0.12)] md:hidden">
              <AppSidebar variant="drawer" onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppTopbar
            user={user}
            onOpenMobileSidebar={() => setMobileNavOpen(true)}
            sidebarCollapsedDesktop={sidebarCollapsedDesktop}
          />
          <main
            className={cn(
              "min-h-0 flex-1 overflow-auto bg-[color:var(--pf-bg-subtle)]",
              isDenseWorkspace ? "px-3 py-3 sm:px-4 sm:py-4" : "px-6 py-6",
            )}
          >
            <div
              className={cn(
                "mx-auto w-full min-w-0",
                !isDenseWorkspace && "max-w-7xl",
              )}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  className="w-full min-w-0"
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Suspense fallback={<MainFallback />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AuthenticatedApp;
