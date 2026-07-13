"use client";
import { create } from "zustand";
import Cookies from "js-cookie";
import useGiftBoxState from "./GiftBoxState";

// Helper to safely parse price (handles both numeric and string with currency)
const parsePrice = (price) => {
  if (price === null || price === undefined) return 0;
  if (typeof price === "number") return price;
  if (typeof price === "string") {
    // Remove any currency symbols/text and parse
    return Number(price.replace(/[^0-9.]/g, "")) || 0;
  }
  return 0;
};

const roundCurrency = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const generateLineKey = () =>
  `line_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const applyMatchiBundlePricing = (cart) => {
  const prepared = cart.map((item) => {
    const basePrice = parsePrice(item?.base_price ?? item?.price);
    const quantity = Math.max(0, Number(item?.quantity || 0));

    return {
      ...item,
      base_price: basePrice,
      price: basePrice,
      sub_total: roundCurrency(basePrice * quantity),
      matchi_bundle_discount: 0,
      matchi_bundle_applied_qty: 0,
      pricing_source: item?.matchi_bundle_key ? "matchi_bundle" : item?.pricing_source || "default",
    };
  });

  const bundleMap = new Map();
  prepared.forEach((item, index) => {
    const bundleKey = String(item?.matchi_bundle_key || "").trim();
    const bundleSaleTotal = parsePrice(item?.matchi_bundle_sale_total);

    if (!bundleKey || bundleSaleTotal <= 0) return;

    if (!bundleMap.has(bundleKey)) {
      bundleMap.set(bundleKey, []);
    }

    bundleMap.get(bundleKey).push(index);
  });

  bundleMap.forEach((indexes) => {
    if (!Array.isArray(indexes) || indexes.length < 2) return;

    const applications = Math.min(
      ...indexes.map((index) => Math.max(0, Number(prepared[index]?.quantity || 0)))
    );

    if (applications < 1) return;

    const bundleSaleTotal = parsePrice(prepared[indexes[0]]?.matchi_bundle_sale_total);
    const baseTotal = indexes.reduce(
      (sum, index) => sum + parsePrice(prepared[index]?.base_price),
      0
    );

    if (bundleSaleTotal <= 0 || baseTotal <= 0 || bundleSaleTotal >= baseTotal) return;

    let allocatedSaleTotal = 0;

    indexes.forEach((index, position) => {
      const item = prepared[index];
      const basePrice = parsePrice(item?.base_price);
      const quantity = Math.max(0, Number(item?.quantity || 0));
      const fullPriceUnits = Math.max(0, quantity - applications);
      const isLast = position === indexes.length - 1;
      const discountedUnitPrice = isLast
        ? roundCurrency(Math.max(0, bundleSaleTotal - allocatedSaleTotal))
        : roundCurrency((basePrice / baseTotal) * bundleSaleTotal);

      allocatedSaleTotal += discountedUnitPrice;

      const effectiveTotal =
        discountedUnitPrice * applications + basePrice * fullPriceUnits;
      const effectiveUnitPrice = quantity > 0 ? effectiveTotal / quantity : basePrice;
      const baseLineTotal = basePrice * quantity;

      prepared[index] = {
        ...item,
        price: roundCurrency(effectiveUnitPrice, 4),
        sub_total: roundCurrency(effectiveTotal),
        matchi_bundle_discount: roundCurrency(baseLineTotal - effectiveTotal),
        matchi_bundle_applied_qty: applications,
        matchi_bundle_discounted_unit_price: discountedUnitPrice,
      };
    });
  });

  return prepared;
};

const resolveGiftBoxDiscount = (selection, productId, basePrice) => {
  const { has_used_offer_before } = useGiftBoxState.getState();
  if (has_used_offer_before) return 0;
  if (!selection || selection.status !== "confirmed") return 0;
  if (Number(selection.product_id) !== Number(productId)) return 0;

  const value = parsePrice(selection.discount_value);
  let discount = 0;

  switch (selection.discount_type) {
    case "percentage":
      discount = basePrice * (value / 100);
      break;
    case "fixed":
      discount = value;
      break;
    case "price_override":
      discount = basePrice - value;
      break;
    default:
      discount = 0;
  }

  if (discount < 0) return 0;
  if (discount > basePrice) return basePrice;
  return discount;
};

const applyGiftBoxPricing = (item, selection) => {
  const basePrice = parsePrice(item?.price);
  const discount = resolveGiftBoxDiscount(selection, item.product_id, basePrice);
  const subTotal = Math.max(0, basePrice * item.quantity);

  return {
    ...item,
    gift_box_discount: discount,
    gift_box_price: null,
    sub_total: subTotal,
  };
};

const recalculateCartTotals = (cart) => {
  const selection = useGiftBoxState.getState().selection;
  const bundleAdjusted = applyMatchiBundlePricing(cart);
  const updated = bundleAdjusted.map((item) => applyGiftBoxPricing(item, selection));
  const subTotal = updated.reduce((sum, item) => sum + (item.sub_total || 0), 0);
  const discountTotal = updated.reduce((sum, item) => sum + (item.gift_box_discount || 0), 0);
  const total = Math.max(0, subTotal - discountTotal);
  return { updated, total };
};

const useCartState = create((set, get) => ({
  // State
  cart: [],
  cartTotal: 0,
  isCartOpen: false,
  celebrationCount: 0,
  isCartInitialized: false, // Track if cart has been loaded from localStorage

  // Initialize cart from localStorage
  initCart: () => {
    if (typeof window === "undefined") return;

    // Prevent multiple initializations
    if (get().isCartInitialized) {
      console.log("[CartState] Already initialized, skipping");
      return;
    }

    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const { items, total } = JSON.parse(savedCart);
        const recalculated = recalculateCartTotals(items || []);
        console.log("[CartState] Loaded cart from localStorage:", recalculated.updated?.length, "items");
        set({
          cart: recalculated.updated,
          cartTotal: recalculated.total,
          isCartInitialized: true
        });
      } catch (error) {
        console.error("Failed to load cart:", error);
        set({ isCartInitialized: true });
      }
    } else {
      console.log("[CartState] No cart in localStorage");
      set({ isCartInitialized: true });
    }
  },

  // Save cart to localStorage
  saveCart: () => {
    const { cart, cartTotal } = get();
    localStorage.setItem(
      "cart",
      JSON.stringify({
        items: cart,
        total: cartTotal,
      })
    );
  },

  // Add to cart
  triggerCelebration: () => {
    set((state) => ({
      celebrationCount: state.celebrationCount + 1,
    }));
  },

  addToCart: (product, quantity = 1, variation = null, options = {}) => {
   console.group("ADD_TO_CART");
   console.trace("ADD_TO_CART stack");
   console.groupEnd();
    if (product?.product && product?.product_id && typeof quantity !== "number") {
      options = product?.options || {};
      variation = product?.variation || null;
      quantity = product?.quantity || 1;
      product = product?.product;
    }

    const { cart } = get();
    const matchiBundleKey = options?.matchi_bundle_key || options?.matchiBundleKey || null;
    const existingIndex = cart.findIndex(
      (item) =>
        item.product_id === product.id &&
        item.variation_id === variation?.id &&
        String(item?.matchi_bundle_key || "") === String(matchiBundleKey || "")
    );

    const basePrice =
      parsePrice(variation?.final_price) ||
      parsePrice(variation?.sale_price) ||
      parsePrice(variation?.price) ||
      parsePrice(product?.final_price) ||
      parsePrice(product?.price) ||
      0;

    const customPrice =
      parsePrice(options?.custom_price ?? options?.customPrice) || 0;
    const price = customPrice > 0 ? customPrice : basePrice;

    // Extract color and size from variation's attribute_values
    let colorName = null;
    let sizeName = null;
    if (variation?.attribute_values) {
      variation.attribute_values.forEach((av) => {
        // Check attribute name/slug to identify color vs size
        const attrName = av.attribute?.name?.toLowerCase() || '';
        const attrSlug = av.attribute?.slug?.toLowerCase() || '';

        if (attrName === 'color' || attrSlug === 'color' ||
          (av.hex_color && av.hex_color !== '#808080')) {
          // It's a color attribute
          colorName = av.value;
        } else if (attrName === 'size' || attrSlug === 'size' ||
          (!av.hex_color || av.hex_color === '#808080')) {
          // It's a size attribute (or non-color)
          sizeName = av.value;
        }
      });
    }

    let newCart;
    if (existingIndex > -1) {
      // Update existing item
      newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      newCart[existingIndex].base_price =
        parsePrice(newCart[existingIndex]?.base_price) || basePrice;
      newCart[existingIndex].price = price;
      newCart[existingIndex].sub_total = newCart[existingIndex].quantity * price;
    } else {
      // Add new item
      newCart = [
        ...cart,
        {
          line_key: options?.line_key || options?.lineKey || generateLineKey(),
          id: null,
          product_id: product.id,
          product: product,
          variation_id: variation?.id || null,
          variation: variation,
          color: colorName,
          size: sizeName,
          quantity: quantity,
          base_price: basePrice,
          price: price,
          sub_total: quantity * price,
          matchi_bundle_key: matchiBundleKey,
          matchi_bundle_sale_total:
            parsePrice(
              options?.matchi_bundle_sale_total ?? options?.matchiBundleSaleTotal
            ) || null,
          matchi_bundle_original_total:
            parsePrice(
              options?.matchi_bundle_original_total ??
                options?.matchiBundleOriginalTotal
            ) || null,
          matchi_pair_id: options?.matchi_pair_id ?? options?.matchiPairId ?? null,
          pricing_source: matchiBundleKey ? "matchi_bundle" : "default",
        },
      ];
    }

    const recalculated = recalculateCartTotals(newCart);
    set({ cart: recalculated.updated, cartTotal: recalculated.total });
    if (quantity > 0) {
      get().triggerCelebration();
    }
    get().saveCart();
  },

  // Update quantity
  updateQuantity: (productId, variationId, quantity, lineKey = null) => {
    const { cart } = get();
    const newCart = cart.map((item) => {
      const matchesTarget = lineKey
        ? item?.line_key === lineKey
        : item.product_id === productId && item.variation_id === variationId;

      if (matchesTarget) {
        const updatedItem = { ...item, quantity };
        const price = parsePrice(item?.price ?? item?.base_price);
        updatedItem.sub_total = quantity * price;
        return updatedItem;
      }
      return item;
    });

    const recalculated = recalculateCartTotals(newCart);
    set({ cart: recalculated.updated, cartTotal: recalculated.total });
    get().saveCart();
  },

  // Remove from cart
  removeFromCart: (productId, variationId = null, lineKey = null) => {
    const { cart } = get();
    const newCart = cart.filter(
      (item) =>
        !(
          lineKey
            ? item?.line_key === lineKey
            : item.product_id === productId && item.variation_id === variationId
        )
    );

    const recalculated = recalculateCartTotals(newCart);
    set({ cart: recalculated.updated, cartTotal: recalculated.total });
    get().saveCart();
  },

  // Clear cart
  clearCart: () => {
    set({ cart: [], cartTotal: 0 });
    localStorage.removeItem("cart");
  },

  // Apply gift box selection to existing cart
  applyGiftBoxSelection: () => {
    const { cart } = get();
    const recalculated = recalculateCartTotals(cart);
    set({ cart: recalculated.updated, cartTotal: recalculated.total });
    get().saveCart();
  },

  // Toggle cart sidebar
  toggleCart: (isOpen) => {
    set({ isCartOpen: isOpen ?? !get().isCartOpen });
  },

  // Get cart count
  getCartCount: () => {
    return get().cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Get cart total
  getTotal: (cartItems = null) => {
    const cart = cartItems || get().cart;
    const subTotal = cart.reduce((sum, item) => sum + (item.sub_total || 0), 0);
    const discountTotal = cart.reduce((sum, item) => sum + (item.gift_box_discount || 0), 0);
    return Math.max(0, subTotal - discountTotal);
  },
}));

export default useCartState;
