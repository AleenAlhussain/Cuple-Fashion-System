import React, { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie';
import AccountContext from '.'
import request from '../../utils/axiosUtils';
import { selfData } from '../../utils/axiosUtils/API';
import useCustomQuery from '@/utils/hooks/useCustomQuery';

const AccountProvider = (props) => {
    const [cookies] = useCookies(["uat"]);
    const [role, setRole] = useState('');
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const { data, isLoading, isFetching, isSuccess, isError, refetch } = useCustomQuery(
        [selfData],
        () => request({ url: selfData }),
        {
            enabled: Boolean(cookies.uat),
            refetchOnWindowFocus: false,
            select: (res) => res?.data?.data,
        }
    );
    const [accountData, setAccountData] = useState(null);
    const [accountContextData, setAccountContextData] = useState({
        name: "",
        image: {}
    })

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.__accountData = data || null;
        }
        if (data) {
            localStorage.setItem("account", JSON.stringify(data));
            localStorage.setItem("role", JSON.stringify(data?.role));
            setRole(data?.role?.name || "");
        }
        setAccountData(data || null);
    }, [data]);

    useEffect(() => {
        if (cookies.uat) {
            refetch();
        } else {
            setAccountData(null);
            setRole("");
        }
    }, [cookies.uat, refetch]);

    useEffect(() => {
        if (!cookies.uat) {
            setIsAuthLoading(false);
            return;
        }
        setIsAuthLoading(isLoading || isFetching);
    }, [cookies.uat, isLoading, isFetching, isSuccess, isError]);

    return (
        <AccountContext.Provider value={{ ...props, accountData, setAccountData, accountContextData, setAccountContextData, role, setRole, isAuthLoading }}>
            {props.children}
        </AccountContext.Provider>
    )
}
export default AccountProvider
