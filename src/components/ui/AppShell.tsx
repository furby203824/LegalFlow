"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Scale, ChevronDown, ChevronRight, Menu, X, ExternalLink,
  Home, LogOut, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, logout as doLogout, login, seedDefaultUser, type SessionUser } from "@/lib/auth";

/* ── Demo accounts for quick switching ── */
const DEMO_ACCOUNTS = [
  { username: "admin", password: "admin", label: "System Admin", rank: "" },
  { username: "preparer", password: "preparer", label: "NJP Preparer", rank: "Sgt Rodriguez" },
  { username: "reviewer", password: "reviewer", label: "Certifier Reviewer", rank: "GySgt Mitchell" },
  { username: "certifier", password: "certifier", label: "Certifier", rank: "LtCol Chen" },
  { username: "appeal", password: "appeal", label: "Certifier (Regt)", rank: "Col Hayes" },
];

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

/* ── Role-aware sidebar menu builder ── */

function buildSidebarMenu(role: string): SidebarSection[] {
  const isAdmin = role === "SUITE_ADMIN";
  const isPreparer = role === "NJP_PREPARER";
  const isReviewer = role === "CERTIFIER_REVIEWER";
  const isCertifier = role === "CERTIFIER";

  const menu: SidebarSection[] = [];

  // NJP Menu — contents vary by role
  const njpChildren: (SidebarLink | SidebarSection)[] = [];

  if (isPreparer || isAdmin) {
    njpChildren.push({
      label: "NJP Preparer",
      children: [
        { label: "Initiate NJP Package", href: "/cases/new" },
        { label: "My Pending Packages", href: "/cases?view=pending" },
      ],
    });
  }

  if (isReviewer) {
    njpChildren.push({
      label: "Certifier Reviewer",
      children: [
        { label: "Packages Pending Review", href: "/cases?view=pending" },
      ],
    });
  }

  if (isCertifier) {
    njpChildren.push({
      label: "Certifier",
      children: [
        { label: "Packages Awaiting Action", href: "/cases?view=pending" },
      ],
    });
  }

  // Everyone sees Available Packages
  njpChildren.push({ label: "Available Packages", href: "/cases" });

  menu.push({
    label: "NJP Menu",
    defaultOpen: true,
    children: njpChildren,
  });

  // ADSEP Menu — only preparer and admin
  if (isPreparer || isAdmin) {
    menu.push({
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
    });
  }

  // Admin Menu — only preparer and admin
  if (isPreparer || isAdmin) {
    menu.push({
      label: "Admin Menu",
      defaultOpen: false,
      children: [
        {
          label: "User Guide",
          children: [
            { label: "CLA Training", href: "#", disabled: true },
          ],
        },
        { label: "MISSO POCs", href: "#", disabled: true },
        ...(isAdmin ? [{ label: "User Management", href: "/admin/users" }] : []),
      ],
    });
  }

  // References — available to all
  menu.push({
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
  });

  // Forms — available to all
  menu.push({
    label: "Forms",
    defaultOpen: false,
    children: [
      { label: "Privacy Act Statement for Respondent", href: "#", disabled: true },
      { label: "Appointment of Admin Board - Example", href: "#", disabled: true },
      { label: "Summarized Record of Board Hearing - Example", href: "#", disabled: true },
      { label: "RLS Form (NAVMC-11411)", href: "#", disabled: true },
    ],
  });

  // Utilities — available to all
  menu.push({
    label: "Utilities",
    defaultOpen: false,
    children: [
      { label: "My Account", href: "/account" },
    ],
  });

  return menu;
}

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
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center text-left transition-colors",
          depth === 0
            ? "px-3 py-2 text-[13px] font-bold text-white/90 hover:bg-white/10 border-b border-white/5"
            : "py-1.5 text-[12px] text-white/70 hover:text-white hover:bg-white/5"
        )}
        style={{ paddingLeft: depth === 0 ? "12px" : `${12 + depth * 14}px` }}
      >
        <span className="flex items-center gap-1">
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          {section.label}
        </span>
      </button>
      {open && (
        <div className={cn(depth === 0 ? "pb-0.5" : "")}>
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
  const isActive = item.href && item.href !== "#"
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : false;

  if (item.disabled) {
    return (
      <span
        className="block py-1.5 text-[12px] text-white/25 cursor-not-allowed"
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "block py-1.5 text-[12px] transition-colors",
        isActive
          ? "bg-white/15 text-white font-medium border-l-2 border-accent"
          : "text-white/70 hover:text-white hover:bg-white/5"
      )}
      style={{ paddingLeft: `${12 + depth * 14}px` }}
      target={item.external ? "_blank" : undefined}
    >
      {item.label}
      {item.external && <ExternalLink size={10} className="inline ml-1" />}
    </Link>
  );
}

