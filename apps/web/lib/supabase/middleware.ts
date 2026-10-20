import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = supabaseResponse.cookies.getAll();
          supabaseResponse = NextResponse.next({
            request,
          });
          previousCookies.forEach((cookie) => supabaseResponse.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session and fetch current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const redirectWithCookies = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };
  const isProtectedRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/history") ||
    path.startsWith("/downloads") ||
    path.startsWith("/settings");

  // If trying to access a protected route and not logged in, redirect to landing page
  if (isProtectedRoute && !user) {
    return redirectWithCookies("/");
  }

  // Keep callback failures visible even when an earlier session remains active.
  const isAuthEntry = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
  ].includes(path);
  const hasCallbackError = request.nextUrl.searchParams.get("error") === "callback";
  if (isAuthEntry && user && !hasCallbackError) {
    return redirectWithCookies("/dashboard");
  }

  return supabaseResponse;
}
