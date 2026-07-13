import TanstackWrapper from "@/layout/TanstackWrapper";
import NextTopLoader from "nextjs-toploader";
import { ToastContainer } from "react-toastify";
import "../../public/assets/scss/app.scss";
import { I18nProvider } from "./i18n/i18n-context";
import { detectLanguage } from "./i18n/server";
import { isRtlLanguage } from "./i18n/settings";
import ErrorBoundary from "@/layout/ErrorBoundary";
import GlobalStyleFix from "@/components/GlobalStyleFix";
import { cookies } from "next/headers";

export async function generateMetadata() {
  let settingData = null;

  // Skip settings fetch during build if server is not available
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("uat");
  const token = tokenCookie?.value;
  if (token) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${process.env.API_PROD_URL}/settings`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        settingData = await res.json();
      }
    } catch {
      // Silently fail during build - settings will be fetched at runtime
    }
  }

  return {
    metadataBase: new URL(process.env.ADMIN_URL || "https://admin.cuple.shop"),
    title: settingData?.values?.general?.site_title || "Store Admin",
    description: settingData?.values?.general?.site_tagline || "Admin Dashboard",
    icons: {
      icon: settingData?.values?.general?.favicon_image?.original_url || "/favicon.ico",
    },
  };
}

export default async function RootLayout({ children }) {
  const lng = await detectLanguage();
  const rtl = isRtlLanguage(lng);

  return (
    <I18nProvider language={lng}>
      <html lang={lng} dir={rtl ? "rtl" : "ltr"}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet"></link>
          {rtl && (
            <link
              href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap"
              rel="stylesheet"
            />
          )}
        </head>
        <body className={rtl ? "rtl" : ""} suppressHydrationWarning={true}>
          <GlobalStyleFix />
          <ErrorBoundary>
          <TanstackWrapper>{children}</TanstackWrapper>
          <ToastContainer position="top-center" />
          <NextTopLoader />
          </ErrorBoundary>
        </body>
      </html>
    </I18nProvider>
  );
}
