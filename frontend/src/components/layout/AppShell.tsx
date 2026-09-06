"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  access: "all" | "manager" | "admin";
}

const navigation: { section: string; items: NavItem[] }[] = [
  {
    section: "My work",
    items: [
      { href: "/reports", label: "My reports", access: "all" },
      { href: "/reports/new", label: "New report", access: "all" },
    ],
  },
  {
    section: "Team",
    items: [
      { href: "/team", label: "Dashboard", access: "manager" },
      { href: "/team/reports", label: "All reports", access: "manager" },
      { href: "/team/sections", label: "Compare week", access: "manager" },
    ],
  },
  {
    section: "Manage",
    items: [
      { href: "/projects", label: "Projects", access: "manager" },
      { href: "/admin/users", label: "Users", access: "admin" },
      { href: "/settings", label: "Settings", access: "all" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isManager, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const canSee = (access: NavItem["access"]) =>
    access === "all" || (access === "manager" && isManager) || (access === "admin" && isAdmin);

  const sections = navigation
    .map((s) => ({ ...s, items: s.items.filter((i) => canSee(i.access)) }))
    .filter((s) => s.items.length > 0);

  const isActive = (href: string) =>
    href === "/reports" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 5h14v2H3zM3 9h14v2H3zM3 13h14v2H3z" />
              </svg>
            </button>
            <Link href="/reports" className="text-sm font-semibold text-slate-900">
              Weekly Reports
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
              <p className="text-xs text-slate-500">
                {user?.job_title ?? user?.role.name.toLowerCase()}
              </p>
            </div>
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            mobileOpen ? "block" : "hidden"
          } w-full shrink-0 border-b border-slate-200 bg-white px-3 py-4 lg:block lg:w-56 lg:border-b-0 lg:border-r`}
        >
          <nav className="space-y-6">
            {sections.map((section) => (
              <div key={section.section}>
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {section.section}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive(item.href)
                            ? "bg-slate-100 font-medium text-slate-900"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}