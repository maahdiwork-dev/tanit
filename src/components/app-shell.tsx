"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  LayoutDashboard,
  Leaf,
  MessageSquare,
  ScrollText,
  Upload,
} from "lucide-react";

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
    label: "Classement GreenMetric",
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

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const currentTitle = pageTitles.get(pathname) ?? "Project Tanit";

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#FAFAF8] text-zinc-900">
        <aside className="fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-zinc-200 bg-white">
          <div className="flex h-16 items-center gap-2.5 border-b border-zinc-200 px-6">
            <TanitMark size={24} />
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-normal text-[#297CE9]"
            >
              Project Tanit
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950",
                    isActive && "bg-[#297CE9] text-white hover:bg-[#297CE9] brand-glow",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-zinc-200 px-6 py-4 text-xs leading-5 text-zinc-500">
            University of Carthage · Hack4UCar 2026
          </div>
        </aside>

        <header className="fixed left-[240px] right-0 top-0 z-30 flex h-16 items-center justify-between bg-[#ffffff]/95 px-6 backdrop-blur">
          <h1 className="text-base font-semibold text-zinc-950">
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

        <main className="ml-[240px] h-screen overflow-y-auto pt-16">
          <div className="p-6">{children}</div>
        </main>

        <FastForwardFab />
      </div>
    </TooltipProvider>
  );
}
