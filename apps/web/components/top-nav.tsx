"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, LogOut, ChevronDown, Languages } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n/context";

import { ThemeToggle } from "@/components/theme-toggle";

interface TopNavProps {
  user: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

const TABS = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/history", labelKey: "nav.history" },
];

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`grid size-${size} shrink-0 place-items-center overflow-hidden rounded-full bg-primary/20 text-xs font-semibold text-primary`}
      style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      role={avatarUrl ? "img" : undefined}
      aria-label={name}
    >
      {!avatarUrl && initials}
    </div>
  );
}

function AccountDropdown({
  user,
  onClose,
}: {
  user: TopNavProps["user"];
  onClose: () => void;
}) {

  const { t } = useT();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    setSigningOut(true);
  };

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-1.5rem)] max-w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/15 dark:shadow-black/90">
      {/* Section Label: Profile */}
      <div className="px-4 pt-3.5 pb-1 text-[10px] font-bold tracking-wider text-text-dim uppercase">
        {t("nav.account", {}, "PROFILE")}
      </div>

      {/* Profile Card Info Container */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar name={user.name} avatarUrl={user.avatar_url} size={9} />
        <div className="min-w-0 flex-1">
          <Link
            href="/settings"
            onClick={onClose}
            title={t("account.title")}
            className="inline-block truncate text-sm font-semibold text-text hover:text-primary hover:underline max-w-full"
          >
            {user.name}
          </Link>
          <p className="truncate text-xs text-text-muted">{user.email}</p>
        </div>
      </div>

      <div className="border-b border-border" />

      {/* Actions */}
      <div className="p-1">
        <form action="/auth/signout" method="post" onSubmit={handleSignOut}>
          <button
            type="submit"
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 transition-all hover:bg-rose-500/10 dark:hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-50 text-left cursor-pointer"
          >
            <LogOut className="size-4" />
            {signingOut ? t("account.signingOut", {}, "กำลังออกจากระบบ...") : t("account.signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useT();
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2 pr-2 sm:pr-4">
          <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Download className="size-4" />
          </div>
          <span className="hidden font-semibold tracking-tight text-sm text-foreground sm:block">
            Media Loader
          </span>
        </Link>

        {/* Tab navigation (Underscore style) */}
        <nav className="flex flex-1 items-center gap-1 self-stretch overflow-x-auto no-scrollbar">
          {TABS.map(({ href, labelKey }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex h-full items-center px-1.5 sm:px-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "text-primary font-semibold" : "text-text-muted hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span>{t(labelKey)}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side tools */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          {/* Language Switcher Button */}
          <button
            type="button"
            onClick={() => setLocale(locale === "th" ? "en" : "th")}
            title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-bg-surface/50 px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 hover:bg-bg-surface hover:text-primary cursor-pointer"
          >
            <Languages className="size-4 shrink-0 text-primary" />
            <span className="font-mono font-bold tracking-wider">{locale === "th" ? "EN" : "TH"}</span>
          </button>

          {/* Theme Switcher Button */}
          <ThemeToggle />

          {/* Account button */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-bg-surface/50 px-2 sm:pl-2.5 sm:pr-2.5 transition-colors hover:border-primary/40 hover:bg-bg-surface cursor-pointer"
              aria-expanded={accountOpen}
              aria-label="บัญชีของฉัน"
            >
              <Avatar name={user.name} avatarUrl={user.avatar_url} size={7} />
              <ChevronDown
                className={`size-3.5 text-text-dim transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`}
              />
            </button>

            {accountOpen && (
              <AccountDropdown user={user} onClose={() => setAccountOpen(false)} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
