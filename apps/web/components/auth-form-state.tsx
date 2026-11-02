"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

function useFormState() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const resendInFlightRef = useRef(false);
  const flowVersionRef = useRef(0);
  const activeMode = useRef<string | null>(null);

  // This owner survives presentation redirects, including an in-flight signup
  // or resend. Nothing is serialized into URLs or browser storage.
  const cooldownActive = resendSeconds > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownActive]);

  const reset = useCallback(() => {
    flowVersionRef.current += 1;
    activeMode.current = null;
    setEmail("");
    setPassword("");
    setConfirm("");
    setName("");
    setTouched({ email: false, password: false });
    setSubmitted(false);
    setBusy(false);
    setError("");
    setMessage("");
    setConfirmationEmail("");
    setResendSeconds(0);
    setPasswordUpdated(false);
    resendInFlightRef.current = false;
  }, []);

  const activateMode = useCallback(
    (mode: string) => {
      if (activeMode.current !== null && activeMode.current !== mode) reset();
      activeMode.current = mode;
    },
    [reset]
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    name,
    setName,
    touched,
    setTouched,
    submitted,
    setSubmitted,
    busy,
    setBusy,
    error,
    setError,
    message,
    setMessage,
    confirmationEmail,
    setConfirmationEmail,
    resendSeconds,
    setResendSeconds,
    passwordUpdated,
    setPasswordUpdated,
    resendInFlightRef,
    flowVersionRef,
    activateMode,
    reset,
  };
}

const AuthFormStateContext = createContext<ReturnType<typeof useFormState> | null>(
  null
);

export function AuthFormStateProvider({ children }: { children: ReactNode }) {
  const state = useFormState();
  const pathname = usePathname();
  const { reset } = state;
  useEffect(() => {
    if (pathname !== "/" && !pathname.startsWith("/auth/")) reset();
  }, [pathname, reset]);
  return (
    <AuthFormStateContext.Provider value={state}>
      {children}
    </AuthFormStateContext.Provider>
  );
}

export function useAuthFormState() {
  const state = useContext(AuthFormStateContext);
  if (!state) throw new Error("Authentication requires AuthFormStateProvider");
  return state;
}
