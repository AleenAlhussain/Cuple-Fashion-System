import NoDataFound from "@/components/widgets/NoDataFound";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { themeOptionsMockData } from "@/utils/api/themeOptions/themeOptions";
import Link from "next/link";
import useAdminMenus from "@/utils/api/menu/useAdminMenus";
import React, { useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";

const FooterUsefulLinks = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const isArabic = String(i18n?.language || "").toLowerCase().startsWith("ar");

  const fallbackLinks = themeOptionsMockData?.options?.footer?.useful_link || [];
  const { data: footerMenu } = useAdminMenus({ location: "footer_useful" });

  const normalizePath = (value) => {
    if (!value) return "/";
    const cleaned = String(value).trim();
    if (!cleaned) return "/";
    if (/^(https?:)?\/\//i.test(cleaned)) return cleaned;
    return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  };

  // ✅ توحيد شكل العنصر: children دائمًا
  const normalizeNodes = (items = []) =>
    items.map((x) => ({
      ...x,
      // بعض الـ APIs تستخدم child وبعضها children
      children: Array.isArray(x?.children)
        ? x.children
        : Array.isArray(x?.child)
          ? x.child
          : [],
    }));

  // ✅ Flat/Nested -> Tree موحّد
  const buildMenuTree = (items = []) => {
    const normalized = normalizeNodes(items);

    // لو العناصر أصلاً فيها children، نزبطها ونكمل
    const map = new Map();
    const roots = [];

    normalized.forEach((node) => {
      // مهم: لا نكرر children القديمة قبل الربط بالـ parent_id
      map.set(node.id, { ...node, children: normalizeNodes(node.children) });
    });

    map.forEach((node) => {
      const pid = node.parent_id ?? node.parentId ?? node.parent ?? null;

      // اعتبر 0 و "0" Root
      const isRoot =
        pid === null || pid === undefined || pid === 0 || pid === "0" || pid === "";

      if (!isRoot && map.has(pid)) {
        const parent = map.get(pid);
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const adminItems = footerMenu?.items ?? [];

  const treeMenuItems = useMemo(() => buildMenuTree(adminItems), [adminItems]);

  const usefulLinks =
    Array.isArray(treeMenuItems) && treeMenuItems.length
      ? treeMenuItems
      : themeOption?.footer?.useful_link?.length
        ? themeOption.footer.useful_link
        : fallbackLinks;

  const renderLinks = (items, level = 0) => {
    if (!Array.isArray(items) || items.length === 0) return null;

    const getLabel = (item) => {
      if (isArabic && item?.title_ar) return item.title_ar;
      if (isArabic && item?.name_ar) return item.name_ar;
      return item?.title || item?.name || (isArabic ? "رابط" : "Link");
    };

    return (
      <ul className={level > 0 ? "footer-child-links" : "footer-parent-links"}>
        {items.map((item, i) => (
          <li key={item?.id ?? item?.value ?? i}>
            <Link
              className={level === 0 ? "footer-parent-link" : "footer-child-link"}
              href={normalizePath(item?.path ?? item?.value ?? "")}
            >
              {getLabel(item)}
            </Link>

            {Array.isArray(item?.children) && item.children.length > 0
              ? renderLinks(item.children, level + 1)
              : null}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="footer-content">
      {usefulLinks?.length ? (
        renderLinks(usefulLinks)
      ) : (
        <NoDataFound customClass={"no-data-footer"} title={"No Link Found"} />
      )}

      <style jsx>{`
  .footer-parent-links {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .footer-parent-links > li {
    margin-bottom: 0.6rem;
  }
    
  .footer-child-links {
    margin-top: 0.4rem;
    margin-left: 0.75rem;     /* indentation */
    padding-left: 0.75rem;
    border-left: 1px solid rgba(255,255,255,0.15);
  }

  .footer-child-links li {
    margin-top: 0.35rem;
  }

  .footer-parent-link {
    font-size: 0.95rem;
    font-weight: 500;
  }

  .footer-child-link {
    font-size: 0.85rem;
    opacity: 0.85;
  }
`}</style>


    </div>
  );
};

export default FooterUsefulLinks;
