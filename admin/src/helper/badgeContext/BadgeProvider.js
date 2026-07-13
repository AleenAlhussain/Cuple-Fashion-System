import { useReducer } from "react";
import { useCookies } from "react-cookie";
import React, { useEffect, useState } from "react";
import { settingReducer } from "../../utils/allReducers";
import request from "../../utils/axiosUtils";
import { BadgeApi } from "../../utils/axiosUtils/API";
import BadgeContext from ".";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { getStoredAdminRoleName, isOrdersOnlyAdminRole } from "@/utils/customFunctions/adminRoles";

const BadgeProvider = (props) => {
    const [cookies] = useCookies(["uat"]);
    const [state, dispatch] = useReducer(settingReducer, { badges: [], notification: "" })
    const [notification, setNotification] = useState("")
    const router = useRouter();
    const roleName = getStoredAdminRoleName();
    const shouldFetchBadges = Boolean(cookies.uat) && !isOrdersOnlyAdminRole(roleName);
    const { data, isLoading, refetch } = useCustomQuery([BadgeApi], () => request({ url: BadgeApi },router), {
        enabled: false, select: (res) => res?.data
    });
    useEffect(() => {
        if (!shouldFetchBadges) {
            dispatch({ type: "ALLBADGE", allBadges: [] });
            return;
        }
        refetch()
    }, [shouldFetchBadges, refetch])

    useEffect(() => {
        if (data) {
            dispatch({
                type: "ALLBADGE",
                allBadges: [
                    { path: "/product", value: data?.product?.total_in_approved_products, subKey: ["product", "total_in_approved_products"] },
                    { path: "/store", value: data?.store?.total_in_approved_stores, subKey: ["store", "total_in_approved_stores"] },
                    { path: "/refund", value: data?.refund?.total_pending_refunds, subKey: ["refund", "total_pending_refunds"] },
                    { path: "/withdraw_request", value: data?.withdraw_request?.total_pending_withdraw_requests, subKey: ["withdraw_request", "total_pending_withdraw_requests"] },
                ],
            })
        }
    }, [isLoading])
    return (
        <BadgeContext.Provider value={{ state, dispatch, notification, setNotification, ...props }}>
            {props.children}
        </BadgeContext.Provider>
    )
}
export default BadgeProvider
