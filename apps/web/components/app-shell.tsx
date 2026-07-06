"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUserRound,
  Download,
  History,
  Languages,
  ListTodo,
  LogOut,
  Plus,
  WifiOff,
} from "lucide-react";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

const navigation = [
  { href: "/dashboard", label: "nav.newDownload", icon: Plus },
  { href: "/downloads", label: "nav.queue", icon: ListTodo },
  { href: "/history", label: "nav.history", icon: History },
  { href: "/settings", label: "nav.account", icon: CircleUserRound },
];

function UserAvatar({
  name,
  avatarUrl,
  compact = false,
}: {
  name: string;
  avatarUrl?: string;
  compact?: boolean;
}) {
  return (
    <div
      role={avatarUrl ? "img" : undefined}
      aria-label={avatarUrl ? name : undefined}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-bg-surface bg-cover bg-center ${
        compact ? "size-8" : "size-10"
      }`}
      style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
    >
      {!avatarUrl && (
        <CircleUserRound
          aria-hidden="true"
          className={compact ? "size-4 text-text-muted" : "size-5 text-text-muted"}
        />
      )}
    </div>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useT();

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    setIsOffline(!window.navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);



  return (
    <div className="min-h-dvh bg-bg-base text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-border px-6">
          <div className="grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10">
            <Download aria-hidden="true" className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-[15px] font-semibold tracking-tight">
              {t("app.name")}
            </p>
            <p className="mt-0.5 text-[11px] text-text-dim">
              {t("app.localWorkspace")}
            </p>
          </div>
        </div>

        <nav
          aria-label={t("nav.primary")}
          className="flex-1 space-y-1 px-3 py-5"
        >
          <p className="px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-text-dim">
            {t("nav.workspace")}
          </p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors ${
                  active
                    ? "border border-primary/20 bg-primary/10 text-primary font-semibold"
                    : "border border-transparent text-text-muted hover:bg-bg-surface hover:text-text"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-4.5 ${
                    active
                      ? "text-primary"
                      : "text-text-dim group-hover:text-text-muted"
                  }`}
                />
                <span className="flex-1">{t(label)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-surface/50 p-3">
            <UserAvatar name={user.name} avatarUrl={user.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-text">
                {user.name}
              </p>
              <p className="mt-1 truncate text-[10px] text-text-dim">
                {user.email}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLocale(locale === "th" ? "en" : "th")}
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border text-xs text-text-muted transition-colors hover:bg-bg-surface hover:text-text cursor-pointer"
            >
              <Languages aria-hidden="true" className="size-4" />
              {locale === "th" ? "EN" : "ไทย"}
            </button>
            <Link
              href="/auth/signout"
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border text-xs text-text-muted transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t("nav.signOut")}
            </Link>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-sidebar/95 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10">
            <Download aria-hidden="true" className="size-4.5 text-primary" />
          </div>
          <span className="font-heading text-sm font-semibold">{t("app.name")}</span>
        </Link>
        <Link
          href="/settings"
          aria-label={t("nav.account")}
          className="rounded-full outline-none ring-offset-2 ring-offset-bg-base focus-visible:ring-2 focus-visible:ring-primary"
        >
          <UserAvatar
            compact
            name={user.name}
            avatarUrl={user.avatar_url}
          />
        </Link>
      </header>

      <main className="min-h-dvh pb-24 lg:ml-64 lg:pb-0">
        {isOffline && (
          <div className="bg-amber-500/10 border-b border-amber-500/25 text-amber-500 px-4 py-2.5 text-xs font-medium flex items-center gap-2 animate-pulse justify-center">
            <WifiOff className="size-4 shrink-0" />
            <span>{t("common.offlineWarning", {}, "ขาดการเชื่อมต่อเครือข่ายชั่วคราว กำลังพยายามเชื่อมต่อใหม่...")}</span>
          </div>
        )}
        {children}
      </main>

      <nav
        aria-label={t("nav.primary")}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-sidebar/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
      >
        {navigation.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="size-4.5" />
              <span>{t(label)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
