"use client";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function SiteFooter({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  const { t } = useT();

  return (
    <footer
      data-testid="site-footer"
      className={cn(
        "flex w-full shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs text-text-dim",
        showTagline ? "sm:justify-between" : "",
        className
      )}
    >
      <span>© {new Date().getFullYear()} Media Loader</span>
      {showTagline && <span>{t("app.tagline")}</span>}
      <nav aria-label={t("footer.legalNav")} className="flex items-center gap-4">
        <Link
          href="/how-it-works"
          className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          {t("footer.howItWorks")}
        </Link>
        <Link
          href="/contact"
          className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          {t("footer.contact")}
        </Link>
        <Link
          href="/privacy"
          className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          {t("footer.privacy")}
        </Link>
        <Link
          href="/terms"
          className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          {t("footer.terms")}
        </Link>
      </nav>
      <a
        href="https://github.com/Wattanaroj2567/media-loader"
        className="inline-flex items-center gap-1.5 border-border transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none sm:ml-1 sm:border-l sm:pl-4"
      >
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.386-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.81 1.304 3.495.997.108-.776.42-1.305.762-1.605-2.665-.3-5.467-1.333-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.123-.303-.536-1.523.117-3.176 0 0 1.005-.322 3.3 1.23.96-.266 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.655 1.653.243 2.873.12 3.176.77.84 1.23 1.91 1.23 3.22 0 4.61-2.807 5.625-5.48 5.92.43.372.81 1.102.81 2.222 0 1.605-.015 2.9-.015 3.3 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
        GitHub
      </a>
    </footer>
  );
}
