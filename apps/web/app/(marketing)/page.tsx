"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  CloudOff,
  Download,
  Minus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  LandingAuthProvider,
  useLandingAuth,
} from "@/components/landing-auth-provider";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { HeaderUtilityControls } from "@/components/header-utility-controls";
import { LandingLinkForm } from "@/components/landing-link-form";
import { HeroPlatforms } from "@/components/hero-platforms";
import heroStyles from "@/components/hero-platforms.module.css";
import { SiteFooter } from "@/components/site-footer";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

function LandingPageContent() {
  const { t } = useT();
  const { openAuth } = useLandingAuth();
  const [expandedPlatformId, setExpandedPlatformId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 20);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const assurances = [
    {
      title: t("landing.localOnly"),
      description: t("landing.localOnlyDescription"),
      icon: Download,
    },
    {
      title: t("landing.policyFirst"),
      description: t("landing.policyFirstDescription"),
      icon: ShieldCheck,
    },
    {
      title: t("landing.noCloudDefault"),
      description: t("landing.noCloudDefaultDescription"),
      icon: CloudOff,
    },
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
      videoDesc: t("landing.ytVideo"),
      videoSummary: t("landing.ytVideoSummary"),
      audioDesc: t("landing.ytAudio"),
      audioStatus: "available",
      audioSummary: t("landing.capabilityYes"),
      gifDesc: t("landing.ytGif"),
      gifStatus: "unavailable",
      gifSummary: t("landing.capabilityNo"),
      sizeDesc: t("landing.ytSize"),
    },
    {
      id: "tiktok",
      name: "TikTok",
      videoDesc: t("landing.ttVideo"),
      videoSummary: t("landing.ttVideoSummary"),
      audioDesc: t("landing.ttAudio"),
      audioStatus: "available",
      audioSummary: t("landing.capabilityYes"),
      gifDesc: t("landing.ttGif"),
      gifStatus: "unavailable",
      gifSummary: t("landing.capabilityNo"),
      sizeDesc: t("landing.ttSize"),
    },
    {
      id: "instagram",
      name: "Instagram",
      videoDesc: t("landing.igVideo"),
      videoSummary: t("landing.igVideoSummary"),
      audioDesc: t("landing.igAudio"),
      audioStatus: "available",
      audioSummary: t("landing.capabilityYes"),
      gifDesc: t("landing.igGif"),
      gifStatus: "unavailable",
      gifSummary: t("landing.capabilityNo"),
      sizeDesc: t("landing.igSize"),
    },
    {
      id: "facebook",
      name: "Facebook",
      videoDesc: t("landing.fbVideo"),
      videoSummary: t("landing.fbVideoSummary"),
      audioDesc: t("landing.fbAudio"),
      audioStatus: "conditional",
      audioSummary: t("landing.capabilitySomeClips"),
      gifDesc: t("landing.fbGif"),
      gifStatus: "conditional",
      gifSummary: t("landing.capabilitySomePosts"),
      sizeDesc: t("landing.fbSize"),
    },
    {
      id: "x",
      name: "X",
      videoDesc: t("landing.xVideo"),
      videoSummary: t("landing.xVideoSummary"),
      audioDesc: t("landing.xAudio"),
      audioStatus: "conditional",
      audioSummary: t("landing.capabilitySomeClips"),
      gifDesc: t("landing.xGif"),
      gifStatus: "conditional",
      gifSummary: t("landing.capabilitySomePosts"),
      sizeDesc: t("landing.xSize"),
    },
    {
      id: "bilibili",
      name: "Bilibili",
      videoDesc: t("landing.bilibiliVideo"),
      videoSummary: t("landing.bilibiliVideoSummary"),
      audioDesc: t("landing.bilibiliAudio"),
      audioStatus: "available",
      audioSummary: t("landing.capabilityYes"),
      gifDesc: t("landing.bilibiliGif"),
      gifStatus: "unavailable",
      gifSummary: t("landing.capabilityNo"),
      sizeDesc: t("landing.bilibiliSize"),
    },
    {
      id: "vk",
      name: "VK Video",
      videoDesc: t("landing.vkVideo"),
      videoSummary: t("landing.vkVideoSummary"),
      audioDesc: t("landing.vkAudio"),
      audioStatus: "conditional",
      audioSummary: t("landing.capabilitySomeClips"),
      gifDesc: t("landing.vkGif"),
      gifStatus: "unavailable",
      gifSummary: t("landing.capabilityNo"),
      sizeDesc: t("landing.vkSize"),
    },
    {
      id: "giphy",
      name: "Giphy",
      videoDesc: t("landing.giphyVideo"),
      videoSummary: t("landing.giphyVideoSummary"),
      audioDesc: t("landing.giphyAudio"),
      audioStatus: "unavailable",
      audioSummary: t("landing.capabilityNo"),
      gifDesc: t("landing.giphyGif"),
      gifStatus: "available",
      gifSummary: t("landing.capabilityGif"),
      sizeDesc: t("landing.giphySize"),
    },
  ] as const;

  const renderCapability = (
    status: "available" | "conditional" | "unavailable",
    summary: string
  ) => {
    const isUnavailable = status === "unavailable";
    const Icon = isUnavailable ? Minus : Check;
    const color = isUnavailable
      ? "text-text-dim"
      : status === "conditional"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

    return (
      <span
        aria-label={`${
          isUnavailable ? t("landing.capabilityNo") : t("landing.capabilityYes")
        }: ${summary}`}
        className={`inline-flex items-center gap-1.5 font-semibold ${color}`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span>{summary}</span>
      </span>
    );
  };

  const renderPlatformDetails = (platform: (typeof platforms)[number]) => (
    <div
      id={`platform-details-${platform.id}`}
      data-testid={`platform-details-${platform.id}`}
      className="grid gap-3 rounded-xl border border-border/70 bg-bg-base/40 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4"
    >
      {[
        [t("landing.labelVideo"), platform.videoDesc],
        [t("landing.labelAudio"), platform.audioDesc],
        ["GIF", platform.gifDesc],
        [t("landing.detailSize"), platform.sizeDesc],
      ].map(([label, value]) => (
        <div key={label} className="space-y-1">
          <p className="font-semibold text-text">{label}</p>
          <p className="leading-relaxed text-text-muted">{value}</p>
        </div>
      ))}
    </div>
  );

  return (
    <main className="relative min-h-dvh w-full bg-bg-base text-foreground flex flex-col justify-start items-center overflow-x-clip">
      {/* Soft ambient light behind the hero. */}
      <div
        aria-hidden="true"
        data-testid="hero-ambient-motion"
        className="hero-ambient-motion"
      >
        <span className="hero-ambient-glow" />
        <span className="hero-ambient-glow" />
      </div>

      {/* ─── Top Header Navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full shrink-0 transition-all duration-300 lg:py-3 lg:px-8">
        <div
          data-testid="landing-topbar"
          className={cn(
            "mx-auto flex h-13.5 w-full items-center justify-between gap-2 px-3.5 transition-all duration-300 sm:h-14 sm:px-6 lg:h-auto lg:max-w-272 lg:rounded-full lg:p-2 lg:pl-5",
            isScrolled
              ? "border-b border-border/40 bg-white/70 backdrop-blur-xl backdrop-saturate-150 lg:border lg:border-border/60 lg:bg-white/60 lg:shadow-md lg:shadow-black/5 dark:border-border/60 dark:bg-bg-base/70 dark:lg:border-white/12 dark:lg:bg-[#16181f]/60 dark:lg:shadow-black/30"
              : "border-b border-transparent bg-transparent shadow-none lg:border lg:border-transparent lg:bg-transparent lg:shadow-none dark:border-transparent dark:bg-transparent"
          )}
        >
          <Link
            href="/"
            aria-label={t("app.name")}
            className="flex shrink-0 items-center gap-2.5 font-heading text-sm font-semibold tracking-tight text-text min-[360px]:text-base"
          >
            <BrandMark size={36} className="size-9" />
            <span>{t("app.name")}</span>
          </Link>

          <HeaderUtilityControls
            trailing={
              <Button
                type="button"
                size="sm"
                onClick={() => openAuth()}
                className="h-8 shrink-0 gap-2 rounded-full px-3 text-xs font-semibold shadow-xs transition-[box-shadow,background-color,color,transform] duration-200 hover:shadow-primary/20 active:scale-[0.99] cursor-pointer sm:px-4 lg:h-10 lg:px-5"
              >
                <span>{t("landing.signInShort")}</span>
              </Button>
            }
          />
        </div>
      </header>

      {/* ─── Hero & Downloader Command Center ───────────────────────────── */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className={`${heroStyles.intro} mb-5 sm:mb-9`}>
          <HeroPlatforms />
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary backdrop-blur-sm sm:px-3.5 sm:text-xs">
              <Sparkles className="size-3.5 shrink-0" />
              <span>{t("landing.badgeAccount")}</span>
            </div>

            <h1 className="mt-3 font-heading text-3xl font-bold leading-[1.12] text-text sm:mt-3.5 sm:text-4xl lg:text-5xl">
              {t("landing.title")}
            </h1>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:mt-3 sm:text-base">
              {t("landing.subtitle")}
            </p>
          </div>
        </div>

        <div className="ui-panel rounded-3xl p-4 shadow-xl sm:p-6 lg:p-7 border border-border/90 bg-bg-surface/80 backdrop-blur-xl">
          <LandingLinkForm />
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
              className="ui-data-table w-full text-left text-[13px] leading-relaxed"
            >
              <thead>
                <tr className="bg-bg-elevated/40 text-xs font-semibold text-text-muted">
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

          {/* Desktop capability matrix */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-bg-surface/60 backdrop-blur-md md:block">
            <table
              data-testid="platform-table"
              className="ui-data-table min-w-[760px] w-full text-left text-[13px] leading-relaxed"
            >
              <thead>
                <tr className="bg-bg-elevated/40 text-xs font-semibold text-text-muted">
                  <th className="px-5 py-3.5">
                    {t("landing.colPlatform", {}, "Platform")}
                  </th>
                  <th className="px-5 py-3.5 text-center">
                    {t("landing.colVideo", {}, "Video")}
                  </th>
                  <th className="px-5 py-3.5 text-center">
                    {t("landing.colAudio", {}, "Audio")}
                  </th>
                  <th className="px-5 py-3.5 text-center">
                    {t("landing.colGif", {}, "GIF")}
                  </th>
                  <th className="px-5 py-3.5 text-center">
                    {t("landing.colDetails", {}, "Details")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-text">{p.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {renderCapability("available", p.videoSummary)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {renderCapability(p.audioStatus, p.audioSummary)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {renderCapability(p.gifStatus, p.gifSummary)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          data-testid={`platform-details-button-${p.id}`}
                          aria-controls={`platform-details-${p.id}`}
                          aria-expanded={expandedPlatformId === p.id}
                          className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          onClick={() =>
                            setExpandedPlatformId((current) =>
                              current === p.id ? null : p.id
                            )
                          }
                        >
                          {t(
                            expandedPlatformId === p.id
                              ? "landing.hideDetails"
                              : "landing.viewDetails"
                          )}
                          <ChevronDown
                            className={`size-3.5 transition-transform ${
                              expandedPlatformId === p.id ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      </td>
                    </tr>
                    {expandedPlatformId === p.id && (
                      <tr key={`${p.id}-details`}>
                        <td colSpan={5} className="px-5 pb-4 pt-1">
                          {renderPlatformDetails(p)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile capability cards */}
          <div className="grid gap-3 md:hidden">
            {platforms.map((p) => (
              <div
                key={p.name}
                data-testid={`platform-card-${p.id}`}
                className="rounded-2xl border border-border bg-bg-surface/60 p-4 backdrop-blur-md"
              >
                <h3 className="font-semibold text-text">{p.name}</h3>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: t("landing.labelVideo"),
                      status: "available" as const,
                      summary: p.videoSummary,
                    },
                    {
                      label: t("landing.labelAudio"),
                      status: p.audioStatus,
                      summary: p.audioSummary,
                    },
                    {
                      label: "GIF",
                      status: p.gifStatus,
                      summary: p.gifSummary,
                    },
                  ].map((capability) => (
                    <div
                      key={capability.label}
                      className="min-w-0 rounded-xl border border-border/70 bg-bg-base/40 px-2 py-2.5"
                    >
                      <p className="mb-1 text-[10px] font-medium text-text-dim">
                        {capability.label}
                      </p>
                      <span className="text-[11px] leading-snug">
                        {renderCapability(capability.status, capability.summary)}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid={`platform-details-button-${p.id}`}
                  aria-controls={`platform-details-${p.id}`}
                  aria-expanded={expandedPlatformId === p.id}
                  className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  onClick={() =>
                    setExpandedPlatformId((current) => (current === p.id ? null : p.id))
                  }
                >
                  {t(
                    expandedPlatformId === p.id
                      ? "landing.hideDetails"
                      : "landing.viewDetails"
                  )}
                  <ChevronDown
                    className={`size-3.5 transition-transform ${
                      expandedPlatformId === p.id ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {expandedPlatformId === p.id && (
                  <div className="mt-2">{renderPlatformDetails(p)}</div>
                )}
              </div>
            ))}
          </div>
          <section
            data-testid="conversion-codec-details"
            aria-labelledby="conversion-codec-title"
            className="mt-5 rounded-2xl border border-border bg-bg-surface/60 p-4 backdrop-blur-md sm:p-5"
          >
            <div className="max-w-3xl">
              <h3
                id="conversion-codec-title"
                className="font-heading text-base font-bold tracking-tight text-text sm:text-lg"
              >
                {t("landing.codecTitle")}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-text-muted sm:text-sm">
                {t("landing.codecIntro")}
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                {
                  title: t("landing.codecMp4Title"),
                  code: t("landing.codecMp4Code"),
                  description: null,
                  cases: [
                    {
                      label: t("landing.codecMp4ConvertLabel"),
                      description: t("landing.codecMp4ConvertDescription"),
                    },
                    {
                      label: t("landing.codecMp4ExistingLabel"),
                      description: t("landing.codecMp4ExistingDescription"),
                    },
                  ],
                },
                {
                  title: t("landing.codecMp3Title"),
                  code: t("landing.codecMp3Code"),
                  cases: [
                    {
                      label: t("landing.codecMp3ConvertLabel"),
                      description: t("landing.codecMp3ConvertDescription"),
                    },
                    {
                      label: t("landing.codecMp3ExistingLabel"),
                      description: t("landing.codecMp3ExistingDescription"),
                    },
                  ],
                },
                {
                  title: t("landing.codecGifTitle"),
                  code: t("landing.codecGifCode"),
                  cases: [
                    {
                      label: t("landing.codecGifConvertLabel"),
                      description: t("landing.codecGifConvertDescription"),
                    },
                    {
                      label: t("landing.codecGifExistingLabel"),
                      description: t("landing.codecGifExistingDescription"),
                    },
                  ],
                },
              ].map((format) => (
                <article
                  key={format.title}
                  className="min-w-0 rounded-xl border border-border/70 bg-bg-base/40 p-3"
                >
                  <h4 className="text-sm font-semibold text-text">{format.title}</h4>
                  <code className="mt-2 block wrap-break-word rounded-lg bg-bg-elevated/60 px-2.5 py-2 font-sans text-[11px] leading-relaxed text-primary sm:text-xs">
                    {format.code}
                  </code>
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-text-muted marker:text-primary">
                    {format.cases.map((item) => (
                      <li key={item.label}>
                        <span className="font-semibold text-text">{item.label}</span>{" "}
                        {item.description}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            {t("landing.comparisonNote")}
          </p>
        </section>

        {/* File handling assurances */}
        <section
          data-testid="assurances-section"
          aria-labelledby="assurances-title"
          className="mt-10 lg:mt-12"
        >
          <h2
            id="assurances-title"
            className="mb-4 font-heading text-lg font-bold tracking-tight text-text sm:text-xl"
          >
            {t("landing.assurancesTitle")}
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-3">
            {assurances.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                data-testid="assurance-card"
                className="relative flex flex-col gap-3 rounded-2xl border border-border bg-bg-surface/60 p-4 backdrop-blur-md dark:bg-bg-surface/40"
              >
                <div className="grid size-8 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug text-text">
                    {title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter className="mt-auto w-full px-4 py-6" />
    </main>
  );
}

export default function LandingPage() {
  return (
    <LandingAuthProvider>
      <LandingPageContent />
    </LandingAuthProvider>
  );
}
