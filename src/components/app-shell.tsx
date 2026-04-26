"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  LayoutDashboard,
  Leaf,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { FastForwardFab } from "@/components/fast-forward-fab";
import { NotificationBell } from "@/components/notification-bell";
import { RoleSelector } from "@/components/role-selector";
import { TanitMark } from "@/components/tanit-mark";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
  },
  {
    href: "/submit",
    label: "Soumettre KPIs",
    icon: Upload,
  },
  {
    href: "/alerts",
    label: "Alertes",
    icon: Bell,
  },
  {
    href: "/chat",
    label: "Tanit Chat",
    icon: MessageSquare,
  },
  {
    href: "/greenmetric",
    label: "Mission Verte",
    icon: Leaf,
  },
  {
    href: "/reports",
    label: "Rapports",
    icon: FileText,
  },
  {
    href: "/audit",
    label: "Journal d'audit",
    icon: ScrollText,
  },
];

const pageTitles = new Map(navItems.map((item) => [item.href, item.label]));

const COLLAPSE_KEY = "tanit_sidebar_collapsed";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const currentTitle = pageTitles.get(pathname) ?? "Project Tanit";
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSE_KEY);
      if (raw === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const sidebarWidth = collapsed ? "w-[64px]" : "w-[240px]";
  const contentOffset = collapsed ? "left-[64px]" : "left-[240px]";
  const mainOffset = collapsed ? "ml-[64px]" : "ml-[240px]";

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#FAFAF8] text-zinc-900">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 ease-out",
            sidebarWidth,
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center border-b border-zinc-200",
              collapsed ? "justify-center px-2" : "gap-2.5 px-6",
            )}
          >
            {collapsed ? (
              <Link href="/dashboard" aria-label="Project Tanit">
                <TanitMark size={24} />
              </Link>
            ) : (
              <>
                <TanitMark size={24} />
                <Link
                  href="/dashboard"
                  className="text-lg font-semibold tracking-normal text-[#297CE9] truncate"
                >
                  Project Tanit
                </Link>
              </>
            )}
          </div>

          <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    "flex h-10 items-center rounded-md text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    isActive &&
                      "bg-[#297CE9] text-white hover:bg-[#297CE9] brand-glow",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {collapsed ? null : (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle, anchored at the bottom of the sidebar */}
          <div
            className={cn(
              "border-t border-zinc-200",
              collapsed ? "p-2" : "px-3 py-3",
            )}
          >
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
              title={collapsed ? "Déplier" : "Replier"}
              className={cn(
                "flex h-9 items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors w-full",
                collapsed ? "justify-center" : "gap-2 px-3",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <>
                  <PanelLeftClose size={16} />
                  <span className="text-[12.5px]">Replier</span>
                </>
              )}
            </button>
          </div>

          {!collapsed ? (
            <div className="border-t border-zinc-200 px-6 py-3 text-[11px] leading-5 text-zinc-500">
              University of Carthage · Hack4UCar 2026
            </div>
          ) : null}
        </aside>

        <header
          className={cn(
            "fixed right-0 top-0 z-30 flex h-16 items-center justify-between bg-[#ffffff]/95 px-6 backdrop-blur transition-[left] duration-200 ease-out",
            contentOffset,
          )}
        >
          <h1 className="text-base font-semibold text-zinc-950 truncate">
            {currentTitle}
          </h1>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <RoleSelector />
          </div>
          <div
            aria-hidden="true"
            className="scanline absolute inset-x-0 bottom-0 h-px bg-zinc-100"
          />
        </header>

        <main
          className={cn(
            "h-screen overflow-y-auto pt-16 transition-[margin-left] duration-200 ease-out",
            mainOffset,
          )}
        >
          <div className="p-6">{children}</div>
        </main>

        <FastForwardFab />
      </div>
    </TooltipProvider>
  );
}
