import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
  const returnPath = url.searchParams.get("return") || "/dashboard";
  const safePath = returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "/dashboard";
  const response = NextResponse.redirect(new URL(safePath, request.url));
  response.cookies.set("contract_theme", theme, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
  return response;
}
