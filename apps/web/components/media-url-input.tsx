"use client";

import { useState } from "react";
import { ClipboardPaste, Info, Search, X } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { useT } from "@/lib/i18n/context";
import styles from "./media-analyzer.module.css";

export function MediaUrlInput({
  value,
  onChange,
  onPaste,
  onSubmit,
  onClear,
  analyzing = false,
  submitLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onPaste: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  analyzing?: boolean;
  submitLabel?: string;
}) {
  const { t } = useT();
  const [pasteFeedback, setPasteFeedback] = useState(0);

  function acceptPaste(text: string) {
    if (!text.trim()) return;
    setPasteFeedback((count) => count + 1);
    onPaste(text.trim());
  }

  return (
    <div className={submitLabel ? undefined : "mb-5"}>
      <p className="ui-kicker mb-3">{t("download.placeholderLabel")}</p>
      <div className="group relative flex min-h-16 gap-2 overflow-hidden rounded-2xl border border-border bg-bg-surface/60 p-2 transition-all duration-200 focus-within:border-primary/60 focus-within:bg-bg-elevated focus-within:ring-3 focus-within:ring-primary/15">
        {pasteFeedback > 0 && (
          <span
            key={pasteFeedback}
            aria-hidden="true"
            data-testid="link-paste-feedback"
            className={styles.pasteFeedback}
          />
        )}
        {analyzing && (
          <BorderBeam size={200} duration={4} colorFrom="#00c8ff" colorTo="#0070f3" />
        )}
        <span className="grid size-11 shrink-0 place-items-center self-center rounded-lg bg-primary/12 text-primary">
          <Search className="size-5" />
        </span>
        <input
          id="media-analyzer-url-input"
          type="url"
          value={value}
          suppressHydrationWarning
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            acceptPaste(event.clipboardData.getData("text"));
          }}
          placeholder="https://..."
          className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-text placeholder:font-normal placeholder:text-text-dim outline-none sm:text-lg"
          aria-label={t("download.placeholder")}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setPasteFeedback(0);
              onClear();
            }}
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-xs text-text-muted transition-colors hover:text-text cursor-pointer"
            aria-label={t("download.clear")}
          >
            <X className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              try {
                acceptPaste(await navigator.clipboard.readText());
              } catch {
                console.warn("Clipboard access denied or unavailable");
              }
            }}
            title={t("download.pasteTitle")}
            className="flex h-9 self-center items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 text-xs font-semibold text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/20 active:scale-95 cursor-pointer"
          >
            <ClipboardPaste className="size-3.5 shrink-0" />
            <span>{t("download.paste")}</span>
          </button>
        )}
        {value && submitLabel && (
          <button
            type="button"
            data-testid="url-submit"
            onClick={onSubmit}
            className="h-11 shrink-0 self-center cursor-pointer rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {submitLabel}
          </button>
        )}
      </div>
      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-border/70 bg-bg-surface/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p>
          {(() => {
            const note = t("download.policyNote");
            const colonIndex = note.indexOf(":");
            if (colonIndex === -1) return note;
            return (
              <>
                <strong className="font-semibold text-text">
                  {note.slice(0, colonIndex + 1)}
                </strong>
                <span>{note.slice(colonIndex + 1)}</span>
              </>
            );
          })()}
        </p>
      </div>
    </div>
  );
}
