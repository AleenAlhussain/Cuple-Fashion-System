// src/layout/header/widgets/mainHeaderMenu/MenuList.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function MenuList({ menu, level = 0, onNavigate }) {
  const { i18n } = useTranslation("common");
  const isArabic = String(i18n?.language || "").toLowerCase().startsWith("ar");
  const hasChild = Array.isArray(menu?.child) && menu.child.length > 0;

  // Determine link class based on level and whether it has children
  const linkClass = hasChild ? "dropdown" : "";

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const resizeHandler = () => setIsMobile(window.innerWidth < 1200);
    resizeHandler();
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  const handleClick = (event) => {
    // If item has children and we're on mobile, toggle submenu instead of navigating
    if (hasChild && isMobile) {
      event.preventDefault();
      setIsOpen((prev) => !prev);
      return;
    }

    // For items without children or on desktop, close the mobile menu and navigate
    if (menu?.path && menu.path !== "#" && onNavigate) {
      onNavigate();
    }
  };

  const label =
    isArabic && menu?.title_ar
      ? menu.title_ar
      : (menu?.title || menu?.name || "");

  return (
    <li>
      <Link href={menu?.path || "#"} className={linkClass} onClick={handleClick}>
        {label}
      </Link>

      {hasChild && (
        <ul
          className={`${level === 0 ? "nav-submenu" : "nav-sub-childmenu"} ${
            isOpen ? (level === 0 ? "opensubmenu" : "opensubchild") : ""
          }`}
        >
          {menu.child.map((c, idx) => (
            <MenuList key={idx} menu={c} level={level + 1} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}
