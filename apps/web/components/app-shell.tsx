"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Home, LogOut, Settings, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HeaderUtilityControls } from "@/components/header-utility-controls";
import { UserAvatar } from "@/components/user-avatar";
import type { AppUser } from "@/components/app-user-context";
import { useT } from "@/lib/i18n/context";
import { clearGuestSessionId } from "@/lib/guest-session.ts";

interface AppShellProps {
  children: React.ReactNode;
  user: AppUser;
}

const navigation = [
  { href: "/dashboard", label: "nav.newDownload", icon: Home },
  { href: "/history", label: "nav.history", icon: Clock3 },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const { t } = useT();
  const [isOffline, setIsOffline] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavigationCompact, setMobileNavigationCompact] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const isAccountPage = pathname.startsWith("/settings");

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

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;

      if (currentY <= 72) {
        setMobileNavigationCompact(false);
      } else if (currentY !== lastY) {
        setMobileNavigationCompact(currentY > lastY);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-dvh bg-bg-base text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* ─── Header Navigation ─────────────────────────────────────── */}
      {!isAccountPage && (
        <>
          {/* ─── Floating Topbar (lg+) ──────────────────────────────────── */}
          <header className="fixed top-4 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-2.5 rounded-full border border-border/60 bg-bg-surface/80 p-2 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-bg-surface/80 dark:shadow-black/25 lg:flex">
            {/* Navigation Tabs */}
            <nav aria-label={t("nav.primary")} className="flex items-center gap-1.5">
              {navigation.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/dashboard" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 items-center gap-2.5 px-5 text-sm font-semibold transition-all duration-200 select-none ${
                      active ? "text-primary" : "text-text-muted"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`size-3.5 shrink-0 ${active ? "text-primary" : "text-text-muted"}`}
                    />
                    <span>{t(label)}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Vertical Divider */}
            <div className="h-4 w-px bg-border/70 dark:bg-white/10 mx-0.5" />

            {/* Right Tools: Language + Theme + User Menu */}
            <HeaderUtilityControls
              trailing={
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-expanded={userMenuOpen}
                    aria-label={t("nav.account")}
                    className="flex size-9 items-center justify-center rounded-full border border-transparent transition-all hover:ring-2 hover:ring-primary/30 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <UserAvatar
                      name={user.name}
                      avatarUrl={user.avatar_url}
                      className="size-8"
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150">
                      {/* User Profile Card linking to /settings with Settings gear icon */}
                      <Link
                        href="/settings"
                        prefetch={false}
                        onClick={() => setUserMenuOpen(false)}
                        className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors duration-150 outline-none hover:bg-bg-surface dark:hover:bg-white/6"
                      >
                        <UserAvatar
                          name={user.name}
                          avatarUrl={user.avatar_url}
                          className="size-9 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-text transition-colors">
                            {user.name}
                          </p>
                          <p className="truncate text-[11px] text-text-muted">
                            {user.email}
                          </p>
                        </div>
                        <Settings className="size-4 shrink-0 text-text-dim transition-colors group-hover:text-text" />
                      </Link>

                      {/* Sign Out Action */}
                      <div className="mt-1 border-t border-border/60 pt-1">
                        <form
                          action="/auth/signout"
                          method="post"
                          onSubmit={() => clearGuestSessionId()}
                        >
                          <button
                            type="submit"
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 cursor-pointer"
                          >
                            <LogOut className="size-4 shrink-0" />
                            <span>{t("account.signOut", {}, "ออกจากระบบ")}</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </header>

          {/* ─── Mobile Header (< lg) ────────────────────────────────── */}
          <header
            data-testid="app-mobile-header"
            data-scroll-state="visible"
            className="sticky top-0 z-30 flex h-13.5 items-center border-b border-border/70 bg-bg-base/80 px-3.5 shadow-xs backdrop-blur-xl sm:h-14 sm:px-6 lg:hidden"
          >
            <Link
              href="/dashboard"
              prefetch={false}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span className="truncate font-heading text-sm font-semibold tracking-tight min-[360px]:text-base">
                {t("app.name")}
              </span>
            </Link>

            <HeaderUtilityControls
              className="ml-auto shrink-0"
              trailing={
                <Link
                  href="/settings"
                  prefetch={false}
                  aria-label={t("nav.account")}
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/60 lg:hidden"
                >
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatar_url}
                    className="size-8 ring-1 ring-border/60"
                  />
                </Link>
              }
            />
          </header>
        </>
      )}

      {isOffline && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-300"
        >
          <WifiOff aria-hidden="true" className="size-4" />
          {t("common.offlineWarning", {}, "ขาดการเชื่อมต่อเครือข่ายชั่วคราว")}
        </div>
      )}

      {/* ─── Main Content (Full Desktop Width / No Sidebar Offset) ──── */}
      <main
        id="main-content"
        className={`min-h-[calc(100dvh-3.5rem)] ${isAccountPage ? "pt-0 pb-8 lg:pb-14" : "pt-0 lg:pt-20 pb-24 lg:pb-12"}`}
      >
        {children}
      </main>

      {/* ─── Mobile Bottom Nav (< lg) ────────────────────────────────── */}
      {!isAccountPage && (
        <nav
          aria-label={t("nav.primary")}
          data-testid="app-mobile-navigation"
          data-scroll-state={mobileNavigationCompact ? "compact" : "expanded"}
          className={`fixed bottom-3 left-1/2 z-40 grid -translate-x-1/2 grid-cols-2 gap-1 border border-border bg-sidebar/95 shadow-lg shadow-black/10 backdrop-blur-2xl transition-[width,padding,border-radius] duration-300 ease-out dark:shadow-black/30 lg:hidden ${
            mobileNavigationCompact
              ? "w-36 rounded-full p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
              : "w-[calc(100%-1.5rem)] rounded-full p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
          }`}
        >
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  mobileNavigationCompact
                    ? "min-h-10 rounded-full"
                    : "min-h-12 flex-col gap-1 rounded-full"
                } ${
                  active
                    ? "bg-primary/12 text-primary font-semibold"
                    : "text-text-muted hover:bg-bg-surface hover:text-text"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={mobileNavigationCompact ? "size-5" : "size-4.5"}
                />
                <span className={mobileNavigationCompact ? "sr-only" : undefined}>
                  {t(label)}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
