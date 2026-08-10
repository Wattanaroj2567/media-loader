import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingIndicatorProps {
  label: string;
  className?: string;
  iconClassName?: string;
}

export function LoadingIndicator({
  label,
  className,
  iconClassName,
}: LoadingIndicatorProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center gap-2", className)}
    >
      <Loader2 aria-hidden="true" className={cn("size-4 shrink-0 animate-spin", iconClassName)} />
      <span>{label}</span>
    </span>
  );
}
