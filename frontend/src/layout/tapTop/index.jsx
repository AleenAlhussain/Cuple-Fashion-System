"use client";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext, useEffect, useMemo, useState } from "react";

const TapTop = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const [isVisible, setIsVisible] = useState(false);

  const enableBackToTop = useMemo(
    () => themeOption?.general?.back_to_top_enable ?? true,
    [themeOption?.general?.back_to_top_enable]
  );

  useEffect(() => {
    if (!enableBackToTop || typeof window === "undefined") return undefined;

    const handleScroll = () => {
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enableBackToTop]);

  const executeScroll = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  if (!enableBackToTop) return null;

  return (
    <button
      className={`tap-top${isVisible ? " tap-show" : ""}`}
      onClick={executeScroll}
      aria-label="Scroll back to top"
      type="button"
    >
      <i className="ri-arrow-up-double-line" />
    </button>
  );
};

export default TapTop;
