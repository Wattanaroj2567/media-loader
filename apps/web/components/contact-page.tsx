"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";
import { CONTACT_EMAIL, type ContactTopic } from "@/lib/contact-mailto";
import { useT } from "@/lib/i18n/context";

export function ContactPage({ initialTopic }: { initialTopic: ContactTopic }) {
  const { locale, t } = useT();
  const isThai = locale === "th";

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-7 sm:mb-9">
        <Link
          href="/"
          className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-medium text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
        >
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
          {t("contact.back")}
        </Link>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {t("contact.eyebrow")}
        </p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text sm:text-4xl">
          {t("contact.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
          {t("contact.intro")}
        </p>
      </header>

      <div className="w-full max-w-3xl">
        <ContactForm
          key={initialTopic}
          initialTopic={initialTopic}
          recipient={CONTACT_EMAIL}
          isThai={isThai}
        />
        <p className="mt-4 text-sm leading-7 text-text-muted">
          {t("contact.directEmail")}{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>

      <SiteFooter className="mt-auto w-full px-0 py-8 sm:py-10" />
    </main>
  );
}
