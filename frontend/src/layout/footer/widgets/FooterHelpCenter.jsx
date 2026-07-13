import NoDataFound from "@/components/widgets/NoDataFound";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { themeOptionsMockData } from "@/utils/api/themeOptions/themeOptions";
import Link from "next/link";
import useAdminMenus from "@/utils/api/menu/useAdminMenus";
import React, { useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";

const FooterHelpCenter = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const isArabic = String(i18n?.language || "").toLowerCase().startsWith("ar");
  const fallbackLinks = themeOptionsMockData?.options?.footer?.help_center || [];
  const { data: footerMenu } = useAdminMenus({ location: "footer_help" });

  const normalizePath = (value) => {
    if (!value) return "/";
    const cleaned = String(value).trim();
    if (!cleaned) return "/";
    if (/^(https?:)?\/\//i.test(cleaned)) return cleaned;
    return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  };

  // ✅ Flat -> Tree (يدعم child/children + parent_id)
  const buildMenuTree = (items = []) => {
    const map = new Map();
    const roots = [];

    // clone + ensure children array
    items.forEach((raw) => {
      const node = { ...raw };
      node.children = Array.isArray(raw?.children)
        ? raw.children
        : Array.isArray(raw?.child)
        ? raw.child
        : [];
      map.set(node.id, node);
    });

    // attach children based on parent_id / parentId
    map.forEach((node) => {
      const pid = node.parent_id ?? node.parentId ?? node.parent ?? null;

      if (pid && map.has(pid)) {
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

  const treeMenuItems = useMemo(() => {
    const looksNested = adminItems?.some(
      (x) => (Array.isArray(x?.children) && x.children.length) || (Array.isArray(x?.child) && x.child.length)
    );

    if (looksNested) {
      return adminItems.map((x) => ({
        ...x,
        children: Array.isArray(x?.children) ? x.children : Array.isArray(x?.child) ? x.child : [],
      }));
    }

    return buildMenuTree(adminItems);
  }, [adminItems]);

  const helpLinks =
    Array.isArray(treeMenuItems) && treeMenuItems.length
      ? treeMenuItems
      : themeOption?.footer?.help_center?.length
      ? themeOption.footer.help_center
      : fallbackLinks;

  const renderLinks = (items, level = 0) => {
    if (!Array.isArray(items) || items.length === 0) return null;

    const getLabel = (item) => {
      if (isArabic && item?.title_ar) return item.title_ar;
      if (isArabic && item?.name_ar) return item.name_ar;
      return item?.title || item?.name || (isArabic ? "مساعدة" : "Help");
    };

    return (
      <ul className={level > 0 ? "footer-child-links" : "footer-parent-links"}>
        {items.map((item, i) => {
          const children =
            Array.isArray(item?.children) ? item.children : Array.isArray(item?.child) ? item.child : [];

          return (
            <li key={item?.id ?? item?.value ?? i}>
              <Link
                className={level === 0 ? "footer-parent-link" : "footer-child-link text-content"}
                href={normalizePath(item?.path ?? item?.value ?? "")}
              >
                {getLabel(item)}
              </Link>

              {children.length > 0 && renderLinks(children, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="footer-content">
      {helpLinks?.length ? renderLinks(helpLinks) : (
        <NoDataFound customClass={"no-data-footer"} title={"No Link Found"} />
      )}

      <style jsx>{`
        .footer-parent-links {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }
          
        .footer-child-links {
          margin-top: 0.35rem;
          padding-left: 1.2rem;     /* indentation */
          list-style: disc;          /* bullets */
        }

        .footer-child-links li + li {
          margin-top: 0.2rem;
        }

        .footer-parent-links > li {
          margin-bottom: 0.45rem;
        }

        .footer-parent-link,
        .footer-child-link {
          font-size: 0.95rem;
          color: inherit;
          display: inline-block;
          line-height: 1.35;
        }

        .footer-child-link {
          font-size: 0.85rem;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default FooterHelpCenter;
