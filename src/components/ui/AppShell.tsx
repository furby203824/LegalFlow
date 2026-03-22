"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, FilePlus, FolderOpen, ClipboardCheck, FileText,
  Users, Settings, LogOut, ChevronLeft, ChevronRight, Scale, Shield,
  Inbox, Clock, PanelLeftClose, PanelLeft, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, logout as doLogout, type SessionUser } from "@/lib/auth";

type User = SessionUser;

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  INITIATOR: [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "New Case", href: "/cases/new", icon: <FilePlus size={20} /> },
    { label: "My Cases", href: "/cases", icon: <FolderOpen size={20} /> },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "New Case", href: "/cases/new", icon: <FilePlus size={20} /> },
    { label: "All Cases", href: "/cases", icon: <FolderOpen size={20} /> },
    { label: "Pending Actions", href: "/dashboard?filter=pending", icon: <ClipboardCheck size={20} /> },
    { label: "Documents", href: "/documents", icon: <FileText size={20} /> },
  ],
  NJP_AUTHORITY: [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "My Cases", href: "/cases", icon: <FolderOpen size={20} /> },
    { label: "Pending Signatures", href: "/dashboard?filter=signatures", icon: <ClipboardCheck size={20} /> },
  ],
  ACCUSED: [
    { label: "My Case", href: "/cases", icon: <Scale size={20} /> },
  ],
  APPEAL_AUTHORITY: [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Appeals Pending", href: "/cases?status=APPEAL_PENDING", icon: <Clock size={20} /> },
  ],
  IPAC_ADMIN: [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "IPAC Queue", href: "/cases?filter=ipac", icon: <Inbox size={20} /> },
    { label: "Completed Cases", href: "/cases?status=CLOSED", icon: <FolderOpen size={20} /> },
  ],
  SUITE_ADMIN: [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "All Cases", href: "/cases", icon: <FolderOpen size={20} /> },
    { label: "New Case", href: "/cases/new", icon: <FilePlus size={20} /> },
    { label: "User Management", href: "/admin/users", icon: <Users size={20} /> },
    { label: "Audit Logs", href: "/admin/audit", icon: <Shield size={20} /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings size={20} /> },
  ],
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
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

  // Close mobile nav on route change
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

  const navItems = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.ADMIN;

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
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <Scale size={24} className="shrink-0" />
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold tracking-tight">LegalFlow</div>
            <div className="text-[10px] text-white/50">Semper Admin Suite</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-white/15 text-white border-l-2 border-secondary"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center h-10 border-t border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>
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

      {/* Sidebar - hidden on mobile, shown on desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-primary text-white transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-primary text-white w-60 transition-transform duration-200 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-bg border-b border-border flex items-center justify-between px-4 md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 -ml-2 text-neutral-dark hover:bg-neutral-light rounded-md"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="hidden md:block text-sm text-neutral-mid">
            {/* Breadcrumb placeholder */}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-neutral-dark">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-neutral-mid">
                {user.rank && `${user.rank} `}
                {roleLabels[user.role] || user.role}
                {user.unitId && ` \u00B7 ${user.unitId}`}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost p-2"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* CUI Banner */}
        <div className="h-8 bg-cui-bg flex items-center justify-center text-xs font-medium text-cui-text tracking-wide">
          CONTROLLED UNCLASSIFIED INFORMATION - PRIVACY SENSITIVE
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
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
