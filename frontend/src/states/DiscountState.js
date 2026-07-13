"use client";
import { create } from "zustand";

/**
 * DiscountState - Manages rule-based discount calculations
 *
 * This state stores the results of discount calculations from the Offer Engine.
 * Discounts are calculated server-side and stored here for display in cart/checkout.
 */
const useDiscountState = create((set, get) => ({
  // Discount calculation results
  discounts: [], // Array of applied discounts with details
  totals: {
    subtotal: 0,
    total_discount: 0,
    final_total: 0,
  },

  // Promotion messages (spend more to unlock)
  promotionMessages: [],

  // Loading state
  isCalculating: false,
  lastCalculatedAt: null,
  error: null,

  // Applied discount rule IDs (for tracking)
  appliedRuleIds: [],

  /**
   * Set discount calculation results from API
   * API response format: { applied_rules, adjusted_items, free_items, cart_discount_total, total_discount, messages, promotion_messages }
   */
  setDiscountResults: (results) => {
    console.log("[DiscountState] setDiscountResults called with:", results);

    if (!results) {
      console.log("[DiscountState] Clearing results (null input)");
      set({
        discounts: [],
        totals: { subtotal: 0, total_discount: 0, final_total: 0 },
        promotionMessages: [],
        appliedRuleIds: [],
        error: null,
        isCalculating: false,
      });
      return;
    }

    // Parse applied_rules from API response
    const appliedRules = results.applied_rules || [];
    const discounts = appliedRules.map((rule) => ({
      applied: true,
      rule_id: rule.id,
      rule_name: rule.name,
      discount_amount: rule.discount_amount || 0,
      discount_type: rule.type,
      description: "",
    }));

    // Parse promotion messages
    const promotionMessages = results.promotion_messages || [];

    const appliedRuleIds = appliedRules.map((r) => r.id);
    const totalDiscount = results.total_discount || 0;

    console.log("[DiscountState] Setting state:", {
      discounts_count: discounts.length,
      total_discount: totalDiscount,
      promotion_messages_count: promotionMessages.length,
      applied_rule_ids: appliedRuleIds,
    });

    set({
      discounts,
      totals: {
        subtotal: results.cart_subtotal || 0,
        total_discount: totalDiscount,
        final_total: (results.cart_subtotal || 0) - totalDiscount,
      },
      promotionMessages,
      appliedRuleIds,
      lastCalculatedAt: new Date().toISOString(),
      error: null,
      isCalculating: false,
    });
  },

  /**
   * Set calculating state
   */
  setCalculating: (isCalculating) => {
    console.log("[DiscountState] setCalculating:", isCalculating);
    set({ isCalculating });
  },

  /**
   * Set error state
   */
  setError: (error) => {
    console.log("[DiscountState] setError:", error);
    set({ error, isCalculating: false });
  },

  /**
   * Clear all discount data
   */
  clearDiscounts: () => {
    console.log("[DiscountState] clearDiscounts called");
    set({
      discounts: [],
      totals: { subtotal: 0, total_discount: 0, final_total: 0 },
      promotionMessages: [],
      appliedRuleIds: [],
      isCalculating: false,
      lastCalculatedAt: null,
      error: null,
    });
  },

  /**
   * Get promotion messages
   */
  getPromotionMessages: () => {
    return get().promotionMessages || [];
  },

  /**
   * Get total discount amount
   */
  getTotalDiscount: () => {
    return get().totals.total_discount || 0;
  },

  /**
   * Get list of applied discount descriptions for display
   */
  getAppliedDiscountSummary: () => {
    const { discounts } = get();
    return discounts
      .filter((d) => d.applied && d.discount_amount > 0)
      .map((d) => ({
        name: d.rule_name || "Discount",
        amount: d.discount_amount || 0,
        type: d.discount_type,
        description: d.description || "",
      }));
  },

  /**
   * Check if a specific rule is applied
   */
  isRuleApplied: (ruleId) => {
    return get().appliedRuleIds.includes(ruleId);
  },

  /**
   * Get item-level discounts for a specific product/variant
   */
  getItemDiscount: (productId, variantId) => {
    const { discounts } = get();
    const itemDiscounts = discounts.filter(
      (d) =>
        d.applied &&
        d.target_type === "item" &&
        d.items?.some((item) => item.product_id === productId && (!variantId || item.variant_id === variantId))
    );

    return itemDiscounts.reduce((total, d) => {
      const item = d.items?.find((i) => i.product_id === productId && (!variantId || i.variant_id === variantId));
      return total + (item?.discount_amount || 0);
    }, 0);
  },
}));

export default useDiscountState;
