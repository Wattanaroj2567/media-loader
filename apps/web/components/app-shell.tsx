"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Home,
  Languages,
  LogOut,
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
  const router = useRouter();
  const { t, locale, setLocale } = useT();
  const [isOffline, setIsOffline] = useState(false);
  const isAccountPage = pathname.startsWith("/settings");

  useEffect(() => {
    // Eagerly prefetch app routes so sidebar page switches are instant
    router.prefetch("/dashboard");
    router.prefetch("/history");
    router.prefetch("/settings");
  }, [router]);

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
        <Link href="/dashboard" prefetch={true} className="flex h-21 items-center border-b border-sidebar-border px-5">
          <span className="min-w-0">
            <span className="block font-heading text-xl font-bold tracking-tight text-text">{t("app.name")}</span>
            <span className="mt-0.5 block text-xs text-text-muted">{t("app.localWorkspace")}</span>
          </span>
        </Link>

        <div className="px-4 pb-2 pt-5">
          <p className="px-3 font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
            {t("nav.workspace")}
          </p>
        </div>
        <nav aria-label={t("nav.primary")} className="flex-1 space-y-1.5 py-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-12 items-center gap-3.5 border-l-3 px-5 py-3 text-sm transition-all ${
                  active
                    ? "border-primary bg-primary/14 text-primary font-semibold"
                    : "border-transparent text-text-muted hover:bg-bg-surface/70 hover:text-text font-medium"
                }`}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span>{t(label)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Full-width Sidebar Footer */}
        <div className="mt-auto border-t border-sidebar-border bg-bg-surface/30">
          {/* User Profile item styled as nav menu item */}
          <Link
            href="/settings"
            prefetch={true}
            title={t("account.viewProfile", {}, "ดูโปรไฟล์")}
            className={`group flex min-h-12 items-center gap-3.5 border-l-3 px-5 py-3 transition-all outline-none ${
              pathname.startsWith("/settings")
                ? "border-primary bg-primary/14 text-primary font-semibold"
                : "border-transparent text-text-muted hover:bg-bg-surface/70 hover:text-text font-medium"
            }`}
          >
            <UserAvatar name={user.name} avatarUrl={user.avatar_url} className="size-7.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text group-hover:text-primary transition-colors">{user.name}</span>
              <span className="block text-xs text-text-muted truncate font-normal">{t("account.viewProfile", {}, "ดูโปรไฟล์")}</span>
            </span>
          </Link>

          {/* Footer Action Row: Theme + Language + Sign Out */}
          <div className="p-3 pt-2">
            <div className="grid grid-cols-3 gap-1.5">
              <ThemeToggle variant="dropdown" dropdownAlign="top" showLabel={false} className="w-full" />

              <button
                type="button"
                onClick={toggleLocale}
                title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-bg-surface/50 px-1 text-xs font-semibold text-text transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                <Languages aria-hidden="true" className="size-3.5 text-primary shrink-0" />
                <span className="font-mono text-xs font-bold tracking-wider">{locale === "th" ? "EN" : "TH"}</span>
              </button>

              <form action="/auth/signout" method="post" className="w-full">
                <button
                  type="submit"
                  aria-label={t("nav.signOut")}
                  title={t("nav.signOut", {}, "ออกจากระบบ")}
                  className="flex h-9 w-full items-center justify-center rounded-xl border border-border/80 bg-bg-surface/50 text-text-muted transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  <LogOut aria-hidden="true" className="size-4 shrink-0" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:ml-68">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-bg-base/82 px-3 backdrop-blur-2xl min-[360px]:px-4 sm:px-6 lg:hidden">
          {isAccountPage ? (
            <Link
              href="/dashboard"
              aria-label={t("common.back", {}, "กลับ")}
              className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-text transition-colors hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <ArrowLeft aria-hidden="true" className="size-4.5" />
              <span className="max-[359px]:sr-only">{t("common.back", {}, "กลับ")}</span>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
              <span className="truncate font-heading text-sm font-semibold tracking-tight min-[360px]:text-base">{t("app.name")}</span>
            </Link>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 min-[360px]:gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-bg-surface/55 px-2 text-xs font-semibold text-text transition-colors hover:border-primary/30 hover:text-primary min-[360px]:px-2.5 lg:hidden cursor-pointer"
            >
              <Languages aria-hidden="true" className="size-4 text-primary shrink-0" />
              <span className="font-mono font-bold tracking-wider max-[359px]:sr-only">{locale === "th" ? "EN" : "TH"}</span>
            </button>
            <div className="lg:hidden"><ThemeToggle variant="dropdown" /></div>
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

        <main
          id="main-content"
          className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh lg:pb-0 ${isAccountPage ? "pb-6" : "pb-24"}`}
        >
          {children}
        </main>
      </div>

      {!isAccountPage && (
        <nav
          aria-label={t("nav.primary")}
          className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-sidebar/95 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden"
        >
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors ${
                  active ? "bg-primary/12 text-primary font-semibold" : "text-text-muted hover:bg-bg-surface hover:text-text"
                }`}
              >
                <Icon aria-hidden="true" className="size-4.5" />
                <span>{t(label)}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
