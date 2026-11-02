"use client";

import { BackButton } from "@/components/back-button";
import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";
import { CONTACT_EMAIL, type ContactTopic } from "@/lib/contact-mailto";
import { useT } from "@/lib/i18n/context";

export function ContactPage({ initialTopic }: { initialTopic: ContactTopic }) {
  const { locale, t } = useT();
  const isThai = locale === "th";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-bg-base text-text">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-4 sm:mb-6">
          <BackButton href="/" className="mb-3 sm:mb-4">
            {t("contact.back")}
          </BackButton>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            {t("contact.eyebrow")}
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {t("contact.title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
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
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {t("contact.directEmail")}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>

      <SiteFooter className="relative z-10 mt-auto mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8" />
    </main>
  );
}
