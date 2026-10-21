"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  ChevronDown,
  Clock,
  CircleHelp,
  Download,
  MessageCircle,
  RefreshCw,
  ServerCog,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { useT } from "@/lib/i18n/context";

export function HowItWorksPage() {
  const { t } = useT();
  const steps = [
    { number: 1, Icon: Download },
    { number: 2, Icon: RefreshCw },
    { number: 3, Icon: ArrowDownToLine },
  ];
  const questions = [
    {
      Icon: CircleHelp,
      title: t("how.whyTitle"),
      description: t("how.whyDescription"),
    },
    {
      Icon: ServerCog,
      title: t("how.whyServerTitle"),
      description: t("how.whyServerDescription"),
    },
    {
      Icon: Download,
      title: t("how.transferQuestionTitle"),
      description: t("how.transferQuestionDescription"),
    },
    {
      Icon: Clock,
      title: t("how.closePageQuestionTitle"),
      description: t("how.closePageQuestionDescription"),
    },
    {
      Icon: RefreshCw,
      title: t("how.outputSizeQuestionTitle"),
      description: t("how.outputSizeQuestionDescription"),
    },
    {
      Icon: ArrowDownToLine,
      title: t("how.formatsQuestionTitle"),
      description: t("how.formatsQuestionDescription"),
    },
    {
      Icon: CircleHelp,
      title: t("how.supportedLinksQuestionTitle"),
      description: t("how.supportedLinksQuestionDescription"),
    },
    {
      Icon: ServerCog,
      title: t("how.accountAndRightsQuestionTitle"),
      description: t("how.accountAndRightsQuestionDescription"),
    },
    {
      Icon: Clock,
      title: t("how.retentionQuestionTitle"),
      description: t("how.retentionQuestionDescription"),
    },
  ];

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 sm:mb-10">
        <Link
          href="/"
          className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-medium text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
        >
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
          {t("how.back")}
        </Link>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {t("how.eyebrow")}
        </p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text sm:text-4xl">
          {t("how.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
          {t("how.intro")}
        </p>
      </header>

      <section
        aria-labelledby="how-steps-title"
        data-testid="how-it-works-steps"
        className="space-y-4"
      >
        <h2
          id="how-steps-title"
          className="font-heading text-lg font-bold text-text sm:text-xl"
        >
          {t("how.stepsHeading")}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map(({ number, Icon }) => (
            <article
              key={number}
              className="rounded-2xl border border-border bg-bg-surface/70 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </div>
                <h3 className="pt-1 text-sm font-bold leading-snug text-text sm:text-base">
                  {t(`how.step${number}Title`)}
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-muted sm:text-sm">
                {t(`how.step${number}Description`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="how-questions-title"
        className="mt-8 space-y-3 sm:mt-10"
      >
        <h2
          id="how-questions-title"
          className="mb-4 font-heading text-lg font-bold text-text sm:text-xl"
        >
          {t("how.questionsTitle")}
        </h2>
        {questions.map(({ Icon, title, description }) => (
          <details
            key={title}
            className="group rounded-2xl border border-border bg-bg-surface/60 p-4 sm:p-5"
            data-testid="how-it-works-qa"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="pt-1 text-sm font-bold leading-snug text-text sm:text-base">
                  {title}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-text-dim transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-4 flex items-start gap-3 border-t border-border/70 pt-4">
              <MessageCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-text-dim"
              />
              <p className="text-xs leading-relaxed text-text-muted sm:text-sm">
                {description}
              </p>
            </div>
          </details>
        ))}
      </section>

      <SiteFooter className="mt-auto w-full px-0 py-8 sm:py-10" />
    </main>
  );
}
