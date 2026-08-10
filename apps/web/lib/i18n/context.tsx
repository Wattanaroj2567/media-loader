"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Locale, defaultLocale } from "./config";
import thMessages from "./messages/th.json";
import enMessages from "./messages/en.json";

type Messages = Record<string, string>;

const staticMessages: Record<Locale, Messages> = {
  th: thMessages as Messages,
  en: enMessages as Messages,
};

function translate(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
) {
  const message = messages[key];
  if (message === undefined) return fallback ?? key;
  if (!vars) return message;

  let result = message;
  for (const [name, value] of Object.entries(vars)) {
    result = result.replace(`{${name}}`, String(value));
  }
  return result;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string;
  loaded: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key, vars, fallback) => translate(staticMessages[defaultLocale], key, vars, fallback),
  loaded: true,
});

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('media-loader-locale', l);
    // Write cookie so the server knows the locale on next page loads / refreshes
    document.cookie = `media-loader-locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string): string => {
      return translate(staticMessages[locale] || staticMessages[defaultLocale], key, vars, fallback);
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, loaded: true }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useT = () => useContext(I18nContext);
