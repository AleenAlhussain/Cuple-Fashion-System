import { NextResponse } from "next/server";

function getBaseUrl(request) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${proto}://${host}`;
}

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const hasToken = request.cookies.has("uat");
  const isAuthRoute = path.startsWith("/auth");

  if (!hasToken && !isAuthRoute) {
    return NextResponse.redirect(new URL("/auth/login", getBaseUrl(request)));
  }

  if (hasToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", getBaseUrl(request)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/account",
    "/attachment/:path*",
    "/attribute/:path*",
    "/auth/:path*",
    "/category/:path*",
    "/checkout",
    "/commission_history",
    "/coupon/:path*",
    "/dasboard",
    "/dashboard/:path*",
    "/faq/:path*",
    "/notification/:path*",
    "/order/:path*",
    "/page/:path*",
    "/payment_account/:path*",
    "/point/:path*",
    "/product/:path*",
    "/refund",
    "/role/",
    "/setting/:path*",
    "/subscription/:path*",
    "/shipping/:path*",
    "/store/:path*",
    "/tag/:path*",
    "/theme_option/:path*",
    "/user/:path*",
    "/vendore_wallet/:path*",
    "/wallet/:path*",
    "/withdraw_request/:path*",
    "/vendor_wallet/:path*",
    "/notifications",
    "/qna",
  ],
};
