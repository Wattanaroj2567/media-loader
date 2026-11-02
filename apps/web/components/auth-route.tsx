"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { FULL_PAGE_AUTH_MEDIA_QUERY } from "@/lib/auth-viewport";
import styles from "./auth-form.module.css";

export function AuthRoute({
  mode,
}: {
  mode: "login" | "register" | "forgot-password";
}) {
  const router = useRouter();

  useLayoutEffect(() => {
    const media = window.matchMedia(FULL_PAGE_AUTH_MEDIA_QUERY);
    const updatePresentation = () => {
      if (media.matches) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } else {
        const params = new URLSearchParams(window.location.search);
        const error = params.has("error")
          ? `&error=${params.get("error") === "callback" ? "callback" : "auth"}`
          : "";
        const reset = params.get("reset") === "success" ? "&reset=success" : "";
        router.replace(`/?auth=${mode}${error}${reset}`);
      }
    };
    updatePresentation();
    media.addEventListener("change", updatePresentation);
    return () => media.removeEventListener("change", updatePresentation);
  }, [mode, router]);

  return (
    <div className={styles.mobileRoute}>
      <AuthForm mode={mode} />
    </div>
  );
}
