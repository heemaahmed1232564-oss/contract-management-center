import { NextResponse } from "next/server";

function withLocale(response: NextResponse, locale: string) {
  response.cookies.set("contract_locale", locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ar";
  const returnPath = url.searchParams.get("return") || "/dashboard";
  const safePath = returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "/dashboard";
  return withLocale(NextResponse.redirect(new URL(safePath, request.url)), locale);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { locale?: string };
  const locale = body.locale === "en" ? "en" : "ar";
  return withLocale(NextResponse.json({ ok: true, locale }), locale);
}
