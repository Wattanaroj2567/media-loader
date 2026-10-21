"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CircleAlert, Eye, EyeOff, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/site-footer";
import { BrandMark } from "@/components/brand-mark";
import { HeaderUtilityControls } from "@/components/header-utility-controls";
import { peekRequestedMediaAnalysis } from "@/lib/analyzer-session";
import { useT } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import fieldStyles from "./form-field.module.css";
import styles from "./auth-form.module.css";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

function PasswordInput({
  showLabel,
  hideLabel,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "className"> & {
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  const hasValue = String(props.value ?? "").length > 0;

  return (
    <div className={styles.passwordField}>
      <Input
        placeholder="••••••••"
        {...props}
        type={visible && hasValue ? "text" : "password"}
        onChange={(event) => {
          if (!hasValue || !event.currentTarget.value) setVisible(false);
          props.onChange?.(event);
        }}
        className={`${fieldStyles.field} ${styles.passwordInput}`}
        data-auth-field="true"
      />
      <button
        type="button"
        className={styles.visibilityToggle}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={props.disabled || !hasValue}
        onClick={() => setVisible((previous) => !previous)}
      >
        {visible ? (
          <EyeOff size={16} aria-hidden="true" />
        ) : (
          <Eye size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function AuthForm({
  mode,
  onSuccess,
  presentation = "page",
  onModeChange,
}: {
  mode: AuthMode;
  onSuccess?: (message?: string) => void;
  presentation?: "page" | "modal";
  onModeChange?: (mode: AuthMode) => void;
}) {
  const { locale, t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const resendInFlight = useRef(false);
  const [hasPendingLink, setHasPendingLink] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const reset = mode === "reset-password";
  const registration = mode === "register";
  const settingPassword = registration || reset;
  const hasConfirmation = confirm.length > 0;
  const passwordsMatch = password === confirm;
  const meetsPasswordLength = Array.from(password).length >= 8;
  const meetsPasswordMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const meetsPasswordNumber = /[0-9]/.test(password);
  const meetsPasswordSymbol = /[^a-zA-Z0-9]/.test(password);
  const forgot = mode === "forgot-password";
  const hasPassword = !forgot;
  const hasUnsupportedEmailCharacters = /[^\u0020-\u007e]/u.test(email.trim());
  const emailIssue = reset
    ? ""
    : !email.trim()
      ? "auth.emailRequired"
      : hasUnsupportedEmailCharacters
        ? "auth.emailLatinOnly"
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
          ? "auth.invalidEmail"
          : "";
  const passwordIssue =
    !hasPassword || passwordUpdated
      ? ""
      : !password
        ? reset
          ? "auth.passwordRequired"
          : "auth.enterPassword"
        : settingPassword && !meetsPasswordLength
          ? "auth.passwordLength"
          : "";
  const confirmIssue =
    !settingPassword || passwordUpdated
      ? ""
      : !confirm
        ? "auth.confirmRequired"
        : !passwordsMatch
          ? "auth.passwordMismatch"
          : "";
  const emailError =
    (submitted ||
      (touched.email && Boolean(email.trim())) ||
      hasUnsupportedEmailCharacters) &&
    emailIssue;
  const passwordError =
    (submitted || (touched.password && Boolean(password))) && passwordIssue;
  const confirmationError = (submitted || hasConfirmation) && confirmIssue;
  const isFormComplete =
    mode === "login"
      ? Boolean(email.trim() && password)
      : registration
        ? Boolean(email.trim() && meetsPasswordLength && confirm && passwordsMatch)
        : reset
          ? Boolean(meetsPasswordLength && confirm && passwordsMatch)
          : Boolean(email.trim());
  const embedded = presentation === "modal";
  const Container = embedded ? "div" : "main";
  const formPanel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (embedded) formPanel.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [embedded]);

  const resendCooldownActive = resendSeconds > 0;
  useEffect(() => {
    if (!resendCooldownActive) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownActive]);

  async function handleResendConfirmation() {
    if (busy || resendInFlight.current || !confirmationEmail || resendSeconds > 0)
      return;
    resendInFlight.current = true;
    setBusy(true);
    setError("");
    setResendSeconds(60);
    try {
      const { error: resendError } = await createClient().auth.resend({
        type: "signup",
        email: confirmationEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (resendError) setError(safeError(resendError));
      else success("auth.resendSent");
    } catch {
      setError(t("auth.genericError"));
    } finally {
      resendInFlight.current = false;
      setBusy(false);
    }
  }

  function switchMode(event: MouseEvent<HTMLAnchorElement>, nextMode: AuthMode) {
    if (!onModeChange) return;
    event.preventDefault();
    if (!busy) onModeChange(nextMode);
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    setHasPendingLink(Boolean(peekRequestedMediaAnalysis()));
    if (params.has("error"))
      setError(t(reset ? "auth.recoveryExpired" : "auth.googleError"));
    if (mode === "login" && params.get("reset") === "success")
      setMessage(t("auth.resetSuccess"));
    if (reset) {
      createClient()
        .auth.getUser()
        .then(({ data, error: sessionError }) => {
          if (!active) return;
          if (sessionError || !data.user) setError(t("auth.recoveryExpired"));
          else setRecoveryReady(true);
        })
        .catch(() => {
          if (active) setError(t("auth.recoveryExpired"));
        });
    }
    return () => {
      active = false;
    };
  }, [mode, reset, t]);

  function safeError(cause: { code?: string; status?: number } | null) {
    if (
      cause?.status === 429 ||
      cause?.code === "over_request_rate_limit" ||
      cause?.code === "over_email_send_rate_limit"
    )
      return t("auth.rateLimited");
    if (cause?.code === "email_not_confirmed") return t("auth.emailUnconfirmed");
    if (cause?.code === "invalid_credentials") return t("auth.invalidCredentials");
    if (cause?.code === "weak_password") return t("auth.passwordWeak");
    if (
      reset &&
      (cause?.status === 401 ||
        cause?.code === "session_not_found" ||
        cause?.code === "refresh_token_not_found")
    )
      return t("auth.recoveryExpired");
    return t("auth.genericError");
  }

  function success(key: string) {
    const text = t(key);
    setMessage(text);
    onSuccess?.(text);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmationEmail) return;
    setError("");
    setMessage("");
    setSubmitted(true);
    const invalidField = emailIssue
      ? "auth-email"
      : passwordIssue
        ? "auth-password"
        : confirmIssue
          ? "auth-confirm"
          : null;
    if (invalidField) {
      const input = event.currentTarget.elements.namedItem(invalidField);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    if (reset && !recoveryReady) return setError(t("auth.recoveryExpired"));
    setBusy(true);
    try {
      const supabase = createClient();
      const callback = `${window.location.origin}/auth/callback`;
      if (forgot) {
        try {
          await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${callback}?next=/auth/reset-password`,
          });
        } catch {
          // Recovery responses stay neutral when the provider is unavailable.
        }
        success("auth.recoverySent");
      } else if (reset) {
        if (!passwordUpdated) {
          const { data, error: sessionError } = await supabase.auth.getUser();
          if (sessionError || !data.user) {
            setRecoveryReady(false);
            setError(t("auth.recoveryExpired"));
            return;
          }
          const { error: updateError } = await supabase.auth.updateUser({ password });
          if (updateError) {
            setError(safeError(updateError));
            return;
          }
          setPasswordUpdated(true);
          setPassword("");
          setConfirm("");
        }
        const { error: signoutError } = await supabase.auth.signOut();
        if (signoutError) {
          setError(t("auth.signoutRetry"));
          return;
        }
        onSuccess?.(t("auth.resetSuccess"));
        window.location.replace("/auth/login?reset=success");
      } else {
        const result = registration
          ? await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: callback,
                data: { full_name: name.trim(), language: locale },
              },
            })
          : await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) setError(safeError(result.error));
        else if (result.data.session) {
          if (!registration) {
            try {
              await supabase.auth.updateUser({ data: { language: locale } });
            } catch {
              // Keep sign-in successful if the preference sync fails.
            }
          }
          onSuccess?.(t("auth.signedIn"));
          router.replace("/dashboard");
          router.refresh();
        } else if (registration) {
          setConfirmationEmail(email.trim());
          setResendSeconds(60);
          setPassword("");
          setConfirm("");
          success("auth.confirmEmail");
        } else setError(t("auth.genericError"));
      }
    } catch {
      setError(t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) setError(t("auth.googleError"));
    } catch {
      setError(t("auth.googleError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className={embedded ? styles.embedded : styles.page}>
      {!embedded && (
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Media Loader">
            <BrandMark className="size-8" />
            <span>Media Loader</span>
          </Link>
          <HeaderUtilityControls />
        </header>
      )}
      <div className={embedded ? styles.modalLayout : styles.layout}>
        <section
          ref={formPanel}
          className={embedded ? styles.modalPanel : styles.formPanel}
          aria-labelledby="auth-title"
        >
          <div className={styles.formInner}>
            <h1 id="auth-title" className={styles.title}>
              {t(confirmationEmail ? "auth.confirmTitle" : `auth.${mode}.title`)}
            </h1>
            <p className={styles.description}>
              {t(
                confirmationEmail
                  ? "auth.confirmDescription"
                  : `auth.${mode}.description`
              )}
            </p>
            {hasPendingLink && !reset && !forgot && (
              <p role="status" className={styles.pendingLink}>
                <Link2 size={16} aria-hidden="true" />
                {t("auth.pendingLink")}
              </p>
            )}
            {!confirmationEmail && (mode === "login" || registration) && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.googleButton}
                  onClick={google}
                  disabled={busy}
                >
                  <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.6A10 10 0 0 0 12 22Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.93v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.53l3.34-2.6Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.95c1.47 0 2.79.51 3.83 1.51l2.88-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.6C7.2 7.71 9.4 5.95 12 5.95Z"
                    />
                  </svg>
                  {t(registration ? "auth.googleRegister" : "auth.google")}
                </Button>
                <div className={styles.divider}>
                  <span>
                    {t(registration ? "auth.registerDivider" : "auth.emailDivider")}
                  </span>
                </div>
              </>
            )}
            <form onSubmit={submit} noValidate className={styles.form} aria-busy={busy}>
              {!confirmationEmail && (
                <>
                  {registration && (
                    <div className="space-y-2">
                      <Label htmlFor="auth-name">{t("auth.displayName")}</Label>
                      <Input
                        id="auth-name"
                        className={fieldStyles.field}
                        data-auth-field="true"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        disabled={busy}
                      />
                    </div>
                  )}
                  {!reset && (
                    <div className="space-y-2">
                      <Label htmlFor="auth-email">{t("auth.email")}</Label>
                      <Input
                        id="auth-email"
                        name="auth-email"
                        aria-invalid={Boolean(emailError)}
                        aria-describedby={emailError ? "auth-email-error" : undefined}
                        onBlur={() =>
                          setTouched((previous) => ({ ...previous, email: true }))
                        }
                        className={fieldStyles.field}
                        data-auth-field="true"
                        placeholder="you@example.com"
                        type="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setError("");
                        }}
                        disabled={busy}
                      />
                      <p
                        id="auth-email-error"
                        aria-live="polite"
                        className="min-h-4 text-xs text-destructive"
                      >
                        {emailError ? t(emailError) : ""}
                      </p>
                    </div>
                  )}
                  {hasPassword && (
                    <div className="space-y-2">
                      <Label htmlFor="auth-password">
                        {t(reset ? "auth.newPassword" : "auth.password")}
                      </Label>
                      <PasswordInput
                        id="auth-password"
                        name="auth-password"
                        aria-invalid={Boolean(passwordError)}
                        onBlur={() =>
                          setTouched((previous) => ({ ...previous, password: true }))
                        }
                        showLabel={t("auth.showPassword")}
                        hideLabel={t("auth.hidePassword")}
                        autoComplete={
                          registration || reset ? "new-password" : "current-password"
                        }
                        required
                        minLength={settingPassword ? 8 : undefined}
                        aria-describedby={
                          [
                            settingPassword ? "auth-password-rules" : "",
                            passwordError ? "auth-password-error" : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError("");
                        }}
                        disabled={busy || passwordUpdated || (reset && !recoveryReady)}
                      />
                      {!settingPassword && (
                        <p
                          id="auth-password-error"
                          aria-live="polite"
                          className="min-h-4 text-xs text-destructive"
                        >
                          {passwordError ? t(passwordError) : ""}
                        </p>
                      )}
                      {settingPassword && (
                        <ul
                          id="auth-password-rules"
                          className={styles.passwordChecklist}
                          aria-label={t("auth.ruleLength")}
                        >
                          <li
                            className={`${styles.checklistItem} ${
                              passwordError
                                ? styles.itemError
                                : meetsPasswordLength
                                  ? styles.itemValid
                                  : styles.itemDefault
                            }`}
                          >
                            <span
                              className={styles.checkIconWrapper}
                              aria-hidden="true"
                            >
                              {meetsPasswordLength ? (
                                <Check
                                  className={styles.checkIconValid}
                                  strokeWidth={2.5}
                                />
                              ) : passwordError ? (
                                <CircleAlert className={styles.checkIconError} />
                              ) : (
                                <span className={styles.checkIconPending} />
                              )}
                            </span>
                            <span
                              id="auth-password-error"
                              aria-live="polite"
                              className={styles.checklistLabel}
                            >
                              {passwordError ? t(passwordError) : t("auth.ruleLength")}
                            </span>
                            <span
                              className={
                                passwordError
                                  ? styles.ruleBadgeRequiredError
                                  : styles.ruleBadgeRequired
                              }
                            >
                              {t("auth.requiredLabel")}
                            </span>
                          </li>
                          <li
                            className={`${styles.checklistItem} ${
                              meetsPasswordMixedCase
                                ? styles.itemValid
                                : styles.itemDefault
                            }`}
                          >
                            <span
                              className={styles.checkIconWrapper}
                              aria-hidden="true"
                            >
                              {meetsPasswordMixedCase ? (
                                <Check
                                  className={styles.checkIconValid}
                                  strokeWidth={2.5}
                                />
                              ) : (
                                <span className={styles.checkIconPending} />
                              )}
                            </span>
                            <span className={styles.checklistLabel}>
                              {t("auth.ruleMixedCase")}
                            </span>
                            <span className={styles.ruleBadgeRecommended}>
                              {t("auth.recommendedLabel")}
                            </span>
                          </li>
                          <li
                            className={`${styles.checklistItem} ${
                              meetsPasswordNumber
                                ? styles.itemValid
                                : styles.itemDefault
                            }`}
                          >
                            <span
                              className={styles.checkIconWrapper}
                              aria-hidden="true"
                            >
                              {meetsPasswordNumber ? (
                                <Check
                                  className={styles.checkIconValid}
                                  strokeWidth={2.5}
                                />
                              ) : (
                                <span className={styles.checkIconPending} />
                              )}
                            </span>
                            <span className={styles.checklistLabel}>
                              {t("auth.ruleNumber")}
                            </span>
                            <span className={styles.ruleBadgeRecommended}>
                              {t("auth.recommendedLabel")}
                            </span>
                          </li>
                          <li
                            className={`${styles.checklistItem} ${
                              meetsPasswordSymbol
                                ? styles.itemValid
                                : styles.itemDefault
                            }`}
                          >
                            <span
                              className={styles.checkIconWrapper}
                              aria-hidden="true"
                            >
                              {meetsPasswordSymbol ? (
                                <Check
                                  className={styles.checkIconValid}
                                  strokeWidth={2.5}
                                />
                              ) : (
                                <span className={styles.checkIconPending} />
                              )}
                            </span>
                            <span className={styles.checklistLabel}>
                              {t("auth.ruleSymbol")}
                            </span>
                            <span className={styles.ruleBadgeRecommended}>
                              {t("auth.recommendedLabel")}
                            </span>
                          </li>
                        </ul>
                      )}
                      {mode === "login" && (
                        <div className={styles.passwordMeta}>
                          <Link
                            href="/auth/forgot-password"
                            onClick={(event) => switchMode(event, "forgot-password")}
                          >
                            {t("auth.forgotLink")}
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                  {(registration || reset) && (
                    <div className="space-y-2">
                      <Label htmlFor="auth-confirm">{t("auth.confirmPassword")}</Label>
                      <PasswordInput
                        id="auth-confirm"
                        name="auth-confirm"
                        showLabel={t("auth.showConfirmPassword")}
                        hideLabel={t("auth.hideConfirmPassword")}
                        autoComplete="new-password"
                        required
                        aria-invalid={Boolean(confirmationError)}
                        aria-describedby={
                          hasConfirmation || confirmationError
                            ? "auth-confirm-status"
                            : undefined
                        }
                        value={confirm}
                        onChange={(event) => {
                          setConfirm(event.target.value);
                          setError("");
                        }}
                        disabled={busy || passwordUpdated || (reset && !recoveryReady)}
                      />
                      <p
                        id="auth-confirm-status"
                        aria-live="polite"
                        aria-atomic="true"
                        className={`flex min-h-4 items-center gap-1.5 text-xs ${hasConfirmation && passwordsMatch ? "text-green-700 dark:text-green-400" : "text-destructive"}`}
                      >
                        {confirmationError && !hasConfirmation
                          ? t(confirmationError)
                          : hasConfirmation && (
                              <>
                                {passwordsMatch ? (
                                  <Check size={14} aria-hidden="true" />
                                ) : (
                                  <CircleAlert size={14} aria-hidden="true" />
                                )}
                                {t(
                                  passwordsMatch
                                    ? "auth.passwordMatch"
                                    : "auth.passwordMismatch"
                                )}
                              </>
                            )}
                      </p>
                    </div>
                  )}
                </>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              {message && (
                <p
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-300"
                >
                  <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{message}</span>
                </p>
              )}
              {confirmationEmail ? (
                <div className="space-y-3">
                  <p className="wrap-break-word text-sm text-text-muted">
                    {t("auth.confirmAddress", { email: confirmationEmail })}
                  </p>
                  <Button
                    type="button"
                    className={styles.submit}
                    disabled={busy || resendSeconds > 0}
                    onClick={handleResendConfirmation}
                  >
                    {busy
                      ? t("common.loading")
                      : resendSeconds > 0
                        ? t("auth.resendWait", { seconds: resendSeconds })
                        : t("auth.resend")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full text-primary"
                    disabled={busy}
                    onClick={() => {
                      setConfirmationEmail("");
                      setMessage("");
                      setError("");
                      setSubmitted(false);
                      setTouched({ email: false, password: false });
                      window.requestAnimationFrame(() =>
                        formPanel.current
                          ?.querySelector<HTMLInputElement>("#auth-email")
                          ?.focus()
                      );
                    }}
                  >
                    {t("auth.changeEmail")}
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  className={styles.submit}
                  data-ready={isFormComplete}
                  disabled={busy || (reset && !recoveryReady)}
                >
                  {busy
                    ? t("common.loading")
                    : passwordUpdated
                      ? t("auth.finishSignout")
                      : t(`auth.${mode}.submit`)}
                </Button>
              )}
            </form>
            <nav aria-label={t("auth.links")} className={styles.accountLinks}>
              {mode !== "login" && (
                <Link
                  className="inline-flex min-h-11 items-center gap-2 text-primary underline-offset-4 hover:underline"
                  href="/auth/login"
                  onClick={(event) => switchMode(event, "login")}
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  {t("auth.backToLogin")}
                </Link>
              )}
              {mode === "login" && (
                <>
                  <span>{t("auth.newHere")}</span>
                  <Link
                    className="text-primary underline-offset-4 hover:underline"
                    href="/auth/register"
                    onClick={(event) => switchMode(event, "register")}
                  >
                    {t("auth.register.title")}
                  </Link>
                </>
              )}
            </nav>
            {(mode === "login" || registration) && (
              <p className={styles.legalConsent}>
                <span>{t("auth.legalConsent.prefix")}</span>
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  {t("auth.legalConsent.terms")}
                </Link>
                <span>{t("auth.legalConsent.and")}</span>
                <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                  {t("auth.legalConsent.privacy")}
                </Link>
                <span>{t("auth.legalConsent.suffix")}</span>
              </p>
            )}
            {!embedded && (
              <Link className={styles.guestLink} href="/">
                <ArrowLeft size={15} aria-hidden="true" />
                {t("auth.guest")}
              </Link>
            )}
          </div>
        </section>
        {!embedded && (
          <aside className={styles.showcase} aria-label={t("auth.storyLabel")}>
            <div className={styles.showcaseTop}>
              <span>{t("auth.storyEyebrow")}</span>
              <span className={styles.formatLabel}>MP4 / MP3 / GIF</span>
            </div>
            <div className={styles.artwork} aria-hidden="true">
              <div className={styles.artworkGlow} />
              <svg className={styles.ribbons} viewBox="0 0 600 350" fill="none">
                <defs>
                  <linearGradient
                    id="auth-ribbon"
                    x1="20"
                    y1="0"
                    x2="580"
                    y2="350"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#217baf" stopOpacity="0" />
                    <stop offset=".35" stopColor="#65d7fa" />
                    <stop offset=".65" stopColor="#b7edff" />
                    <stop offset="1" stopColor="#227cae" stopOpacity=".1" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 24 }, (_, index) => (
                  <path
                    key={index}
                    d={`M -60 ${65 + index * 7} C 110 ${-45 + index * 4}, 155 ${370 - index * 5}, 315 ${235 - index * 4} S 460 ${-50 + index * 6}, 660 ${85 + index * 8}`}
                    stroke="url(#auth-ribbon)"
                    strokeWidth="1.3"
                  />
                ))}
              </svg>
              <div className={styles.mediaGlyph}>
                <BrandMark className="size-14" />
              </div>
              <span className={styles.artworkCaption}>{t("auth.artworkReady")}</span>
            </div>
            <div className={styles.storyCopy}>
              <h2>
                {t("auth.storyTitle")}
                <br />
                <span>{t("auth.storyAccent")}</span>
              </h2>
              <p>{t("auth.storyDescription")}</p>
            </div>
            <div className={styles.storyFooter}>
              <span>
                <i />
                {t("auth.workspaceNote")}
              </span>
              <span>MEDIA LOADER</span>
            </div>
          </aside>
        )}
      </div>
      {!embedded && <SiteFooter className={styles.footer} />}
    </Container>
  );
}
