// src/layout/header/widgets/mainHeaderMenu/index.jsx
"use client";

import MenuList from "./MenuList";
import { useGetCategories } from "@/utils/api";
import useAdminMenus from "@/utils/api/menu/useAdminMenus";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useMemo, useContext } from "react";

const normalizeMenuPath = (value) => {
  if (!value) return "#";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.includes("undefined")) return "#";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const sanitizeMenuTree = (items) =>
  Array.isArray(items)
    ? items.map((menu) => ({
        ...menu,
        path: normalizeMenuPath(menu?.path),
        child: sanitizeMenuTree(menu?.child),
      }))
    : [];

export default function MainHeaderMenu({ className = "" }) {
  const { setMobileSideBar } = useContext(ThemeOptionContext);

  // Fetch only parent categories with children nested
  const { data: categoriesResponse } = useGetCategories({ parents_only: true }, {
    enabled: true,
    refetchOnWindowFocus: false
  });

  const categoryData = categoriesResponse?.data || [];
  const { data: adminMenuData } = useAdminMenus();

  // Close mobile sidebar when navigating
  const closeMobileMenu = () => {
    setMobileSideBar(false);
  };

  // Build menu with "Shop" containing categories as submenus
  const fallbackMenuList = useMemo(() => {
    const categoryItems = categoryData.map((category) => ({
      title: category.name,
      title_ar: category.name_ar || category.name,
      path: `/category/${category.slug}`,
      child: (category.children || []).map((subcategory) => ({
        title: subcategory.name,
        title_ar: subcategory.name_ar || subcategory.name,
        path: `/category/${subcategory.slug}`,
      })),
    }));

    return [
      {
        title: "Shop",
        title_ar: "تسوق",
        path: "/shop",
        child: categoryItems.length > 0 ? categoryItems : [
          { title: "All Products", title_ar: "كل المنتجات", path: "/shop" }
        ],
      },
      {
        title: "Customer Services",
        title_ar: "خدمة العملاء",
        path: "#",
        child: [
          { title: "Tracking Order", title_ar: "تتبع الطلب", path: "/tracking-order" },
          { title: "Exchange and Refund", title_ar: "الاستبدال والاسترجاع", path: "/exchange-and-refund" },
        ],
      },
      { title: "Store Location", title_ar: "موقع المتجر", path: "/store-location" },
    ];
  }, [categoryData]);

  const resolvedMenuItems = adminMenuData?.items ?? [];
  const menuList =
    Array.isArray(resolvedMenuItems) && resolvedMenuItems.length > 0
      ? sanitizeMenuTree(resolvedMenuItems)
      : fallbackMenuList;

  return (
    <ul className={`nav-menu ${className}`}>
      {menuList?.map((menu, i) => (
        <MenuList key={i} menu={menu} level={0} onNavigate={closeMobileMenu} />
      ))}
    </ul>
  );
}
