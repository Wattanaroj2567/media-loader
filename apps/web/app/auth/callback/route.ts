import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  let destination = new URL("/dashboard", origin);
  if (next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
    try {
      const candidate = new URL(next, origin);
      if (
        candidate.origin === origin &&
        [
          "/dashboard",
          "/history",
          "/settings",
          "/downloads",
          "/auth/reset-password",
        ].includes(candidate.pathname)
      ) {
        // Only the destination path survives; callback/provider parameters are discarded.
        destination = new URL(candidate.pathname, origin);
      }
    } catch {
      // Malformed destinations use the dashboard fallback.
    }
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const localeCookie = request.headers
          .get("cookie")
          ?.split(";")
          .map((entry) => entry.trim())
          .find((entry) => entry.startsWith("media-loader-locale="));
        const locale = localeCookie?.slice("media-loader-locale=".length);

        try {
          await supabase.auth.updateUser({
            data: { language: locale === "en" ? "en" : "th" },
          });
        } catch {
          // Keep the callback successful if the preference sync fails.
        }

        return NextResponse.redirect(destination);
      }
    } catch {
      // Provider errors must never reach the URL, response, or application logs.
    }
  }

  const failure = new URL(
    destination.pathname === "/auth/reset-password"
      ? "/auth/reset-password"
      : "/auth/login",
    origin
  );
  failure.searchParams.set("error", "callback");
  return NextResponse.redirect(failure);
}
