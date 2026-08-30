import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { cookies } from "next/headers";
import { Locale } from "@/lib/i18n/config";
import { BrowserSafetyGuard } from "@/components/browser-safety-guard";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  weight: ["400", "500", "600", "700"],
  subsets: ["thai"],
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("media-loader-locale")?.value || "th";
  const initialLocale = (["en", "th"].includes(localeCookie) ? localeCookie : "th") as Locale;

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body
        className={kanit.variable}
        suppressHydrationWarning
      >
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
