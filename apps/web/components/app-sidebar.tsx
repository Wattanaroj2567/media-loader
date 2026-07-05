"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Settings,
  Download,
  ShieldCheck,
  Server,
  User,
  LogOut,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const workspaceItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
];

const configItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar shrink-0 justify-between">
      <div>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 px-6 py-5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30 group-hover:bg-primary/20 transition-all">
            <Download className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none">
              Media Loader
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">v4.0.0-Docker</span>
          </div>
        </Link>

        <Separator className="opacity-40" />

        {/* Section: Main Workspace */}
        <div className="px-3 py-4">
          <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            Workspace
          </p>
          <nav className="flex flex-col gap-0.5">
            {workspaceItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                    active
                      ? "bg-accent/80 text-accent-foreground font-medium border-l-2 border-primary pl-2.5"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-accent-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-primary" : "group-hover:text-primary"
                    }`}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section: Configuration */}
        <div className="px-3 py-2">
          <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            System
          </p>
          <nav className="flex flex-col gap-0.5">
            {configItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                    active
                      ? "bg-accent/80 text-accent-foreground font-medium border-l-2 border-primary pl-2.5"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-accent-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-primary" : "group-hover:text-primary"
                    }`}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Area */}
      <div className="flex flex-col gap-3 p-4">
        {/* Live System Status Card */}
        <div className="rounded-lg border border-border/50 bg-card/45 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Server className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Docker Containers</span>
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>API (FastAPI):</span>
              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Worker (Queue):</span>
              <span className="text-cyan-400 font-mono text-[10px] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                Idle
              </span>
            </div>
          </div>
        </div>

        {/* User Account Footer Card */}
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-accent/20 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/80 shrink-0 text-muted-foreground border border-border/40 overflow-hidden">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-foreground truncate">
                {user.name}
              </span>
              <span className="text-[9px] text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
          </div>
          <Link
            href="/auth/signout"
            title="Sign Out"
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 rounded hover:bg-accent/40"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Policy Badging */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 px-1 pt-1">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Rights-Aware Enforcement</span>
        </div>
      </div>
    </aside>
  );
}
