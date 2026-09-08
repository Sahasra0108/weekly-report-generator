"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    ClipboardList,
    Columns3,
    FilePlus,
    FileText,
    FolderKanban,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    access: "all" | "manager" | "admin";
}

const navigation: { section: string; items: NavItem[] }[] = [
    {
        section: "My work",
        items: [
            { href: "/reports", label: "My reports", icon: FileText, access: "all" },
            { href: "/reports/new", label: "New report", icon: FilePlus, access: "all" },
        ],
    },
    {
        section: "Team",
        items: [
            { href: "/team", label: "Dashboard", icon: LayoutDashboard, access: "manager" },
            { href: "/team/reports", label: "All reports", icon: ClipboardList, access: "manager" },
            { href: "/team/sections", label: "Compare week", icon: Columns3, access: "manager" },
        ],
    },
    {
        section: "Manage",
        items: [
            { href: "/projects", label: "Projects", icon: FolderKanban, access: "manager" },
            { href: "/admin/users", label: "Users", icon: Users, access: "admin" },
            { href: "/settings", label: "Settings", icon: Settings, access: "all" },
        ],
    },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const { user, logout, isManager, isAdmin } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const canSee = (access: NavItem["access"]) =>
        access === "all" ||
        (access === "manager" && isManager) ||
        (access === "admin" && isAdmin);

    const sections = navigation
        .map((s) => ({ ...s, items: s.items.filter((i) => canSee(i.access)) }))
        .filter((s) => s.items.length > 0);

    // "/reports" would otherwise match "/reports/new" too
    const isActive = (href: string) =>
        href === "/reports" || href === "/team"
            ? pathname === href
            : pathname.startsWith(href);

    const initials = user?.full_name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("");

    return (
        <div className="min-h-screen bg-canvas">
            <header className="sticky top-0 z-30 border-b border-sidebar-edge bg-white/60 backdrop-blur-xl">
                <div className="flex h-14 items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-primary-soft hover:text-primary-text lg:hidden"
                            aria-label="Toggle navigation"
                        >
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>

                        <Link href="/reports" className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#8b5cf6] text-xs font-bold text-white shadow-sm">
                                W
                            </span>
                            <span className="text-sm font-semibold tracking-tight text-ink">
                                Weekly Reports
                            </span>
                        </Link>
                    </div>

                    <button
                        onClick={logout}
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary-text"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>
            </header>

            <div className="flex">
                <aside
                    className={`${mobileOpen ? "flex" : "hidden"
                        } w-full shrink-0 flex-col border-b border-white/50 bg-gradient-to-b from-[#ddd6fe] via-[#e9e5fd] to-[#faf9ff] px-3 py-5 lg:flex lg:w-60 lg:border-b-0 lg:border-r lg:min-h-[calc(100vh-3.5rem)]`}
                >
                    <nav className="flex-1 space-y-6">
                        {sections.map((section) => (
                            <div key={section.section}>
                                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                                    {section.section}
                                </p>
                                <ul className="space-y-0.5">
                                    {section.items.map((item) => {
                                        const active = isActive(item.href);
                                        const Icon = item.icon;
                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    onClick={() => setMobileOpen(false)}
                                                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all ${active
                                                        ? "bg-surface font-medium text-primary-text shadow-[0_1px_3px_rgb(109_40_217/0.12)]"
                                                        : "text-ink-soft hover:bg-white/60 hover:text-primary-text"
                                                        }`}
                                                >
                                                    <Icon
                                                        size={17}
                                                        className={active ? "text-primary" : "text-muted"}
                                                    />
                                                    {item.label}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    {/* User card, pinned to the bottom */}
                    <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-white/70 bg-white/70 px-3 py-2.5 backdrop-blur">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#8b5cf6] text-xs font-semibold text-white">
                            {initials}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                                {user?.full_name}
                            </p>
                            <p className="truncate text-xs capitalize text-muted">
                                {user?.job_title ?? user?.role.name.toLowerCase()}
                            </p>
                        </div>
                    </div>
                </aside>

                <main
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.75)" }}
                    className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}