/* ── Main AppShell ── */

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
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
      <div className="flex items-center justify-center min-h-screen bg-primary-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-sm text-white/60">Loading...</p>
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
    NJP_PREPARER: "NJP Preparer",
    CERTIFIER_REVIEWER: "Certifier Reviewer",
    CERTIFIER: "Certifier",
  };

  const sidebarMenu = buildSidebarMenu(user.role);

  const sidebarContent = (
    <>
      {/* Sidebar menu sections */}
      <nav className="flex-1 overflow-y-auto pt-1">
        {sidebarMenu.map((section, i) => (
          <SidebarSectionItem
            key={i}
            section={section}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-white/10 px-3 py-2.5">
        <div className="text-[11px] text-white/50">
          <div className="font-medium text-white/70">{user.firstName} {user.lastName}</div>
          <div>{roleLabels[user.role] || user.role}</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top header — CLA maroon/navy gradient with branding ── */}
      <div className="bg-gradient-to-r from-primary-dark via-primary to-secondary h-12 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1 text-white/80 hover:text-white"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <Scale size={24} className="text-white" />
          <div>
            <div className="text-white text-base font-bold tracking-tight leading-tight">Command Legal Action</div>
            <div className="text-white/40 text-[10px] leading-tight">LegalFlow Suite</div>
          </div>
        </div>
        <div className="hidden sm:block relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs transition-colors px-2 py-1 rounded hover:bg-white/10"
          >
            User: <span className="font-medium text-white">{user.firstName} {user.lastName}</span>
            <ChevronDown size={12} className={cn("transition-transform", userDropdownOpen && "rotate-180")} />
          </button>
          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-md shadow-lg border border-border overflow-hidden">
                <div className="px-3 py-2 bg-surface border-b border-border">
                  <div className="text-[10px] font-semibold text-neutral-mid uppercase tracking-wider">Switch Account</div>
                </div>
                {DEMO_ACCOUNTS.map((acct) => {
                  const isActive = user.username === acct.username;
                  return (
                    <button
                      key={acct.username}
                      disabled={switching || isActive}
                      onClick={async () => {
                        setSwitching(true);
                        try {
                          await seedDefaultUser();
                          await login(acct.username, acct.password);
                          setUserDropdownOpen(false);
                          window.location.reload();
                        } catch {
                          setSwitching(false);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/5 border-l-2 border-primary"
                          : "hover:bg-surface border-l-2 border-transparent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs font-medium", isActive ? "text-primary" : "text-neutral-dark")}>
                          {acct.label}
                        </div>
                        {acct.rank && (
                          <div className="text-[10px] text-neutral-mid">{acct.rank}</div>
                        )}
                      </div>
                      {isActive && (
                        <span className="text-[10px] text-primary font-medium">Active</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Navigation bar ── */}
      <div className="bg-primary-light h-9 flex items-center justify-between px-4 text-white text-[13px] shrink-0">
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center gap-1 px-2 py-1 text-white/80 hover:text-white transition-colors">
            <Home size={13} /> Home
          </Link>
          <span className="text-white/20 mx-0.5">|</span>
          <Link href="/cases" className="px-2 py-1 text-white/80 hover:text-white transition-colors">
            Package Tracking
          </Link>
          <span className="text-white/20 mx-0.5">|</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 py-1 text-white/80 hover:text-white transition-colors"
          >
            <LogOut size={13} /> Logout
          </button>
          <span className="text-white/20 mx-0.5">|</span>
          <button className="flex items-center gap-1 px-2 py-1 text-white/80 hover:text-white transition-colors">
            <HelpCircle size={13} /> Help
          </button>
        </div>
      </div>

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar - desktop */}
        <aside className="hidden md:flex flex-col bg-primary text-white w-48 shrink-0 overflow-y-auto">
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
            className="absolute top-3 right-3 text-white/60 hover:text-white z-10"
          >
            <X size={18} />
          </button>
          {sidebarContent}
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* CUI Banner */}
          <div className="h-7 bg-cui-bg flex items-center justify-center text-[11px] font-semibold text-cui-text tracking-wider shrink-0">
            CONTROLLED UNCLASSIFIED INFORMATION - PRIVACY SENSITIVE
          </div>

          {/* Role indicator bar */}
          <div className={cn(
            "h-7 flex items-center justify-between px-4 text-[11px] font-medium shrink-0 border-b",
            user.role === "NJP_PREPARER" && "bg-info/10 text-info border-info/20",
            user.role === "CERTIFIER_REVIEWER" && "bg-warning/10 text-warning border-warning/20",
            user.role === "CERTIFIER" && "bg-success/10 text-success border-success/20",
            user.role === "SUITE_ADMIN" && "bg-primary/5 text-primary border-primary/10",
            !["NJP_PREPARER", "CERTIFIER_REVIEWER", "CERTIFIER", "SUITE_ADMIN"].includes(user.role) && "bg-neutral-light text-neutral-mid border-border",
          )}>
            <span>
              Logged in as: <strong>{roleLabels[user.role] || user.role}</strong>
              {user.rank && <span className="ml-1">({user.rank} {user.lastName})</span>}
            </span>
            <span className="text-[10px] opacity-70">
              {user.role === "NJP_PREPARER" && "Create cases, admin closure, OMPF"}
              {user.role === "CERTIFIER_REVIEWER" && "Review packages before routing to Commander"}
              {user.role === "CERTIFIER" && "CO Cert, Findings, Punishment, Notification"}
              {user.role === "SUITE_ADMIN" && "Full system access"}
            </span>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-surface">
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="h-8 bg-neutral-light border-t border-border flex items-center justify-between px-4 md:px-6 text-[11px] text-neutral-mid shrink-0">
            <span>CUI - Privacy Sensitive When Populated</span>
            <span>LegalFlow v1.0</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
