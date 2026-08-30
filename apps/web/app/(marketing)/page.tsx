"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Video,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/loading-indicator";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { useT } from "@/lib/i18n/context";


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
      const { createClient } = await import("@/utils/supabase/client");
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

  const platforms = [
    {
      name: "YouTube",
      tag: "1080p / 60fps",
      tagColor: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
      videoDesc: t("landing.ytVideo"),
      audioDesc: t("landing.ytAudio"),
      sizeDesc: t("landing.ytSize"),
      exactSize: true,
      outputs: ["MP4 (1080p)", "MP3 (320k)"],
    },
    {
      name: "TikTok",
      tag: "ByteVC1 & H.264",
      tagColor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
      videoDesc: t("landing.ttVideo"),
      audioDesc: t("landing.ttAudio"),
      sizeDesc: t("landing.ttSize"),
      exactSize: true,
      outputs: ["MP4 (1080p)", "MP3"],
    },
    {
      name: "Instagram",
      tag: "Reels & Posts",
      tagColor: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
      videoDesc: t("landing.igVideo"),
      audioDesc: t("landing.igAudio"),
      sizeDesc: t("landing.igSize"),
      exactSize: false,
      outputs: ["MP4", "MP3"],
    },
    {
      name: "Facebook",
      tag: "Reels & Watch",
      tagColor: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
      videoDesc: t("landing.fbVideo"),
      audioDesc: t("landing.fbAudio"),
      sizeDesc: t("landing.fbSize"),
      exactSize: false,
      outputs: ["MP4 (HD/SD)", "MP3"],
    },
  ];

  return (
    <main className="relative min-h-dvh w-full bg-bg-base px-4 py-8 text-foreground sm:px-6 md:py-12 lg:px-10 lg:py-12 xl:px-14 flex flex-col justify-start items-center overflow-x-hidden">
      {/* Ambient glow mesh in background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[90vw] max-w-4xl rounded-full bg-primary/6 blur-[140px] dark:bg-primary/8"
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 xl:gap-16 2xl:max-w-screen-2xl">
        {/* Left Column: Hero & Bento Features */}
        <section className="w-full max-w-3xl">
          <div className="mb-4 sm:mb-5 lg:mb-4 flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="font-heading text-base font-semibold tracking-tight text-text sm:text-lg">
              {t("app.name")}
            </p>
          </div>

          <Badge
            variant="outline"
            className="rounded-full border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-sm"
          >
            {t("landing.eyebrow")}
          </Badge>

          <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-text sm:text-4xl lg:text-5xl xl:text-6xl">
            {t("landing.title")}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base lg:text-lg">
            {t("landing.subtitle")}
          </p>

          {/* CTA & Platform Badges */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center animate-fade-in-up [animation-delay:400ms]">
            <Button
              type="button"
              size="lg"
              onClick={handleLogin}
              disabled={loading}
              className="h-12 rounded-2xl px-7 text-sm font-semibold shadow-lg transition-all duration-200 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <LoadingIndicator label={t("landing.signingIn")} />
              ) : (
                <>
                  <GoogleIcon />
                  <span>{t("landing.signIn")}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-dim animate-fade-in-up [animation-delay:500ms]">
            <span className="text-text-muted">{t("landing.supportedPlatformsPrefix", {}, "รองรับการดาวน์โหลด:")}</span>
            <div className="flex flex-wrap items-center gap-1.5 font-medium text-text">
              <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[11px]">YouTube</span>
              <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[11px]">Instagram</span>
              <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[11px]">TikTok</span>
              <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[11px]">Facebook</span>
            </div>
            <span className="text-border mx-1">•</span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-text-dim">
              <span className="text-primary font-bold">MP4</span>
              <span>/</span>
              <span className="text-primary font-bold">MP3</span>
            </div>
          </div>

          <Suspense fallback={null}>
            <AuthErrorMessage message={authError} />
          </Suspense>

          {/* Assurances Bento Grid (3-column) */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {assurances.map((item, index) => (
              <div
                key={item}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-bg-surface/60 p-4 backdrop-blur-md transition-all duration-200 hover:border-primary/30 hover:bg-bg-surface dark:bg-bg-surface/40 animate-fade-in-up"
                style={{ animationDelay: `${600 + index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="grid size-8 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <ShieldCheck className="size-4.5" />
                  </div>
                  <span className="font-mono text-[10px] text-text-dim">0{index + 1}</span>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-text-muted group-hover:text-text transition-colors">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Interactive 4-Step Workflow Card */}
        <section className="ui-panel relative overflow-hidden rounded-3xl border border-border bg-bg-surface/70 p-4 sm:p-5 lg:p-6 backdrop-blur-xl shadow-2xl animate-fade-in-up [animation-delay:800ms]">
          <BorderBeam size={220} duration={10} colorFrom="#00c8ff" colorTo="#0070f3" />
          <div className="absolute inset-x-12 -top-px h-px bg-linear-to-r from-transparent via-primary/80 to-transparent" />
          
          <div className="flex items-center justify-between border-b border-border/70 pb-4">
            <div>
              <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-primary">
                {t("landing.howItWorks", {}, "FOUR SIMPLE STEPS")}
              </p>
              <h2 className="mt-0.5 font-heading text-base font-semibold text-text sm:text-lg">
                {t("landing.panelTitle")}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              <span>Ready</span>
            </div>
          </div>

          {/* Steps list with smooth animated progress bars */}
          <div className="mt-4 grid gap-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="group flex gap-3.5 rounded-2xl border border-border/80 bg-bg-base/40 p-3 sm:p-3.5 transition-all duration-200 hover:border-border hover:bg-bg-base/70"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary transition-transform group-hover:scale-105">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-text group-hover:text-primary transition-colors">
                    {step}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-surface/80">
                    <div
                      className="h-full rounded-full bg-primary transition-all ease-out duration-700"
                      style={{
                        width: isMounted ? `${(index + 1) * 25}%` : "0%",
                        transitionDelay: `${1000 + index * 150}ms`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ─── Platform Capabilities & Format Support Section ─────────── */}
      <section className="relative mx-auto mt-12 w-full max-w-7xl lg:mt-16 animate-fade-in-up [animation-delay:900ms]">
        <div className="mb-6 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge
              variant="outline"
              className="rounded-full border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-semibold text-primary"
            >
              {t("landing.comparisonEyebrow", {}, "Platform Transparency")}
            </Badge>
            <h2 className="mt-2 font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
              {t("landing.comparisonTitle", {}, "Platform Capabilities & Format Support")}
            </h2>
            <p className="mt-1 text-xs text-text-muted sm:text-sm">
              {t("landing.comparisonSubtitle", {}, "Each platform serves media differently. Here is what is analyzed and extracted across platforms.")}
            </p>
          </div>
        </div>

        {/* Desktop Table View (sm and above) */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-bg-surface/60 backdrop-blur-md md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-bg-elevated/40 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                <th className="px-5 py-3.5">{t("landing.colPlatform", {}, "Platform")}</th>
                <th className="px-5 py-3.5">{t("landing.colVideo", {}, "Video Quality")}</th>
                <th className="px-5 py-3.5">{t("landing.colAudio", {}, "Audio (MP3)")}</th>
                <th className="px-5 py-3.5">{t("landing.colSize", {}, "Filesize Display")}</th>
                <th className="px-5 py-3.5">{t("landing.colOutput", {}, "Output Formats")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {platforms.map((p) => (
                <tr key={p.name} className="transition-colors hover:bg-bg-surface/90">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-text">{p.name}</span>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${p.tagColor}`}>
                        {p.tag}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Video className="size-3.5 text-primary shrink-0" />
                      <span>{p.videoDesc}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="size-3.5 text-emerald-500 shrink-0" />
                      <span>{p.audioDesc}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="size-3.5 text-amber-500 shrink-0" />
                      <span>{p.sizeDesc}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {p.outputs.map((out) => (
                        <span
                          key={out}
                          className="rounded-md border border-border/80 bg-bg-base/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-text"
                        >
                          {out}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="grid gap-3 md:hidden">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl border border-border bg-bg-surface/60 p-4 backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="font-heading text-sm font-bold text-text">{p.name}</span>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${p.tagColor}`}>
                  {p.tag}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <Video className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-text-dim text-[11px] block">{t("landing.colVideo", {}, "Video Quality")}:</span>
                    <span className="text-text-muted">{p.videoDesc}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Volume2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-text-dim text-[11px] block">{t("landing.colAudio", {}, "Audio (MP3)")}:</span>
                    <span className="text-text-muted">{p.audioDesc}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <HardDrive className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-text-dim text-[11px] block">{t("landing.colSize", {}, "Filesize")}:</span>
                    <span className="text-text-muted">{p.sizeDesc}</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1.5 pt-1 border-t border-border/40">
                  <span className="text-text-dim text-[11px]">{t("landing.colOutput", {}, "Output")}:</span>
                  <div className="flex flex-wrap gap-1">
                    {p.outputs.map((out) => (
                      <span
                        key={out}
                        className="rounded-md border border-border/80 bg-bg-base/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-text"
                      >
                        {out}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

