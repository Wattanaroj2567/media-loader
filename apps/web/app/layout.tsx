import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { cookies, headers } from "next/headers";
import { detectLocaleFromAcceptLanguage, isLocale } from "@/lib/i18n/config";
import { BrowserSafetyGuard } from "@/components/browser-safety-guard";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Media Loader",
    template: "%s · Media Loader",
  },
  description:
    "Private, rights-aware media loading for personal use. Sign in to queue downloads, track progress, and manage your media history.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const localeCookie = cookieStore.get("media-loader-locale")?.value;
  const initialLocale = isLocale(localeCookie)
    ? localeCookie
    : detectLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={ibmPlexSansThai.variable} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={initialLocale}>
            <ToastProvider>
              <BrowserSafetyGuard />
              {children}
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
