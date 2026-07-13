const ORDERS_ONLY_ROLES = ["stock_keeper", "accounting_team"];
const ORDER_ACCESS_ROLES = ["admin", "shop_manager", ...ORDERS_ONLY_ROLES];
const ORDER_MANAGEMENT_ROLES = ["admin", "shop_manager"];

const safeParse = (value) => {
  if (!value || value === "undefined" || value === "null") return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

export const getStoredAdminRoleName = () => {
  if (typeof window === "undefined") return "";

  const windowRole = window.__accountData?.role?.name || window.__accountData?.role;
  if (windowRole) return windowRole;

  const parsedRole = safeParse(localStorage.getItem("role"));
  if (typeof parsedRole === "string") return parsedRole;
  if (parsedRole?.name) return parsedRole.name;

  const parsedAccount = safeParse(localStorage.getItem("account"));
  if (parsedAccount?.role?.name) return parsedAccount.role.name;
  if (typeof parsedAccount?.role === "string") return parsedAccount.role;

  return "";
};

export const isOrdersOnlyAdminRole = (roleName = getStoredAdminRoleName()) =>
  ORDERS_ONLY_ROLES.includes(roleName);

export const hasOrderAdminAccess = (roleName = getStoredAdminRoleName()) =>
  ORDER_ACCESS_ROLES.includes(roleName);

export const canCreateAdminOrders = (roleName = getStoredAdminRoleName()) =>
  ORDER_MANAGEMENT_ROLES.includes(roleName);

export const canManageAdminOrders = (roleName = getStoredAdminRoleName()) =>
  ORDER_MANAGEMENT_ROLES.includes(roleName);

export const formatAdminRoleLabel = (roleName = "") => {
  switch (roleName) {
    case "admin":
      return "Administrator";
    case "shop_manager":
      return "Shop manager";
    case "stock_keeper":
      return "Stock keeper";
    case "accounting_team":
      return "Accounting team";
    case "customer":
      return "Customer";
    default:
      return roleName
        ? roleName.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
        : "Customer";
  }
};
