import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import request from "../axiosUtils";
import { selfData } from "../axiosUtils/API";
import ConvertPermissionArr from "../customFunctions/ConvertPermissionArr";
import useCustomQuery from "./useCustomQuery";
import {
  getStoredAdminRoleName,
  hasOrderAdminAccess,
  isOrdersOnlyAdminRole,
} from "../customFunctions/adminRoles";

const resolveRoleFallbackPermission = (permissionType, moduleToSearch, roleName) => {
  if (!roleName || roleName === "admin" || roleName === "shop_manager") {
    return true;
  }

  if (isOrdersOnlyAdminRole(roleName)) {
    if (moduleToSearch !== "order") {
      return false;
    }

    if (permissionType === "create" || permissionType === "destroy") {
      return false;
    }

    return hasOrderAdminAccess(roleName);
  }

  return false;
};

const usePermissionCheck = (permissionTypeArr, keyToSearch) => {
  const path = usePathname();
  const moduleToSearch = keyToSearch ? keyToSearch : path.split("/")[1];
  const getFallbackPermissions = () => {
    const roleName = getStoredAdminRoleName();
    return permissionTypeArr.map((permissionType) =>
      resolveRoleFallbackPermission(permissionType, moduleToSearch, roleName)
    );
  };

  const [ansData, setAnsData] = useState(() => getFallbackPermissions());
  const { data, isLoading } = useCustomQuery([selfData], () => request({ url: selfData }), {
    enabled: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    const roleName = getStoredAdminRoleName();

    if (isOrdersOnlyAdminRole(roleName)) {
      setAnsData(getFallbackPermissions());
      return;
    }

    if (data?.data?.permission) {
      const securePaths = ConvertPermissionArr(data?.data?.permission);
      setAnsData(
        permissionTypeArr.map((permissionType) => {
          const hasExplicitPermission = Boolean(
            securePaths
              ?.find((permission) => moduleToSearch == permission.name)
              ?.permissionsArr.find((permission) => permission.type == permissionType)
          );

          return hasExplicitPermission || resolveRoleFallbackPermission(permissionType, moduleToSearch, roleName);
        })
      );
      return;
    }

    setAnsData(getFallbackPermissions());
  }, [isLoading, data, moduleToSearch, keyToSearch]);

  return ansData;
};

export default usePermissionCheck;
