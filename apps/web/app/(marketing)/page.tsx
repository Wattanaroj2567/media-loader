"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  FileImage,
  HardDrive,
  Info,
  ShieldCheck,
  Sparkles,
  Video,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { LoadingIndicator } from "@/components/loading-indicator";
import { Badge } from "@/components/ui/badge";
import { HeaderUtilityControls } from "@/components/header-utility-controls";
import { MediaAnalyzer } from "@/components/media-analyzer";
import { JobList } from "@/components/job-list";
import { JobPollingProvider } from "@/components/job-polling-provider";
import { GlobalJobNotifier } from "@/components/global-job-notifier";
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

function LandingPageContent() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const scrollToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setAuthError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
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
      id: "youtube",
      name: "YouTube",
      tag: "Up to 8K / 4K / 60fps",
      tagColor: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
      videoDesc: t("landing.ytVideo"),
      audioDesc: t("landing.ytAudio"),
      gifDesc: t("landing.ytGif"),
      gifAvailable: false,
      sizeDesc: t("landing.ytSize"),
      exactSize: true,
    },
    {
      id: "tiktok",
      name: "TikTok",
      tag: "ByteVC1 & H.264",
      tagColor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
      videoDesc: t("landing.ttVideo"),
      audioDesc: t("landing.ttAudio"),
      gifDesc: t("landing.ttGif"),
      gifAvailable: false,
      sizeDesc: t("landing.ttSize"),
      exactSize: true,
    },
    {
      id: "instagram",
      name: "Instagram",
      tag: "Reels & Posts",
      tagColor:
        "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
      videoDesc: t("landing.igVideo"),
      audioDesc: t("landing.igAudio"),
      gifDesc: t("landing.igGif"),
      gifAvailable: false,
      sizeDesc: t("landing.igSize"),
      exactSize: false,
    },
    {
      id: "facebook",
      name: "Facebook",
      tag: "Reels & Watch",
      tagColor: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
      videoDesc: t("landing.fbVideo"),
      audioDesc: t("landing.fbAudio"),
      gifDesc: t("landing.fbGif"),
      gifAvailable: false,
      sizeDesc: t("landing.fbSize"),
      exactSize: false,
    },
    {
      id: "x",
      name: "X",
      tag: t("landing.sourceDependent", {}, "Source-dependent"),
      tagColor:
        "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
      videoDesc: t("landing.xVideo"),
      audioDesc: t("landing.xAudio"),
      gifDesc: t("landing.xGif"),
      gifAvailable: true,
      sizeDesc: t("landing.xSize"),
      exactSize: false,
    },
    {
      id: "bilibili",
      name: "Bilibili",
      tag: t("landing.sourceDependent", {}, "Source-dependent"),
      tagColor:
        "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300",
      videoDesc: t("landing.bilibiliVideo"),
      audioDesc: t("landing.bilibiliAudio"),
      gifDesc: t("landing.bilibiliGif"),
      gifAvailable: false,
      sizeDesc: t("landing.bilibiliSize"),
      exactSize: false,
    },
    {
      id: "vk",
      name: "VK Video",
      tag: "Up to 4K / 2160p",
      tagColor: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
      videoDesc: t("landing.vkVideo"),
      audioDesc: t("landing.vkAudio"),
      gifDesc: t("landing.vkGif"),
      gifAvailable: false,
      sizeDesc: t("landing.vkSize"),
      exactSize: false,
    },
    {
      id: "giphy",
      name: "Giphy",
      tag: "Native GIF",
      tagColor:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      videoDesc: t("landing.giphyVideo"),
      audioDesc: t("landing.giphyAudio"),
      gifDesc: t("landing.giphyGif"),
      gifAvailable: true,
      sizeDesc: t("landing.giphySize"),
      exactSize: false,
    },
  ];

  return (
    <main className="relative min-h-dvh w-full bg-bg-base text-foreground flex flex-col justify-start items-center overflow-x-clip">
      {/* Ambient glow mesh in background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[90vw] max-w-4xl rounded-full bg-primary/6 blur-[140px] dark:bg-primary/8"
      />
      <div
        aria-hidden="true"
        data-testid="hero-ambient-motion"
        className="hero-ambient-motion"
      >
        <span className="hero-ambient-ring" />
        <span className="hero-ambient-ring" />
      </div>

      {/* ─── Top Header Navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full shrink-0 lg:top-4 lg:mt-6 lg:px-8">
        <div
          data-testid="landing-topbar"
          className="mx-auto flex h-13.5 w-full items-center justify-between gap-2 border-b border-border/70 bg-bg-base/80 px-3.5 shadow-xs backdrop-blur-xl sm:h-14 sm:px-6 lg:h-auto lg:max-w-6xl lg:rounded-full lg:border lg:border-border/60 lg:bg-bg-surface/80 lg:p-2 lg:pl-5 lg:shadow-lg lg:shadow-black/5 dark:lg:border-white/10 dark:lg:shadow-black/25"
        >
          <span className="font-heading text-sm font-semibold tracking-tight text-text min-[360px]:text-base">
            {t("app.name")}
          </span>

          <HeaderUtilityControls
            trailing={
              <Button
                type="button"
                size="sm"
                onClick={handleLogin}
                disabled={loading}
                className="h-8 gap-2 rounded-full px-4 text-xs font-semibold shadow-xs transition-[box-shadow,background-color,color,transform] duration-200 hover:shadow-primary/20 active:scale-[0.99] cursor-pointer lg:h-10 lg:px-5"
              >
                {loading ? (
                  <LoadingIndicator label={t("landing.signingIn")} />
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="hidden sm:inline">{t("landing.signIn")}</span>
                    <span className="sm:hidden">{t("landing.signInShort")}</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            }
          />
        </div>
      </header>

      {/* ─── Hero & Downloader Command Center ───────────────────────────── */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto mb-5 max-w-3xl text-center sm:mb-9">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary backdrop-blur-sm sm:px-3.5 sm:text-xs">
            <Sparkles className="size-3.5 shrink-0" />
            <span>
              {t("landing.badgeInstant", {}, "ดาวน์โหลดได้ทันที โดยไม่ต้องเข้าสู่ระบบ")}
            </span>
          </div>

          <h1 className="mt-3 font-heading text-3xl font-bold leading-[1.12] text-text sm:mt-3.5 sm:text-4xl lg:text-5xl">
            {t("landing.title")}
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:mt-3 sm:text-base">
            {t("landing.subtitle")}
          </p>

          <Suspense fallback={null}>
            <AuthErrorMessage message={authError} />
          </Suspense>
        </div>

        {/* Interactive Downloader Box */}
        <div className="ui-panel rounded-3xl p-4 shadow-xl sm:p-6 lg:p-7 border border-border/90 bg-bg-surface/80 backdrop-blur-xl">
          <MediaAnalyzer />

          <div
            id="download-queue-anchor"
            className="w-full scroll-mt-24 empty:hidden has-[*]:mt-5"
          >
            <JobList mode="queue" compact={true} onQueueClosed={scrollToTop} />
          </div>

          {/* Guest notice banner */}
          <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <div className="flex items-center gap-2.5 text-text-muted">
              <div className="grid size-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Info className="size-3.5" />
              </div>
              <span className="wrap-break-word">
                {t(
                  "landing.guestNotice",
                  {},
                  "กำลังใช้งานในโหมดผู้เยี่ยมชม — สามารถดาวน์โหลดไฟล์ได้ทันที หากต้องการบันทึกประวัติการดาวน์โหลดไว้ดูย้อนหลัง"
                )}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogin}
              disabled={loading}
              className="h-8 w-full shrink-0 gap-1.5 rounded-xl border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer sm:w-auto"
            >
              <GoogleIcon />
              <span>
                {t("landing.signInForHistory", {}, "เข้าสู่ระบบเพื่อบันทึกประวัติ")}
              </span>
            </Button>
          </div>
        </div>

        {/* Platform quick badges */}
        <div
          data-testid="platform-quick-badges"
          className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-text-dim sm:mt-6 sm:gap-2 sm:text-xs"
        >
          <span className="text-text-muted">
            {t("landing.supportedPlatformsPrefix", {}, "รองรับการดาวน์โหลด:")}
          </span>
          <div
            data-testid="platform-badge-list"
            className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1.5 font-medium text-text sm:w-auto"
          >
            <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[10px] sm:px-2.5 sm:text-[11px]">
              YouTube
            </span>
            <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[10px] sm:px-2.5 sm:text-[11px]">
              Instagram
            </span>
            <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[10px] sm:px-2.5 sm:text-[11px]">
              TikTok
            </span>
            <span className="rounded-md border border-border bg-bg-surface/80 px-2 py-0.5 text-[10px] sm:px-2.5 sm:text-[11px]">
              Facebook
            </span>
            <span className="rounded-md border border-border bg-bg-surface/80 px-2.5 py-0.5 text-[11px]">
              X
            </span>
            <span className="rounded-md border border-border bg-bg-surface/80 px-2.5 py-0.5 text-[11px]">
              Bilibili
            </span>
            <span className="rounded-md border border-border bg-bg-surface/80 px-2.5 py-0.5 text-[11px]">
              VK Video
            </span>
            <span className="rounded-md border border-border bg-bg-surface/80 px-2.5 py-0.5 text-[11px]">
              Giphy
            </span>
          </div>
          <div className="flex shrink-0 items-center">
            <span
              data-testid="platform-format-separator"
              className="text-border mx-1 hidden sm:inline"
            >
              •
            </span>
            <div
              data-testid="platform-output-formats"
              className="flex items-center gap-1 text-[11px] font-mono text-text-dim"
            >
              <span className="text-primary font-bold">MP4</span>
              <span>/</span>
              <span className="text-primary font-bold">MP3</span>
              <span>/</span>
              <span className="text-primary font-bold">GIF</span>
            </div>
          </div>
        </div>

        {/* ─── 4-Step Explanation Section ─────────────────────────────── */}
        <section className="relative mt-12 w-full lg:mt-16">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
              {t("landing.panelTitle")}
            </h2>
            <Badge
              variant="outline"
              className="rounded-full border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
            >
              {t("landing.howItWorks", {}, "HOW IT WORKS")}
            </Badge>
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-bg-surface/60 backdrop-blur-md md:block">
            <table
              data-testid="workflow-table"
              className="ui-data-table w-full text-left text-xs"
            >
              <thead>
                <tr className="bg-bg-elevated/40 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                  <th className="px-5 py-3.5 w-28">
                    {t("landing.colStepNumber", {}, "ขั้นตอนที่")}
                  </th>
                  <th className="px-5 py-3.5">
                    {t("landing.colStepAction", {}, "รายละเอียดการทำงาน")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => (
                  <tr key={step}>
                    <td className="px-5 py-4">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-text">{step}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-bg-surface/60 backdrop-blur-md divide-y divide-border/40 md:hidden">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4 px-4 py-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm font-medium text-text">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Platform Capabilities & Format Support Section ─────────── */}
        <section
          data-testid="platform-capabilities-section"
          className="relative mt-12 w-full lg:mt-16"
        >
          <div className="mb-6 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge
                variant="outline"
                className="rounded-full border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-semibold text-primary"
              >
                {t("landing.comparisonEyebrow", {}, "Platform Transparency")}
              </Badge>
              <h2 className="mt-2 font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
                {t(
                  "landing.comparisonTitle",
                  {},
                  "Platform Capabilities & Format Support"
                )}
              </h2>
              <p className="mt-1 text-xs text-text-muted sm:text-sm">
                {t(
                  "landing.comparisonSubtitle",
                  {},
                  "Each platform serves media differently. Here is what is analyzed and extracted across platforms."
                )}
              </p>
            </div>
          </div>

          {/* Desktop Table View (sm and above) */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-bg-surface/60 backdrop-blur-md md:block">
            <table
              data-testid="platform-table"
              className="ui-data-table min-w-[920px] w-full text-left text-xs"
            >
              <thead>
                <tr className="bg-bg-elevated/40 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                  <th className="px-5 py-3.5">
                    {t("landing.colPlatform", {}, "Platform")}
                  </th>
                  <th className="px-5 py-3.5">{t("landing.colVideo", {}, "Video")}</th>
                  <th className="px-5 py-3.5">{t("landing.colAudio", {}, "Audio")}</th>
                  <th className="px-5 py-3.5">{t("landing.colGif", {}, "GIF")}</th>
                  <th className="px-5 py-3.5">
                    {t("landing.colSize", {}, "Size Estimation")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p) => (
                  <tr key={p.name}>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-text">{p.name}</span>
                        <span
                          className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium ${p.tagColor}`}
                        >
                          {p.tag}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-muted">{p.videoDesc}</td>
                    <td className="px-5 py-4 text-text-muted">{p.audioDesc}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium ${
                          p.gifAvailable ? "text-primary" : "text-text-dim"
                        }`}
                      >
                        <FileImage className="size-3.5 shrink-0" aria-hidden="true" />
                        {p.gifDesc}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          p.exactSize
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            p.exactSize ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {p.sizeDesc}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (below md) */}
          <div className="grid gap-3 md:hidden">
            {platforms.map((p) => (
              <div
                key={p.name}
                data-testid={`platform-card-${p.id}`}
                className="rounded-2xl border border-border bg-bg-surface/60 p-4 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{p.name}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${p.tagColor}`}
                  >
                    {p.tag}
                  </span>
                </div>
                <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-bg-base/40 text-xs divide-y divide-border/60">
                  <div className="grid grid-cols-[3.25rem_1fr] items-start gap-3 px-3 py-2.5">
                    <span className="font-mono text-[10px] font-bold tracking-wide text-text-dim">
                      MP4
                    </span>
                    <div className="flex items-start gap-2">
                      <Video className="mt-0.5 size-3.5 shrink-0 text-text-dim" />
                      <span className="text-text-muted">{p.videoDesc}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[3.25rem_1fr] items-start gap-3 px-3 py-2.5">
                    <span className="font-mono text-[10px] font-bold tracking-wide text-text-dim">
                      MP3
                    </span>
                    <div className="flex items-start gap-2">
                      <Volume2 className="mt-0.5 size-3.5 shrink-0 text-text-dim" />
                      <span className="text-text-muted">{p.audioDesc}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[3.25rem_1fr] items-start gap-3 px-3 py-2.5">
                    <span
                      className={`font-mono text-[10px] font-bold tracking-wide ${
                        p.gifAvailable ? "text-primary" : "text-text-dim"
                      }`}
                    >
                      GIF
                    </span>
                    <div className="flex items-start gap-2">
                      <FileImage
                        className={`mt-0.5 size-3.5 shrink-0 ${
                          p.gifAvailable ? "text-primary" : "text-text-dim"
                        }`}
                      />
                      <span
                        className={
                          p.gifAvailable ? "font-medium text-primary" : "text-text-dim"
                        }
                      >
                        {p.gifDesc}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2 px-1 text-xs">
                  <HardDrive className="mt-0.5 size-3.5 shrink-0 text-text-dim" />
                  <span
                    className={`font-medium ${
                      p.exactSize
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {p.sizeDesc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust assurances */}
        <section data-testid="assurances-section" className="mt-10 lg:mt-12">
          <div className="grid gap-3.5 sm:grid-cols-3">
            {assurances.map((item, index) => (
              <div
                key={item}
                data-testid="assurance-card"
                className="relative flex flex-col justify-between rounded-2xl border border-border bg-bg-surface/60 p-4 backdrop-blur-md dark:bg-bg-surface/40"
              >
                <div className="flex items-center justify-between">
                  <div className="grid size-8 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="size-4.5" />
                  </div>
                  <span className="font-mono text-[10px] text-text-dim">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-text-muted">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LandingPage() {
  return (
    <JobPollingProvider>
      <GlobalJobNotifier />
      <LandingPageContent />
    </JobPollingProvider>
  );
}
