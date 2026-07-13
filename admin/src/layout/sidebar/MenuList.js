
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { RiAddLine, RiSubtractLine } from "react-icons/ri";
import BadgeContext from "../../helper/badgeContext";
import SettingContext from "../../helper/settingContext";
import { checkPermission } from "../../components/common/CheckPermissionList";
import { getStoredAdminRoleName, isOrdersOnlyAdminRole } from "../../utils/customFunctions/adminRoles";

import { useTranslation } from "react-i18next";

/**
 * Recursively filter menu items by permission.
 * Items without a permission field are visible to everyone (e.g. Dashboard).
 * Parent items with children are only shown if at least one child passes.
 */
const filterByPermission = (items, roleName = "") => {
  if (!items) return [];
  return items.reduce((acc, item) => {
    if (isOrdersOnlyAdminRole(roleName)) {
      const isOrderRoot = item.path === "/order" || item.title === "Orders";
      const isOrderChild = item.path?.startsWith?.("/order") && item.path !== "/order/create";

      if (item.children && item.children.length > 0) {
        const filteredChildren = filterByPermission(item.children, roleName);
        if ((isOrderRoot || filteredChildren.some((child) => child.path?.startsWith?.("/order"))) && filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
        return acc;
      }

      if (isOrderChild) {
        acc.push(item);
      }
      return acc;
    }

    // If item has children, filter them first
    if (item.children && item.children.length > 0) {
      const filteredChildren = filterByPermission(item.children, roleName);
      if (filteredChildren.length > 0) {
        acc.push({ ...item, children: filteredChildren });
      }
      return acc;
    }
    // Leaf item: check permission (no permission field = always visible)
    if (!item.permission || checkPermission(item.permission)) {
      acc.push(item);
    }
    return acc;
  }, []);
};

const MenuList = ({ menu, level, setActiveMenu, activeMenu }) => {

  const { t } = useTranslation('common');
  const roleName = useMemo(() => getStoredAdminRoleName(), []);
  const filteredMenu = useMemo(() => filterByPermission(menu, roleName), [menu, roleName]);
  const [newMenu, setNewMenu] = useState(filteredMenu);
  const { searchSidebarMenu, setSearchSidebarMenu } = useContext(SettingContext);
  const { state } = useContext(BadgeContext);
  const [parentMenu, setParentMenu] = useState("");
  const router = usePathname();

  // This useEffect is for active the menu on refresh the page
  useEffect(() => {
    const currentPath = (router || "").split("#")[0];
    const isPathMatch = (itemPath) => {
      if (!itemPath || !currentPath) return false;
      if (currentPath === itemPath) return true;
      return currentPath.startsWith(`${itemPath}/`);
    };
    const hasActiveDescendant = (item) => {
      if (isPathMatch(item.path)) return true;
      if (item.children) {
        return item.children.some((child) => hasActiveDescendant(child));
      }
      return false;
    };

    setParentMenu("");
    if (!router) return;
    filteredMenu?.forEach((element) => {
      if (hasActiveDescendant(element)) {
        setParentMenu(element.title);
      }
    });
  }, [router, filteredMenu]);

  // Re-sync when filteredMenu changes (e.g. role loaded async)
  useEffect(() => {
    setNewMenu(filteredMenu);
  }, [filteredMenu]);

  // Setting Badges in sidebar
  const customBadge = () => {
    let tempMenu = [...newMenu];
    tempMenu.forEach((elem) => {
      const match = state?.badges?.find((item) => item.path == elem.path);
      if (match) {
        elem.badgeValue = match.value;
      } else return false;
    });
    setNewMenu(tempMenu);
  };
  // Calling customBadge on state.badges changes
  useEffect(() => {
    customBadge();
  }, [state.badges]);

  useEffect(() => {
    setSearchSidebarMenu(newMenu);
  }, [newMenu]);

  return (
    <>
      {newMenu?.map((mainMenu, i) => (
        <li className="sidebar-list" key={i}>
          <>
            {mainMenu.path ? (
              <Link href={mainMenu.path} className={`sidebar-link sidebar-title link-nav ${parentMenu === mainMenu.title ? "active" : ""}`}>
                <div className="svg-icon">{mainMenu.icon}</div>
                <span>{t(mainMenu.title)}</span>
                {mainMenu?.badgeValue > 0 && <span className="badge bg-warning ml-3 text-dark btn-secondary">{mainMenu?.badgeValue}</span>}
              </Link>
            ) : (
              <a
                className={`sidebar-link sidebar-title link-nav ${parentMenu === mainMenu.title ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setParentMenu((prev) => prev !== mainMenu.title && mainMenu.title);
                }}
              >
                <div className="svg-icon">{mainMenu.icon}</div>
                <span>{t(mainMenu.title)}</span>
                {mainMenu.children && (parentMenu === mainMenu.title ? <RiSubtractLine className="icon-arrow" /> : <RiAddLine className="icon-arrow" />)}
              </a>
            )}
            {mainMenu.children && (
              <ul className={`sidebar-submenu ${parentMenu === mainMenu.title ? "d-block" : "d-none"}`}>
                <MenuList menu={mainMenu.children} level={level + 1} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
              </ul>
            )}
          </>
        </li>
      ))}
    </>
  );
};

export default MenuList;
