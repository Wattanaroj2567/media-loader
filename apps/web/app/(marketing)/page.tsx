"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/context";
import { createClient } from "@/utils/supabase/client";


function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.64-.057-1.255-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908C16.658 14.253 17.64 11.945 17.64 9.2Z"
        fill="currentColor"
        fillOpacity="0.95"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
    </svg>
  );
}

function AuthErrorMessage({ message }: { message: string }) {
  const { t } = useT();
  const searchParams = useSearchParams();
  const visibleMessage =
    message || (searchParams.has("error") ? t("landing.authError") : "");

  if (!visibleMessage) return null;
  return (
    <p
      role="alert"
      className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-800 dark:text-rose-200"
    >
      {visibleMessage}
    </p>
  );
}

export default function LandingPage() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setAuthError("");
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (!error) return;
      console.warn("[Google OAuth Login Error]:", error);
      setAuthError(t("landing.authError"));
    } catch (err) {
      console.warn("[Google OAuth Login Catch]:", err);
      setAuthError(t("landing.authError"));
    } finally {
      setLoading(false);
    }
  };

  const assurances = [
    t("landing.localOnly"),
    t("landing.policyFirst"),
    t("landing.noCloudDefault"),
  ];

  const steps = [
    t("landing.step1"),
    t("landing.step2"),
    t("landing.step3"),
    t("landing.step4"),
  ];

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg-base px-4 py-4 text-foreground sm:px-6 lg:h-dvh lg:py-6 lg:px-10 flex flex-col justify-center">
      
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 xl:gap-16">
        <section className="max-w-3xl">
          {/* 1. Header (delay 100ms) */}
          <div className="mb-6 sm:mb-8 lg:mb-6 flex items-center gap-3 animate-fade-in-up [animation-delay:100ms]">
            <div className="relative grid size-10 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
              <Download className="size-5 text-primary" />
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-bg-base bg-emerald-400" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold tracking-tight">
                {t("app.name")}
              </p>
            </div>
          </div>

          {/* 2. Eyebrow badge (delay 200ms) */}
          <div className="animate-fade-in-up [animation-delay:200ms]">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary text-xs"
            >
              {t("landing.eyebrow")}
            </Badge>
          </div>

          {/* 3. Main title (delay 300ms) */}
          <h1 className="mt-4 max-w-3xl font-heading text-3xl font-semibold leading-[1.1] tracking-[-0.035em] text-text sm:text-4xl lg:text-5xl xl:text-6xl animate-fade-in-up [animation-delay:300ms]">
            {t("landing.title")}
          </h1>

          {/* 4. Subtitle description (delay 400ms) */}
          <p className="mt-3.5 max-w-2xl text-sm leading-7 text-text-muted sm:text-base animate-fade-in-up [animation-delay:400ms]">
            {t("landing.subtitle")}
          </p>

          {/* 5. CTA container (delay 500ms) */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row animate-fade-in-up [animation-delay:500ms]">
            <Button
              type="button"
              size="lg"
              onClick={handleLogin}
              disabled={loading}
              className="h-11.5 rounded-xl px-6 text-sm font-semibold transition-colors duration-200 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {loading ? t("landing.signingIn") : t("landing.signIn")}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-dim animate-fade-in-up [animation-delay:600ms]">
            <span>{t("landing.supportedPlatformsPrefix", {}, "รองรับการดาวน์โหลด:")}</span>
            <span className="font-semibold text-text-muted">YouTube</span>
            <span className="text-border">•</span>
            <span className="font-semibold text-text-muted">Instagram</span>
            <span className="text-border">•</span>
            <span className="font-semibold text-text-muted">TikTok</span>
            <span className="text-border">•</span>
            <span className="font-semibold text-text-muted">Facebook</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-dim animate-fade-in-up [animation-delay:650ms]">
            <span>{t("landing.outputFormatsPrefix", {}, "รูปแบบไฟล์:")}</span>
            <span className="font-semibold text-text-muted">MP4</span>
            <span className="text-border">•</span>
            <span className="font-semibold text-text-muted">MP3</span>
          </div>

          <Suspense fallback={null}>
            <AuthErrorMessage message={authError} />
          </Suspense>

          {/* 6. Assurances cards (staggered delay starting at 700ms) */}
          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
            {assurances.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-2.5 rounded-2xl border border-border bg-bg-elevated/45 p-3 shadow-[inset_0_1px_0_var(--panel-highlight)] backdrop-blur sm:flex-col sm:items-start sm:p-3.5 animate-fade-in-up"
                style={{ animationDelay: `${700 + index * 100}ms` }}
              >
                <ShieldCheck className="size-4.5 shrink-0 text-primary" />
                <p className="text-xs font-medium leading-relaxed text-text-muted sm:mt-2">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Right flow card (delay 900ms) */}
        <section className="ui-panel relative rounded-[2rem] p-3 sm:p-4 animate-fade-in-up [animation-delay:900ms]">
          <div className="absolute inset-x-12 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <div className="rounded-[1.5rem] border border-border bg-bg-base/35 p-4 sm:p-5 lg:p-5.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-dim">
                  {t("landing.howItWorks", {}, "ใช้งานง่ายใน 4 ขั้นตอน")}
                </p>
                <h2 className="mt-1.5 font-heading text-lg font-semibold text-text sm:text-xl">
                  {t("landing.panelTitle")}
                </h2>
              </div>
              <div className="grid size-9 place-items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-300" />
              </div>
            </div>

            {/* Steps list with staggered progress bars */}
            <div className="mt-6 grid gap-2.5">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-3 rounded-2xl border border-border bg-bg-surface/50 p-2.5 sm:p-3"
                >
                  <span className="grid size-7.5 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-text">{step}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-base/40">
                      <div
                        className="h-full rounded-full bg-primary transition-all ease-out duration-700"
                        style={{
                          width: isMounted ? `${(index + 1) * 24}%` : "0%",
                          transitionDelay: `${1100 + index * 200}ms`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
