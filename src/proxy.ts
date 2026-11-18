import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { AUTH_COOKIE_OPTIONS, authEnabled, hasAuthCookie, isAuthArea, supabaseEnv } from "./lib/supabase/config";

// Next 16 renamed middleware.ts to proxy.ts; this is the project's one request hook.
const intl = createMiddleware(routing);

/**
 * 1. Refresh the Supabase session (only when an auth cookie exists, so guests cost
 *    nothing). Refreshed cookies are written onto the request, so the page renders
 *    with the new token, and onto the response, so the browser stores it.
 * 2. Hand off to next-intl for locale routing (it forwards the request headers).
 *
 * While auth is off (authEnabled() false: no AUTH_ENABLED, no Supabase env, or seed
 * mode) there is no session work at all, and members/admin routes are rewritten to
 * the calm "coming soon" page in the visitor's language (the URL stays the same).
 *
 * This is not a security boundary: pages check membership on the server and RLS
 * enforces it in the database.
 */
export default async function proxy(request: NextRequest) {
  if (!authEnabled()) {
    const soon = comingSoon(request);
    if (soon) return soon;
    return intl(request);
  }

  const env = supabaseEnv();
  const pending: { name: string; value: string; options: object }[] = [];

  if (env && hasAuthCookie(request.cookies.getAll().map((c) => c.name))) {
    const supabase = createServerClient(env.url, env.key, {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            pending.push({ name, value, options });
          });
        },
      },
    });
    // Verifies the JWT and refreshes it when it's about to expire.
    await supabase.auth.getClaims();
  }

  const response = intl(request);
  for (const { name, value, options } of pending) response.cookies.set(name, value, options);
  // A refreshed session must never be cached by a CDN.
  if (pending.length) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

const NON_DEFAULT_LOCALE_PREFIX = new RegExp(`^/(${routing.locales.filter((l) => l !== routing.defaultLocale).join("|")})(?=/|$)`);

/** Rewrites a members/admin path ("/admin/…", "/en/profile") to /<locale>/coming-soon. */
function comingSoon(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const m = NON_DEFAULT_LOCALE_PREFIX.exec(pathname);
  // "/he/…" first goes through next-intl's redirect to the unprefixed URL.
  if (/^\/he(?=\/|$)/.test(pathname)) return null;
  const locale = m ? m[1] : routing.defaultLocale;
  const rest = m ? pathname.slice(m[0].length) || "/" : pathname;
  if (!isAuthArea(rest)) return null;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/coming-soon`;
  url.search = "";
  const res = NextResponse.rewrite(url);
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}

export const config = {
  // Everything except API routes, Next internals, Vercel internals and files with a dot.
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
