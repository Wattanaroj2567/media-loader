"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Locale, defaultLocale } from "./config";

type Messages = Record<string, string>;

const loadMessages: Record<Locale, () => Promise<Messages>> = {
  th: async () => (await import("./messages/th.json")).default as Messages,
  en: async () => (await import("./messages/en.json")).default as Messages,
};

const emptyMessages: Messages = {};

function translate(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string
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
  t: (key, vars, fallback) => translate(emptyMessages, key, vars, fallback),
  loaded: true,
});

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
  initialMessages,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  initialMessages: Messages;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(initialMessages);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    void loadMessages[l]().then(setMessages);
    localStorage.setItem("media-loader-locale", l);
    // Write cookie so the server knows the locale on next page loads / refreshes
    document.cookie = `media-loader-locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = l;

    const syncAccountLanguage = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session || data.session.user.user_metadata.language === l) {
          return;
        }

        await supabase.auth.updateUser({ data: { language: l } });
      } catch {
        // Account preference sync must not block changing the interface language.
      }
    };

    void syncAccountLanguage();
  }, []);

  const t = useCallback(
    (
      key: string,
      vars?: Record<string, string | number>,
      fallback?: string
    ): string => {
      return translate(messages, key, vars, fallback);
    },
    [messages]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, loaded: true }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useT = () => useContext(I18nContext);
