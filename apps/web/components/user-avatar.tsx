"use client";

import { useState } from "react";
import { CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  className?: string;
  fallbackIcon?: boolean;
}

export function UserAvatar({
  name = "User",
  avatarUrl,
  className,
  fallbackIcon = false,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Compute initials cleanly
  const initials = (() => {
    if (!name || !name.trim()) return "U";
    const cleaned = name.trim().replace(/[()[\]{}]/g, "");
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  })();

  const showImage = Boolean(avatarUrl && !hasError);

  return (
    <div
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-bg-elevated text-xs font-bold text-primary select-none",
        className,
      )}
      role="img"
      aria-label={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          loading="eager"
          decoding="async"
          onError={() => setHasError(true)}
          className="size-full object-cover object-center"
        />
      ) : fallbackIcon ? (
        <CircleUserRound className="size-3/5 text-text-dim" />
      ) : (
        <span className="font-heading tracking-tight">{initials}</span>
      )}
    </div>
  );
}

