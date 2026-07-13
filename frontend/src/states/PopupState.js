"use client";
import { create } from "zustand";

const usePopupState = create((set, get) => ({
  // State
  popups: [],
  currentPopup: null,
  shownPopupIds: [],
  isLoading: false,

  // Set popups from API
  setPopups: (popups) => {
    set({ popups });
  },

  // Get shown popup IDs from storage based on frequency
  getShownPopups: () => {
    if (typeof window === "undefined") return [];

    try {
      // Get session shown popups
      const sessionShown = JSON.parse(sessionStorage.getItem("shownPopups") || "[]");

      // Get daily shown popups (with date check)
      const dailyData = JSON.parse(localStorage.getItem("dailyPopups") || "{}");
      const today = new Date().toDateString();
      const dailyShown = dailyData.date === today ? dailyData.ids : [];

      // Get permanent (once) shown popups
      const onceShown = JSON.parse(localStorage.getItem("oncePopups") || "[]");

      return { sessionShown, dailyShown, onceShown };
    } catch {
      return { sessionShown: [], dailyShown: [], onceShown: [] };
    }
  },

  // Mark popup as shown based on its frequency
  markPopupAsShown: (popup) => {
    if (typeof window === "undefined") return;

    const popupId = popup.id;
    const frequency = popup.display_frequency;

    try {
      if (frequency === "once") {
        // Store permanently in localStorage
        const onceShown = JSON.parse(localStorage.getItem("oncePopups") || "[]");
        if (!onceShown.includes(popupId)) {
          onceShown.push(popupId);
          localStorage.setItem("oncePopups", JSON.stringify(onceShown));
        }
      } else if (frequency === "once_per_day") {
        // Store with date in localStorage
        const dailyData = JSON.parse(localStorage.getItem("dailyPopups") || "{}");
        const today = new Date().toDateString();
        const dailyShown = dailyData.date === today ? dailyData.ids : [];
        if (!dailyShown.includes(popupId)) {
          dailyShown.push(popupId);
          localStorage.setItem("dailyPopups", JSON.stringify({ date: today, ids: dailyShown }));
        }
      } else if (frequency === "once_per_session") {
        // Store in sessionStorage
        const sessionShown = JSON.parse(sessionStorage.getItem("shownPopups") || "[]");
        if (!sessionShown.includes(popupId)) {
          sessionShown.push(popupId);
          sessionStorage.setItem("shownPopups", JSON.stringify(sessionShown));
        }
      }
      // "every_visit" - don't store, show every time
    } catch (error) {
      console.error("Error marking popup as shown:", error);
    }
  },

  // Check if popup should be shown based on frequency
  shouldShowPopup: (popup, currentPage = "home") => {
    if (!popup || !popup.is_active) return false;

    const { sessionShown, dailyShown, onceShown } = get().getShownPopups();
    const popupId = popup.id;

    // Check frequency rules
    switch (popup.display_frequency) {
      case "once":
        if (onceShown.includes(popupId)) return false;
        break;
      case "once_per_day":
        if (dailyShown.includes(popupId)) return false;
        break;
      case "once_per_session":
        if (sessionShown.includes(popupId)) return false;
        break;
      case "every_visit":
        // Always show
        break;
      default:
        return false;
    }

    // Check page rules
    const showOnPages = popup.show_on_pages || [];
    if (showOnPages.length > 0 && !showOnPages.includes("all")) {
      if (!showOnPages.includes(currentPage)) return false;
    }

    return true;
  },

  // Get next popup to show
  getNextPopup: (currentPage = "home") => {
    const { popups, shouldShowPopup } = get();

    // Sort by priority (highest first) and filter by rules
    const eligiblePopups = popups
      .filter(popup => shouldShowPopup(popup, currentPage))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return eligiblePopups[0] || null;
  },

  // Show popup
  showPopup: (popup) => {
    set({ currentPopup: popup });
  },

  // Close popup
  closePopup: () => {
    const { currentPopup, markPopupAsShown } = get();
    if (currentPopup) {
      markPopupAsShown(currentPopup);
    }
    set({ currentPopup: null });
  },

  // Set loading
  setLoading: (isLoading) => {
    set({ isLoading });
  },
}));

export default usePopupState;
