import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";

const PREFIXED = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

/**
 * Two jobs.
 *
 * 1. Admin area: no session cookie, no entry. The cookie is verified against the database in every admin page
 *    and action (see requireAdmin), so a forged cookie never gets past this point.
 *
 * 2. Languages of the public site. Italian is the home language and has no prefix: "/colazione" is served by the
 *    "/it/colazione" route behind the scenes. The other languages are visible in the address ("/en/colazione").
 *    A "/it/…" address is sent back to the plain one, so every page has exactly one Italian URL.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!request.cookies.has("de_admin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (PREFIXED.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // everything except Next internals, API routes and files with an extension (images, icons, robots.txt…)
  matcher: ["/((?!_next/|api/|.*\..*).*)"],
};
