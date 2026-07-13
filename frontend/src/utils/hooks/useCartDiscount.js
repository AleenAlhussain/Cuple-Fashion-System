"use client";
import { useEffect, useCallback, useRef, useState } from "react";
import useCartState from "@/states/CartState";
import useDiscountState from "@/states/DiscountState";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.cuple.shop/api";

/**
 * useCartDiscount - Simple, reliable hook for cart discount calculations
 *
 * This hook:
 * 1. Watches for cart changes
 * 2. Debounces API calls (300ms)
 * 3. Calls the discount calculation API
 * 4. Updates the discount state
 * 5. Returns discount and promotion message data
 */
export default function useCartDiscount(options = {}) {
  const { enabled = true } = options;

  // Get cart state
  const cart = useCartState((state) => state.cart);
  const isCartInitialized = useCartState((state) => state.isCartInitialized);
  const initCart = useCartState((state) => state.initCart);

  // Get discount state
  const {
    discounts,
    totals,
    isCalculating,
    error,
    promotionMessages,
    setDiscountResults,
    setCalculating,
    setError,
    clearDiscounts,
    getTotalDiscount,
    getAppliedDiscountSummary,
    getItemDiscount,
  } = useDiscountState();

  // Local state for tracking
  const [localIsCalculating, setLocalIsCalculating] = useState(false);

  // Refs for tracking without causing re-renders
  const lastCartHashRef = useRef("");
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Generate cart hash for change detection
  const getCartHash = useCallback((cartItems) => {
    if (!cartItems?.length) return "";
    return cartItems
      .map(
        (item) =>
          `${item.product_id || item.id}-${item.variation_id || ""}-${item.quantity || 1}-${item.matchi_bundle_key || ""}-${item.price || 0}`
      )
      .sort()
      .join("|");
  }, []);

  // Transform cart to API format
  const transformCart = useCallback((cartItems) => {
    if (!cartItems?.length) return null;

    const items = cartItems.map((item, index) => {
      const variantId = item.variation_id || item.variation?.id || null;
      const productId = item.product_id || item.product?.id || item.id;
      const sku = item.variation?.sku || item.sku || `PROD-${productId}${variantId ? `-V${variantId}` : ""}`;
      const price = parseFloat(item.price) || parseFloat(item.variation?.price) || 0;
      const categoryIds = item.product?.category_ids || item.product?.categories?.map((c) => c.id) || [];

      return {
        variant_id: variantId || productId,
        variant_sku: sku,
        product_id: productId,
        price: price,
        qty: item.quantity || 1,
        category_ids: categoryIds,
        line_id: `line-${index}`,
      };
    });

    return { items, country: "AE", timezone: "Asia/Dubai" };
  }, []);

  // Main calculation function
  const calculateDiscounts = useCallback(async (cartItems) => {
    if (!isMountedRef.current) return;

    const cartData = transformCart(cartItems);

    console.log("[useCartDiscount] calculateDiscounts called", {
      hasCart: !!cartItems,
      cartLength: cartItems?.length,
      cartData: cartData,
    });

    if (!cartData) {
      console.log("[useCartDiscount] No cart data, clearing discounts");
      clearDiscounts();
      return;
    }

    try {
      setLocalIsCalculating(true);
      setCalculating(true);
      console.log("[useCartDiscount] Calling API:", `${API_URL}/website/cart/calculate-discounts`);

      const response = await fetch(`${API_URL}/website/cart/calculate-discounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(cartData),
      });

      const data = await response.json();
      console.log("[useCartDiscount] API Response:", data);

      if (!isMountedRef.current) return;

      if (data?.success && data?.data) {
        const apiData = data.data;
        console.log("[useCartDiscount] Setting results:", {
          total_discount: apiData.total_discount,
          applied_rules_count: apiData.applied_rules?.length || 0,
          promotion_messages_count: apiData.promotion_messages?.length || 0,
        });
        setDiscountResults(apiData);
      } else {
        console.log("[useCartDiscount] No success or data in response");
        setDiscountResults(null);
      }
    } catch (err) {
      console.error("[useCartDiscount] API Error:", err);
      if (isMountedRef.current) {
        setError(err?.message || "Failed to calculate discounts");
      }
    } finally {
      if (isMountedRef.current) {
        setLocalIsCalculating(false);
        setCalculating(false);
      }
    }
  }, [transformCart, setDiscountResults, setCalculating, setError, clearDiscounts]);

  // Initialize cart on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      console.log("[useCartDiscount] Initializing cart from localStorage");
      initCart();
    }
  }, [initCart]);

  // Watch for cart changes and trigger API call
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      console.log("[useCartDiscount] Hook disabled");
      return;
    }

    // Wait for cart to be initialized
    if (!isCartInitialized) {
      console.log("[useCartDiscount] Waiting for cart to initialize...");
      return;
    }

    const currentHash = getCartHash(cart);
    const lastHash = lastCartHashRef.current;

    console.log("[useCartDiscount] Cart state check", {
      isCartInitialized,
      currentHash: currentHash ? `${currentHash.substring(0, 30)}...` : "(empty)",
      lastHash: lastHash ? `${lastHash.substring(0, 30)}...` : "(empty)",
      cartLength: cart?.length,
      hashChanged: currentHash !== lastHash,
    });

    // Skip if cart hasn't changed (but allow first calculation)
    if (currentHash === lastHash && lastHash !== "") {
      console.log("[useCartDiscount] Cart unchanged, skipping");
      return;
    }

    // Clear discounts if cart is empty
    if (!currentHash || !cart?.length) {
      console.log("[useCartDiscount] Cart empty, clearing discounts");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearDiscounts();
      lastCartHashRef.current = "";
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce API call (300ms). The hash is only marked "seen" once the
    // call actually fires - updating it eagerly here would let an effect
    // re-run (e.g. React Strict Mode's double-invoke, or any rapid re-render
    // with the same cart) cancel the pending call via cleanup while the ref
    // already claims the hash was handled, permanently dropping that update.
    timeoutRef.current = setTimeout(() => {
      console.log("[useCartDiscount] Debounce complete, calling API...");
      lastCartHashRef.current = currentHash;
      calculateDiscounts(cart);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, cart, isCartInitialized, getCartHash, calculateDiscounts, clearDiscounts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Force recalculate
  const forceRecalculate = useCallback(() => {
    console.log("[useCartDiscount] Force recalculate");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    lastCartHashRef.current = ""; // Reset hash
    if (cart?.length > 0) {
      calculateDiscounts(cart);
    }
  }, [cart, calculateDiscounts]);

  // Get computed values
  const totalDiscount = getTotalDiscount();
  const appliedDiscounts = getAppliedDiscountSummary();
  const promoMessages = promotionMessages || [];

  return {
    // State
    discounts,
    totals,
    isCalculating: isCalculating || localIsCalculating,
    error,
    isCartInitialized,

    // Computed values
    totalDiscount,
    appliedDiscounts,
    promotionMessages: promoMessages,

    // Methods
    calculate: forceRecalculate,
    getItemDiscount,
    clearDiscounts,

    // Convenience getters
    hasDiscounts: appliedDiscounts?.length > 0,
    hasPromotionMessages: promoMessages?.length > 0,
    subtotal: totals?.subtotal || 0,
    finalTotal: totals?.final_total || 0,
  };
}
