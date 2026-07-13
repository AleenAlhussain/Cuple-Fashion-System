"use client";
import { useEffect, useState, useRef } from "react";
import GiftBoxModal from "./GiftBoxModal";
import { useAuthState, useCartState, useGiftBoxState } from "@/states";

const GiftBoxManager = () => {
  const { token, user, logout } = useAuthState();

  const {
    setOffer,
    setSelection,
    setHasUsedOfferBefore,
    has_used_offer_before,
    selection,
  } = useGiftBoxState();

  const cart = useCartState((state) => state.cart);
  const addToCart = useCartState((state) => state.addToCart);
  const applyGiftBoxSelection = useCartState((state) => state.applyGiftBoxSelection);

  const autoAddKeyRef = useRef(null);
  const cartRef = useRef(cart);
  const selectionRef = useRef(null);
  const usedFlagRef = useRef(false);
  const ensureTimerRef = useRef(null);

  const [show, setShow] = useState(false);
  const [offerData, setOfferData] = useState(null);
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_WEBSITE_API_URL || "https://api.cuple.shop/api/website";

  const handleUnauthorized = async () => {
    setShow(false);
    await logout();
  };

  // keep refs updated (to avoid stale closures)
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    selectionRef.current = selection;
    usedFlagRef.current = has_used_offer_before;
    if (selection) {
      scheduleEnsureGift();
    }
  }, [selection, has_used_offer_before]);

  const isGiftLine = (item) =>
    Number(item?.gift_box_discount) > 0 || item?.gift_box_price !== null;

  const ensureGiftInCart = (selection, usedFlag = has_used_offer_before) => {
    if (!selection?.product_id || !selection?.product) return;
    if (usedFlag) return;

    const offerId =
      selection?.offer_id ||
      selection?.gift_box_offer_id ||
      offerData?.offer_id ||
      "offer";

    const key = `gift_autoadd_${user?.id || "guest"}_${offerId}_${selection.product_id}`;

    // prevent double add in same lifecycle (StrictMode / double effects / multiple triggers)
    if (autoAddKeyRef.current === key) return;
    autoAddKeyRef.current = key;

    const selectionIsGift = isGiftLine(selection);

    const existsGift = (cartRef.current || []).some(
      (item) =>
        Number(item?.product_id) === Number(selection.product_id) &&
        isGiftLine(item) === selectionIsGift
    );

    if (!existsGift) {
      // IMPORTANT: this is what was causing duplicates when called before cart hydration
      addToCart(selection.product, 1, null);
    }

    // Apply discounts/calculations after ensuring
    applyGiftBoxSelection();
  };

  const scheduleEnsureGift = () => {
    // clear any previous scheduled ensure
    if (ensureTimerRef.current) {
      clearTimeout(ensureTimerRef.current);
      ensureTimerRef.current = null;
    }

    // Delay a bit to let Zustand persist hydrate/restore cart first
    ensureTimerRef.current = setTimeout(() => {
      const selection = selectionRef.current;
      const usedFlag = usedFlagRef.current;
      if (selection) {
        ensureGiftInCart(selection, usedFlag);
      } else {
        // no selection -> just apply (removes any applied gift calculation)
        applyGiftBoxSelection();
      }
    }, 250);
  };

  const fetchActiveOffer = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/gift-box/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) return;
      const result = await response.json();
      const offer = result?.data || null;

      setOffer(offer);
      setOfferData(offer);

      setHasUsedOfferBefore(Boolean(offer?.has_used_offer_before));

      if (offer?.selection) {
        // store selection (cart add handled by selection effect)
        setSelection(offer.selection);
      }

      // Popup is intentionally not auto-shown; notification tab controls the UX.
    } catch (error) {
      console.error("Failed to fetch gift box offer:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelection = async () => {
    if (!token || !user) return;
    try {
      const response = await fetch(`${apiBase}/me/gift-box`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) return;

      const result = await response.json();
      const data = result?.data || null;
      const selection = data?.selection ?? data;

      const usedFlag =
        typeof data?.has_used_offer_before !== "undefined"
          ? Boolean(data.has_used_offer_before)
          : false;

      if (typeof data?.has_used_offer_before !== "undefined") {
        setHasUsedOfferBefore(usedFlag);
      }

      // store selection ONLY (no add here)
      if (selection) {
        setSelection(selection);
      } else {
        setSelection(null);
      }
    } catch (error) {
      console.error("Failed to fetch gift box selection:", error);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      // reset on logout
      selectionRef.current = null;
      usedFlagRef.current = false;
      autoAddKeyRef.current = null;

      setSelection(null);
      setHasUsedOfferBefore(false);
      setOffer(null);
      setOfferData(null);
      setShow(false);

      applyGiftBoxSelection();
      return;
    }

    const initGiftBox = async () => {
      await fetchSelection();
      await fetchActiveOffer();
    };

    initGiftBox();

    return () => {
      if (ensureTimerRef.current) {
        clearTimeout(ensureTimerRef.current);
        ensureTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  const handleClose = () => setShow(false);

  const handleConfirm = async ({ categoryId, productId }) => {
    if (!token || !offerData?.offer_id) return;
    try {
      const response = await fetch(`${apiBase}/gift-box/select`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          offer_id: offerData.offer_id,
          category_id: categoryId,
          product_id: productId,
        }),
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        console.error("Gift box selection failed:", result?.message);
        return;
      }

      const selection = result?.data;

      if (selection) {
        // store selection (cart add handled by selection effect)
        setSelection(selection);
      }

      setShow(false);
    } catch (error) {
      console.error("Gift box selection error:", error);
    }
  };

  if (!offerData || loading) return null;

  return (
    <GiftBoxModal
      isOpen={show}
      offer={offerData}
      onClose={handleClose}
      onConfirm={handleConfirm}
    />
  );
};

export default GiftBoxManager;
