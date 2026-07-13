"use client";
import { create } from "zustand";

const STORAGE_KEY = "gift_box_selection";

const getStoredSelection = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const storeSelection = (selection) => {
  if (typeof window === "undefined") return;
  if (!selection) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
};

const useGiftBoxState = create((set, get) => ({
  offer: null,
  selection: getStoredSelection(),
  has_used_offer_before: false,
  loading: false,

  initGiftBox: () => {
    const stored = getStoredSelection();
    if (stored) {
      set({ selection: stored });
    }
  },

  setOffer: (offer) => set({ offer }),

  setSelection: (selection) => {
    storeSelection(selection);
    set({ selection });
  },

  setHasUsedOfferBefore: (value) => set({ has_used_offer_before: Boolean(value) }),

  clearSelection: () => {
    storeSelection(null);
    set({ selection: null });
  },
}));

export default useGiftBoxState;
