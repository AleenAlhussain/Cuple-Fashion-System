"use client";
import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePopupState } from "@/states";
import PopupModal from "./PopupModal";

// Fetch popups from API
const fetchPopups = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_WEBSITE_API_URL}/popups`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    if (!response.ok) {
      // Silently return empty array if API not available
      return [];
    }
    const data = await response.json();
    return data.data || [];
  } catch {
    // Silently fail - popups are optional
    return [];
  }
};

// Map pathname to page type
const getPageType = (pathname) => {
  if (!pathname || pathname === "/") return "home";

  const path = pathname.toLowerCase();
  if (path.includes("/product/")) return "product";
  if (path.includes("/shop") || path.includes("/collection")) return "shop";
  if (path.includes("/cart")) return "cart";
  if (path.includes("/checkout")) return "checkout";
  if (path.includes("/category")) return "category";

  return "other";
};

const PopupManager = () => {
  const pathname = usePathname();
  const { setPopups, getNextPopup, showPopup, currentPopup, setLoading } = usePopupState();
  const timeoutRef = useRef(null);
  const hasShownRef = useRef(false);
  const exitIntentRef = useRef(false);

  // Fetch popups
  const { data: popups = [], isLoading } = useQuery({
    queryKey: ["popups"],
    queryFn: fetchPopups,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: false, // Don't retry - popups are optional
  });

  // Update loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  // Set popups in state when fetched
  useEffect(() => {
    if (popups.length > 0) {
      setPopups(popups);
    }
  }, [popups, setPopups]);

  // Get current page type
  const pageType = getPageType(pathname);

  // Show popup after delay
  const showPopupWithDelay = useCallback((popup) => {
    if (!popup || currentPopup) return;

    const delayMs = (popup.delay_seconds || 3) * 1000;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Double-check no popup is currently showing
      if (!usePopupState.getState().currentPopup) {
        showPopup(popup);
        hasShownRef.current = true;
      }
    }, delayMs);
  }, [currentPopup, showPopup]);

  // Handle exit intent
  const handleExitIntent = useCallback((e) => {
    // Only trigger if mouse leaves from top of viewport
    if (e.clientY > 50) return;
    if (exitIntentRef.current) return;
    if (currentPopup) return;

    const popup = getNextPopup(pageType);
    if (popup?.show_on_exit_intent) {
      exitIntentRef.current = true;
      showPopup(popup);
    }
  }, [currentPopup, getNextPopup, pageType, showPopup]);

  // Reset on page change
  useEffect(() => {
    hasShownRef.current = false;
    exitIntentRef.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [pathname]);

  // Show popup on page load
  useEffect(() => {
    if (popups.length === 0 || hasShownRef.current || currentPopup) return;

    const popup = getNextPopup(pageType);
    if (popup && !popup.show_on_exit_intent) {
      showPopupWithDelay(popup);
    }
  }, [popups, pageType, getNextPopup, showPopupWithDelay, currentPopup]);

  // Listen for exit intent
  useEffect(() => {
    // Only add exit intent listener if there are exit intent popups
    const hasExitIntentPopup = popups.some(p =>
      p.show_on_exit_intent && usePopupState.getState().shouldShowPopup(p, pageType)
    );

    if (hasExitIntentPopup && typeof window !== "undefined") {
      document.addEventListener("mouseout", handleExitIntent);
      return () => document.removeEventListener("mouseout", handleExitIntent);
    }
  }, [popups, pageType, handleExitIntent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <PopupModal />;
};

export default PopupManager;
