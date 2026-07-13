"use client";
import { useSearchParams } from "next/navigation";
import { lazy, Suspense } from "react";
import Loader from "@/layout/loader";

// Lazy load themes
const Fashion1 = lazy(() => import("../themes/fashion/fashion1"));
const Fashion2 = lazy(() => import("../themes/fashion/fashion2"));
const Fashion3 = lazy(() => import("../themes/fashion/fashion3"));
const Fashion4 = lazy(() => import("../themes/fashion/fashion4"));
const Fashion5 = lazy(() => import("../themes/fashion/fashion5"));
const Fashion6 = lazy(() => import("../themes/fashion/fashion6"));
const Fashion7 = lazy(() => import("../themes/fashion/fashion7"));
const DigitalDownload = lazy(() => import("../themes/digitalDownload"));
const VideoHomePage = lazy(() => import("../themes/video"));
const VideoSlider = lazy(() => import("../themes/videoSlider"));
const SingleProduct = lazy(() => import("../themes/singleProduct"));

// Default active theme
const DEFAULT_THEME = "fashion_one";

const ActiveTheme = () => {
  const searchParams = useSearchParams();
  const themeSlug = searchParams.get("theme");

  const themes = {
    fashion_one: <Fashion1 />,
    fashion_two: <Fashion2 />,
    fashion_three: <Fashion3 />,
    fashion_four: <Fashion4 />,
    fashion_five: <Fashion5 />,
    fashion_six: <Fashion6 />,
    fashion_seven: <Fashion7 />,
    video: <VideoHomePage />,
    video_slider: <VideoSlider />,
    single_product: <SingleProduct />,
    digital_download: <DigitalDownload />,
  };
  
  const selectedTheme = themes[themeSlug] || themes[DEFAULT_THEME];

  return (
    <Suspense fallback={<Loader />}>
      {selectedTheme}
    </Suspense>
  );
};

export default ActiveTheme;
