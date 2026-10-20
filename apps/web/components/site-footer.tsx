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
    </footer>
  );
}
