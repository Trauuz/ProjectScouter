"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth";
import { SiteHeader } from "@/shared/layout/site-header";

import { ResearchWorkspace } from "./research-workspace";

type ResearchShellProps = {
  initialPrompt: string;
  resumeIntentId?: string;
};

export function ResearchShell({ initialPrompt, resumeIntentId }: ResearchShellProps) {
  const auth = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 60rem)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeSidebar();
      }
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, [closeSidebar]);

  return (
    <div className="research-shell" data-mobile-sidebar-open={sidebarOpen || undefined}>
      <SiteHeader
        hideNavigationLinks
        mobileMenuControl={auth.user ? (
          <button
            className="research-mobile-menu-trigger"
            type="button"
            aria-label="Open research navigation"
            aria-controls="research-mobile-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((current) => !current)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        ) : undefined}
      />
      <main className="research-page" id="top">
        <ResearchWorkspace
          initialPrompt={initialPrompt}
          resumeIntentId={resumeIntentId}
          mobileSidebarOpen={sidebarOpen}
          onCloseMobileSidebar={closeSidebar}
        />
      </main>
    </div>
  );
}
