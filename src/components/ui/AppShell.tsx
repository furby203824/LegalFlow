"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Scale, ChevronDown, ChevronRight, Menu, X, ExternalLink,
  Home, LogOut, HelpCircle, FileText, Users, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, logout as doLogout, type SessionUser } from "@/lib/auth";

type User = SessionUser;

/* ── Sidebar menu structure matching CLA ── */

interface SidebarLink {
  label: string;
  href?: string;
  external?: boolean;
  disabled?: boolean;
}

interface SidebarSection {
  label: string;
  defaultOpen?: boolean;
  children: (SidebarLink | SidebarSection)[];
}

function isSidebarSection(item: SidebarLink | SidebarSection): item is SidebarSection {
  return "children" in item;
}

const SIDEBAR_MENU: SidebarSection[] = [
  {
    label: "NJP Menu",
    defaultOpen: true,
    children: [
      {
        label: "NJP Preparer",
        children: [
          { label: "Initiate NJP Package", href: "/cases/new" },
        ],
      },
      { label: "Available Packages", href: "/cases" },
    ],
  },
  {
    label: "ADSEP Menu",
    defaultOpen: false,
    children: [
      {
        label: "ADSEP Preparer",
        children: [
          { label: "Initiate ADSEP Package", href: "/adsep/new" },
        ],
      },
      { label: "Available Packages", href: "/adsep" },
    ],
  },
  {
    label: "Admin Menu",
    defaultOpen: false,
    children: [
      {
        label: "User Guide",
        children: [
          { label: "CLA Training", href: "#", disabled: true },
        ],
      },
      { label: "User Management", href: "/admin/users" },
    ],
  },
  {
    label: "References",
    defaultOpen: false,
    children: [
      {
        label: "Important Links",
        children: [
          { label: "Separation Basis Checklists", href: "#", disabled: true },
          { label: "Separation Manual", href: "#", disabled: true },
          { label: "MCO 5800.16", href: "#", disabled: true },
          { label: "DD2875 SAAR access", href: "#", disabled: true },
        ],
      },
    ],
  },
  {
    label: "Forms",
    defaultOpen: false,
    children: [
      { label: "Privacy Act Statement for Respondent", href: "#", disabled: true },
      { label: "Appointment of Admin Board - Example", href: "#", disabled: true },
      { label: "Summarized Record of Board Hearing - Example", href: "#", disabled: true },
      { label: "RLS Form (NAVMC-11411)", href: "#", disabled: true },
    ],
  },
  {
    label: "Utilities",
    defaultOpen: false,
    children: [
      { label: "My Account", href: "#", disabled: true },
    ],
  },
];

/* ── Collapsible sidebar section component ── */

function SidebarSectionItem({
  section,
  depth = 0,
  pathname,
}: {
  section: SidebarSection;
  depth?: number;
  pathname: string;
}) {
  const [open, setOpen] = useState(section.defaultOpen || false);

  return (
    <div className={cn(depth === 0 ? "border-b border-white/10" : "")}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between text-left text-sm transition-colors",
          depth === 0
            ? "px-3 py-2.5 font-semibold text-white/90 hover:bg-white/10"
            : "px-3 py-1.5 text-white/70 hover:text-white hover:bg-white/5",
          depth > 0 && `pl-${3 + depth * 3}`
        )}
        style={depth > 0 ? { paddingLeft: `${12 + depth * 12}px` } : undefined}
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {section.label}
        </span>
      </button>
      {open && (
        <div className={cn(depth === 0 ? "pb-1" : "")}>
          {section.children.map((child, i) =>
            isSidebarSection(child) ? (
              <SidebarSectionItem
                key={i}
                section={child}
                depth={depth + 1}
                pathname={pathname}
              />
            ) : (
              <SidebarLinkItem
                key={i}
                item={child}
                depth={depth + 1}
                pathname={pathname}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function SidebarLinkItem({
  item,
  depth,
  pathname,
}: {
  item: SidebarLink;
  depth: number;
  pathname: string;
}) {
  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false;

  if (item.disabled) {
    return (
      <span
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/30 cursor-not-allowed"
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-white/15 text-white font-medium border-l-2 border-secondary"
          : "text-white/70 hover:text-white hover:bg-white/5"
      )}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
      target={item.external ? "_blank" : undefined}
    >
      {item.label}
      {item.external && <ExternalLink size={10} />}
    </Link>
  );
}

/* ── Main AppShell ── */

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
    } else {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    doLogout();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-neutral-mid">Loading...</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    INITIATOR: "Initiator",
    ADMIN: "Admin",
    NJP_AUTHORITY: "NJP Authority",
    ACCUSED: "Accused",
    APPEAL_AUTHORITY: "Appeal Authority",
    IPAC_ADMIN: "IPAC Admin",
    SUITE_ADMIN: "System Admin",
  };

  const sidebarContent = (
    <>
      {/* Logo area — matching CLA header style */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/10 bg-primary-light">
        <Scale size={22} className="shrink-0 text-white" />
        <div>
          <div className="text-sm font-bold tracking-tight text-white">Command Legal Action</div>
          <div className="text-[10px] text-white/50">LegalFlow Suite</div>
        </div>
      </div>

      {/* Sidebar menu sections */}
      <nav className="flex-1 overflow-y-auto">
        {SIDEBAR_MENU.map((section, i) => (
          <SidebarSectionItem
            key={i}
            section={section}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="text-xs text-white/60">
          <div className="font-medium text-white/80">{user.firstName} {user.lastName}</div>
          <div>{user.rank && `${user.rank} `}{roleLabels[user.role] || user.role}</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col bg-primary text-white w-56 shrink-0">
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-primary text-white w-56 transition-transform duration-200 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 text-white/60 hover:text-white"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav bar — matching CLA style */}
        <header className="h-10 bg-primary-light flex items-center justify-between px-4 text-white text-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1 mr-2 text-white/80 hover:text-white"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <Link href="/dashboard" className="flex items-center gap-1 px-2 py-1 text-white/80 hover:text-white transition-colors">
              <Home size={14} /> Home
            </Link>
            <span className="text-white/30">|</span>
            <Link href="/cases" className="px-2 py-1 text-white/80 hover:text-white transition-colors">
              Package Tracking
            </Link>
            <span className="text-white/30">|</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1 text-white/80 hover:text-white transition-colors"
            >
              <LogOut size={14} /> Logout
            </button>
            <span className="text-white/30">|</span>
            <button className="flex items-center gap-1 px-2 py-1 text-white/80 hover:text-white transition-colors">
              <HelpCircle size={14} /> Help
            </button>
          </div>
          <div className="hidden sm:block text-xs text-white/60">
            User: {user.firstName} {user.lastName}
          </div>
        </header>

        {/* CUI Banner */}
        <div className="h-8 bg-cui-bg flex items-center justify-center text-xs font-medium text-cui-text tracking-wide">
          CONTROLLED UNCLASSIFIED INFORMATION - PRIVACY SENSITIVE
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-surface">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="h-10 bg-neutral-light border-t border-border flex items-center justify-between px-4 md:px-6 text-xs text-neutral-mid">
          <span>CUI - Privacy Sensitive When Populated</span>
          <span>LegalFlow v1.0</span>
        </footer>
      </div>
    </div>
  );
}
