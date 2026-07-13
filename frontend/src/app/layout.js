import "../index.scss";
import { I18nProvider } from "./i18n/i18n-context";
import { detectLanguage } from "./i18n/server";
import { isRtlLanguage } from "./i18n/settings";
import { settingsMockData } from "../utils/api/settings/settingsMockData";

export async function generateMetadata() {
  // fetch data with timeout to prevent blocking
  let themeOption = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`${process.env.API_URL}/theme-options`, {
      signal: controller.signal,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      themeOption = await response.json();
    }
  } catch (err) {}

  return {
    metadataBase: new URL(process.env.API_URL || "https://api.cuple.shop/api/website"),
    title: themeOption?.options?.seo?.meta_tags || "CUPLE Shop",
    description: themeOption?.options?.seo?.meta_description || "Premium Fashion Store",
    icons: {
      icon: themeOption?.options?.logo?.favicon_icon?.original_url || "/favicon.ico",
    },
    openGraph: {
      title: themeOption?.options?.seo?.og_title || "CUPLE Shop",
      description: themeOption?.options?.seo?.og_description || "Premium Fashion Store",
      images: themeOption?.options?.seo?.og_image?.original_url ? [themeOption.options.seo.og_image.original_url] : [],
    },
  };
}

export default async function RootLayout({ children }) {
  // Use mock data directly - no API call for better performance
  const settings = settingsMockData;

  const lng = await detectLanguage();
  const rtl = isRtlLanguage(lng);

  return (
    <I18nProvider language={lng}>
      <html lang={lng} dir={rtl ? "rtl" : "ltr"} suppressHydrationWarning>
        <head>
          {/* ===== Google Fonts - OPTIMIZED: Only 2 fonts instead of 8 ===== */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* Primary font: Montserrat - Only essential weights */}
          <link
            href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          {/* Decorative font: Cormorant - For headings */}
          <link
            href="https://fonts.googleapis.com/css2?family=Cormorant:wght@500;600&display=swap"
            rel="stylesheet"
          />
          {/* Arabic font: Cairo - loaded when RTL language detected */}
          {rtl && (
            <link
              href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap"
              rel="stylesheet"
            />
          )}

          {/* ===== Theme color fix (applies before JS load) ===== */}
          <style id="brand-theme">{`
            :root {
              --theme-color: #D49D67;
              --theme-hover: #B98A3F;
              --theme-light: #FAF3E5;
              --theme-dark: #1E1E1E;
            }
          `}</style>

          {/* ===== Force override after all CSS loads ===== */}
          <link
            rel="stylesheet"
            href="/assets/css/custom.css?v=16"
          />
        </head>

        <body className={rtl ? "rtl" : ""} suppressHydrationWarning={true}>{children}</body>
      </html>
    </I18nProvider>
  );
}
