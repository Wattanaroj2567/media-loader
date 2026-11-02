import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BackButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
  "aria-label"?: string;
}

export function BackButton({
  href,
  children,
  className,
  prefetch,
  "aria-label": ariaLabel,
}: BackButtonProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 select-none",
        className
      )}
    >
      <ArrowLeft
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5"
      />
      <span>{children}</span>
    </Link>
  );
}
