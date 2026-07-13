const ISSERVER = typeof window === "undefined";
const ORDERS_ONLY_ROLES = ["stock_keeper", "accounting_team"];
const ORDERS_ONLY_ALLOWED_PREFIXES = ["order.", "invoice."];

const getStoredRole = () => {
  if (ISSERVER) return null;
  if (window.__accountData?.role) {
    return window.__accountData.role;
  }
  const storedRoleData = localStorage.getItem("role");
  if (!storedRoleData || storedRoleData === "undefined" || storedRoleData === "null") {
    return null;
  }
  try {
    return JSON.parse(storedRoleData);
  } catch (e) {
    localStorage.removeItem("role");
    return null;
  }
};

const getPermissionArray = () => {
  if (ISSERVER) return [];
  if (window.__accountData?.permissions) {
    return window.__accountData.permissions || [];
  }
  const stored = localStorage.getItem("account");
  if (!stored || stored === "undefined" || stored === "null") {
    return [];
  }
  try {
    return JSON.parse(stored)?.permissions || [];
  } catch (e) {
    localStorage.removeItem("account");
    return [];
  }
};

export function checkPermission(dynamicValue) {
  const storedRole = getStoredRole();
  const permissionArrayList = getPermissionArray();

  if (storedRole?.name === "admin") {
    return true;
  }
  if (storedRole?.name === "shop_manager") {
    // Prefixes shop_manager is allowed to access
    const allowedPrefixes = [
      "product.", "category.", "attribute.", "tag.", "brand.",
      "order.", "attachment.", "coupon.",
      "story.", "page.", "faq.",
      "shipping.", "refund.", "exchange.",
    ];
    const isAllowed = (perm) => allowedPrefixes.some((p) => perm.startsWith(p));
    if (typeof dynamicValue === "string") {
      return isAllowed(dynamicValue);
    }
    if (Array.isArray(dynamicValue)) {
      return dynamicValue.some((value) => isAllowed(value));
    }
  }

  if (ORDERS_ONLY_ROLES.includes(storedRole?.name)) {
    const isAllowed = (perm) =>
      ORDERS_ONLY_ALLOWED_PREFIXES.some((prefix) => perm?.startsWith?.(prefix));

    if (typeof dynamicValue === "string") {
      return isAllowed(dynamicValue);
    }

    if (Array.isArray(dynamicValue)) {
      return dynamicValue.some((value) => isAllowed(value));
    }
  }

  if (typeof dynamicValue === "string") {
    return permissionArrayList?.some((obj) => obj.name === dynamicValue);
  } else if (Array.isArray(dynamicValue)) {
    return dynamicValue.every((value) =>
      permissionArrayList.some((obj) => obj.name === value)
    );
  } else {
    return false;
  }
}
