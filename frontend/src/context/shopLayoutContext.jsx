"use client";
import { createContext, useContext, useState, useEffect, useMemo } from "react";

const DEFAULT_SETTINGS = {
  grid: { columns_desktop: 4, columns_tablet: 2, columns_mobile: 1, grid_gap: 16, row_gap: 24, products_per_page: 12, pagination_type: "normal" },
  card_image: { aspect_ratio: "4:5", image_fit: "cover", height_mode: "ratio", fixed_height: null },
  card_content: { show_category: true, show_title: true, show_price: true, show_sale_badge: true, show_rating: false, show_short_description: false, show_add_to_cart: true, show_wishlist: true, show_quick_view: true },
  card_order: ["category", "title", "price", "rating", "description", "add_to_cart", "wishlist", "quick_view"],
  text: { title_max_lines: 2, description_max_lines: 2, title_font_size: "medium", price_font_size: "medium" },
  sorting: { default_sort: "newest" },
  priority: { enabled: false },
};

const ShopLayoutContext = createContext({ settings: DEFAULT_SETTINGS, loading: true });

export const useShopLayout = () => useContext(ShopLayoutContext);

export const ShopLayoutProvider = ({ scope = "shop", scopeId = null, children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_WEBSITE_API_URL || "https://api.cuple.shop/api/website";
        let url = `${apiUrl}/shop-layout?scope=${scope}`;
        if (scopeId) url += `&scope_id=${scopeId}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (data?.success && data?.data) {
          // API returns settings directly under data (grid, card_image, etc.)
          const incoming = data.data.settings || data.data;
          setSettings((prev) => deepMerge(prev, incoming));
        }
      } catch (e) {
        console.error("Failed to fetch shop layout settings", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [scope, scopeId]);

  const value = useMemo(() => ({ settings, loading }), [settings, loading]);

  return (
    <ShopLayoutContext.Provider value={value}>
      {children}
    </ShopLayoutContext.Provider>
  );
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export default ShopLayoutContext;
