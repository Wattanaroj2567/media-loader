"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import styles from "./auth-form.module.css";

export const FULL_PAGE_AUTH_MEDIA_QUERY =
  "(max-width: 639px), (max-width: 950px) and (max-height: 480px)";

export function AuthRoute({
  mode,
}: {
  mode: "login" | "register" | "forgot-password";
}) {
  const router = useRouter();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(FULL_PAGE_AUTH_MEDIA_QUERY);
    const updatePresentation = () => {
      if (media.matches) setMobile(true);
      else {
        const params = new URLSearchParams(window.location.search);
        const error = params.has("error") ? "&error=auth" : "";
        const reset = params.get("reset") === "success" ? "&reset=success" : "";
        router.replace(`/?auth=${mode}${error}${reset}`);
      }
    };
    updatePresentation();
    media.addEventListener("change", updatePresentation);
    return () => media.removeEventListener("change", updatePresentation);
  }, [mode, router]);

  return mobile ? (
    <div className={styles.mobileRoute}>
      <AuthForm mode={mode} />
    </div>
  ) : null;
}
