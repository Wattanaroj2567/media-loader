'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, defaultLocale } from './config';
import thMessages from './messages/th.json';
import enMessages from './messages/en.json';

type Messages = Record<string, string>;

const staticMessages: Record<Locale, Messages> = {
  th: thMessages as Messages,
  en: enMessages as Messages,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string;
  loaded: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key) => key,
  loaded: false,
});

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(() => staticMessages[initialLocale] || staticMessages[defaultLocale]);
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    document.documentElement.lang = locale;
    setMessages(staticMessages[locale] || staticMessages[defaultLocale]);
    setLoaded(true);
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
      const msg = messages[key];
      if (msg === undefined) return fallback ?? key;
      if (vars) {
        let result = msg;
        for (const [k, v] of Object.entries(vars)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return msg;
    },
    [messages],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, loaded }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useT = () => useContext(I18nContext);
