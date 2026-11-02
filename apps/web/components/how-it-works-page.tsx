"use client";

import {
  ArrowDownToLine,
  ChevronDown,
  Clock,
  CircleHelp,
  Download,
  MessageCircle,
  RefreshCw,
  ServerCog,
} from "lucide-react";

import { BackButton } from "@/components/back-button";
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
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-bg-base text-text">
      <div
        data-testid="how-it-works-page-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        <header className="mb-7 sm:mb-9">
          <BackButton href="/" className="mb-6">
            {t("how.back")}
          </BackButton>
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
      </div>

      <SiteFooter className="relative z-10 mt-auto mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8" />
    </main>
  );
}
