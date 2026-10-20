"use client";

import { useEffect, useState } from "react";
import { useLandingAuth } from "@/components/landing-auth-provider";
import { MediaUrlInput } from "@/components/media-url-input";
import { useT } from "@/lib/i18n/context";
import { validateUrl } from "@/lib/url-validation";
import {
  clearRequestedMediaAnalysis,
  peekRequestedMediaAnalysis,
} from "@/lib/analyzer-session";

const DRAFT_KEY = "media_loader_landing_url";

export function LandingLinkForm() {
  const { t } = useT();
  const { openAuth: showAuth } = useLandingAuth();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setUrl(sessionStorage.getItem(DRAFT_KEY) || peekRequestedMediaAnalysis() || "");
    } catch {
      /* The form remains usable when draft storage is unavailable. */
    }
  }, []);

  function updateDraft(value: string) {
    setUrl(value);
    setError("");
    clearRequestedMediaAnalysis();
    try {
      if (value) sessionStorage.setItem(DRAFT_KEY, value);
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* Continue will explain storage failures before opening authentication. */
    }
  }

  function openAuth(candidate = url) {
    const validation = validateUrl(candidate);
    if (!validation.valid) {
      setError(t("landing.invalidLink"));
      return;
    }
    try {
      showAuth(validation.url);
    } catch {
      setError(t("landing.linkStorageError"));
    }
  }

  return (
    <div>
      <MediaUrlInput
        value={url}
        onChange={updateDraft}
        onPaste={(value) => {
          updateDraft(value);
          openAuth(value);
        }}
        onClear={() => updateDraft("")}
        onSubmit={() => openAuth()}
        submitLabel={t("landing.continue")}
      />
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
