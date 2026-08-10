"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock3,
  Home,
  Languages,
  LogOut,
  UserRound,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
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
  { href: "/dashboard", label: "nav.newDownload", icon: Home },
  { href: "/history", label: "nav.history", icon: Clock3 },
];

function UserAvatar({
  name,
  avatarUrl,
  className = "size-9",
}: {
  name: string;
  avatarUrl?: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      role={avatarUrl ? "img" : undefined}
      aria-label={name}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg-elevated bg-cover bg-center text-xs font-semibold text-primary ${className}`}
      style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
    >
      {!avatarUrl && initials}
    </div>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useT();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const syncConnection = () => setIsOffline(!window.navigator.onLine);
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  const toggleLocale = () => setLocale(locale === "th" ? "en" : "th");

  return (
    <div className="min-h-dvh bg-bg-base text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-68 flex-col border-r border-sidebar-border bg-sidebar/92 backdrop-blur-2xl lg:flex">
        <Link href="/dashboard" className="flex h-21 items-center gap-3.5 border-b border-sidebar-border px-5">
          <span className="relative grid size-11 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <ArrowDownToLine aria-hidden="true" className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-400" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold tracking-tight text-text">{t("app.name")}</span>
            <span className="mt-0.5 block text-[11px] text-text-dim">{t("app.localWorkspace")}</span>
          </span>
        </Link>

        <div className="px-4 pb-3 pt-6">
          <p className="px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-text-dim">
            {t("nav.workspace")}
          </p>
        </div>
        <nav aria-label={t("nav.primary")} className="flex-1 space-y-1 py-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-11 items-center gap-3.5 border-l-3 px-5 py-2.5 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/12 text-primary font-semibold"
                    : "border-transparent text-text-muted hover:bg-bg-surface/60 hover:text-text"
                }`}
              >
                <Icon aria-hidden="true" className="size-4.5 shrink-0" />
                <span>{t(label)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Full-width Sidebar Footer (Seamless Edge-to-Edge) */}
        <div className="border-t border-sidebar-border bg-bg-surface/30">
          <Link
            href="/settings"
            title={t("account.viewProfile", {}, "ดูโปรไฟล์")}
            className={`group flex min-w-0 items-center gap-3.5 border-l-3 px-5 py-3 text-[13.5px] font-medium transition-colors outline-none ${
              pathname.startsWith("/settings")
                ? "border-primary bg-primary/12 text-primary font-semibold"
                : "border-transparent text-text hover:bg-bg-surface/60"
            }`}
          >
            <UserAvatar name={user.name} avatarUrl={user.avatar_url} className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-text">{user.name}</span>
              <span className="mt-0.5 block text-[10px] text-text-dim">{t("account.viewProfile", {}, "ดูโปรไฟล์")}</span>
            </span>
          </Link>
          <div className="mx-4 mb-3.5 grid grid-cols-3 gap-2 border-t border-border/50 pt-2.5">
            <button
              type="button"
              onClick={toggleLocale}
              title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              className="flex h-9 items-center justify-center gap-1 rounded-xl border border-border bg-bg-base/60 px-2 text-xs font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary cursor-pointer"
            >
              <Languages aria-hidden="true" className="size-3.5 text-primary shrink-0" />
              <span className="font-mono text-[11px] font-bold tracking-wider">{locale === "th" ? "EN" : "TH"}</span>
            </button>
            <div className="grid place-items-center"><ThemeToggle /></div>
            <form action="/auth/signout" method="post" className="grid place-items-center">
              <button
                type="submit"
                aria-label={t("nav.signOut")}
                className="grid size-9 place-items-center justify-self-center rounded-lg border border-border text-text-muted transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="lg:ml-68">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-bg-base/82 px-4 backdrop-blur-2xl sm:px-6 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <ArrowDownToLine aria-hidden="true" className="size-4.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">{t("app.name")}</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-bg-surface/55 px-2.5 text-xs font-semibold text-text transition-colors hover:border-primary/30 hover:text-primary lg:hidden cursor-pointer"
            >
              <Languages aria-hidden="true" className="size-4 text-primary shrink-0" />
              <span className="font-mono font-bold tracking-wider">{locale === "th" ? "EN" : "TH"}</span>
            </button>
            <div className="lg:hidden"><ThemeToggle /></div>
            <Link
              href="/settings"
              aria-label={t("nav.account")}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/60 lg:hidden"
            >
              <UserAvatar name={user.name} avatarUrl={user.avatar_url} className="size-9" />
            </Link>
          </div>
        </header>

        {isOffline && (
          <div role="status" className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-300">
            <WifiOff aria-hidden="true" className="size-4" />
            {t("common.offlineWarning", {}, "ขาดการเชื่อมต่อเครือข่ายชั่วคราว")}
          </div>
        )}

        <main id="main-content" className="min-h-[calc(100dvh-4rem)] pb-24 lg:min-h-dvh lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        aria-label={t("nav.primary")}
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-sidebar/95 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:hidden"
      >
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${
                active ? "bg-primary/12 text-primary font-semibold" : "text-text-muted hover:bg-bg-surface hover:text-text"
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
