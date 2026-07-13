import { NextResponse } from "next/server";
import { settingsMockData } from "@/utils/api/settings/settingsMockData";

function getBaseUrl(request) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${proto}://${host}`;
}

export async function middleware(request) {
  const {
    nextUrl: { search },
  } = request;
  const urlSearchParams = new URLSearchParams(search);
  const params = Object.fromEntries(urlSearchParams.entries());

  // Use mock data directly - no API call for better performance
  const settingData = settingsMockData;
  const protectedRoutes = [`/account/dashboard`, `/account/notification`, `/account/wallet`, `/account/bank-details`, `/account/bank-details`, `/account/point`, `/account/refund`, `/account/exchange`, `/account/order`, `/account/addresses`, `/wishlist`];

  const path = request.nextUrl.pathname;
  const query = search || "";
  if (request.cookies.has("maintenance") && path !== `/maintenance`) {
    // Use mock data directly - no API call for better performance
    const data = settingsMockData;

    if (data?.values?.maintenance?.maintenance_mode && path !== `/maintenance`) {
      return NextResponse.redirect(new URL(`/maintenance`, getBaseUrl(request)));
    } else {
      if (request.cookies.get("maintenance")) {
        return NextResponse.next();
      } else {
        const response = NextResponse.next();
        response.cookies.delete("maintenance");
        return NextResponse.redirect(new URL(`/`, getBaseUrl(request)));
      }
    }
  }

  if (protectedRoutes.includes(path) && !request.cookies.has("uat")) {
    // Redirect to the login page instead of landing on the protected route
    const response = NextResponse.redirect(new URL("/auth/login", getBaseUrl(request)));
    response.cookies.set("showAuthToast", "true", { httpOnly: false });
    response.cookies.set("CallBackUrl", `${path}${query}`, { httpOnly: false });
    return response;
  }

  if (!request.cookies.has("maintenance") && path == `/maintenance`) {
    return NextResponse.redirect(new URL(`/`, getBaseUrl(request)));
  }

  if (path == `/checkout` && !request.cookies.has("uat")) {
    if (settingData?.values?.activation?.guest_checkout) {
      if (request.cookies.get("cartData") == "digital") {
        return NextResponse.redirect(new URL(`/auth/login`, getBaseUrl(request)));
      }
    } else {
      return NextResponse.redirect(new URL(`/auth/login`, getBaseUrl(request)));
    }
  }

  if (path == `/auth/login` && request.cookies.has("uat")) {
    return NextResponse.redirect(new URL(`/`, getBaseUrl(request)));
  }

  if (path != `/auth/login`) {
    if (path == `/auth/otp-verification` && !request.cookies.has("ue")) {
      return NextResponse.redirect(new URL(`/auth/login`, getBaseUrl(request)));
    }
    if (path == `/auth/update-password` && (!request.cookies.has("uo") || !request.cookies.has("ue"))) {
      return NextResponse.redirect(new URL(`/auth/login`, getBaseUrl(request)));
    }
  }

  if (request.headers.get("x-redirected")) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
