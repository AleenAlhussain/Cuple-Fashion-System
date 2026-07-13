import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState, useContext } from 'react';
import SettingContext from '.';
import { updateSetting } from '../../utils/axiosUtils/API';
import request from '../../utils/axiosUtils';
import { settingReducer } from '../../utils/allReducers';
import { useRouter } from 'next/navigation';
import useCustomQuery from '@/utils/hooks/useCustomQuery';
import AccountContext from '../accountContext';
import { useCookies } from 'react-cookie';

const safeJsonParse = (val) => {
    if (!val) return null;
    if (typeof val === "object") return val;
    if (typeof val !== "string") return val;
    try {
        return JSON.parse(val);
    } catch {
        return val;
    }
};
const SettingProvider = (props) => {
    const [currencySymbol, setCurrencySymbol] = useState('')
    const [settingObj, setSettingObj] = useState({})
    const [searchSidebarMenu, setSearchSidebarMenu] = useState([]);
    const router = useRouter();
    const [cookies] = useCookies(["uat"]);
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [state, dispatch] = useReducer(settingReducer, { setFavicon: "", setLogo: "", setResponsiveImage: "", setTitle: "", setTagline: "", isMultiVendor: false, setDelivery: {}, setCopyRight: "", setDarkLight: "", setDarkLogo: "", setLightLogo: "", setTinyLogo: "" })
    const { role } = useContext(AccountContext);
    const storedRoleName = useMemo(() => {
        if (typeof window === "undefined") return "";
        try {
            const storedRole = localStorage.getItem("role");
            const parsedRole = storedRole ? JSON.parse(storedRole) : null;
            return parsedRole?.name || parsedRole || "";
        } catch {
            return "";
        }
    }, []);
    const roleName = useMemo(() => {
        if (!role) return storedRoleName;
        if (typeof role === "string") return role;
        return role?.name || storedRoleName;
    }, [role, storedRoleName]);
    const hasFetchedSettingsRef = useRef(false);
    const { data, isLoading, refetch } = useCustomQuery([updateSetting], () => request({ url: updateSetting }, router), {
        enabled: false, refetchOnWindowFocus: false, select: (res) => res?.data
    });
    useEffect(() => {
        if (typeof refetch !== "function") return;
        // Must have both a role AND a valid token to fetch settings
        if (!roleName) return;
        if (!cookies.uat) return;
        if (hasFetchedSettingsRef.current) return;
        refetch();
        hasFetchedSettingsRef.current = true;
    }, [refetch, roleName, cookies.uat]);
    useEffect(() => {
        if (!data) return;

        // data = res.data (حسب select عندك)
        const settings = data?.data || data?.values || data;

        // إذا values داخل settings هي JSON string، ندمجها (اختياري بس مفيد)
        const parsedValues = safeJsonParse(settings?.values) || {};

        setSettingObj({
            ...settings,
            ...parsedValues,           // يضيف general/maintenance/email لو موجودة داخل values
            general: {
                ...(parsedValues?.general || {}),
                ...(settings?.general || {}),
            },
        });
    }, [data]);


    const convertCurrency = useCallback((value, currency = null, format = false) => {
        if (value === null || value === undefined || value === "") return "";

        let amount = Number(value);
        const rate = settingObj?.general?.default_currency?.exchange_rate || 1;
        amount = amount * rate;

        // 1) الرمز الافتراضي
        let symbol = "AED"; // default

        // 2) لو العملة جاية من المنتج نفسه (مثل tableData.currency)
        if (currency === "SAR") symbol = "SAR";
        if (currency === "AED") symbol = "AED";

        // 3) لو ما في currency، نستخدم إعداد لوحة التحكم
        if (!currency) {
            let backendSymbol = settingObj?.general?.default_currency?.symbol;

            if (backendSymbol === "SAR") symbol = "SAR";
            if (backendSymbol === "AED") symbol = "AED";

            // لو الـ backend لسا يرسل "$" نحوله لـ AED
            if (backendSymbol === "$") symbol = "AED";
        }

        // 4) تنسيق الرقم
        amount = format
            ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : amount.toFixed(2);

        // 5) الشكل النهائي: AED 15.00 أو SAR 15.00
        return `${symbol} ${amount}`;
    }, [settingObj]);




    useEffect(() => {
        if (!data) return;

        // ✅ response أحيانًا يكون {success, data:{...}} أو {values:{...}}
        const settings = data?.data || data?.values || {};

        // ✅ values أحيانًا تكون JSON string
        const parsedValues = safeJsonParse(settings?.values) || {};
        const general = parsedValues?.general || settings?.general || {};
        const generalLightLogo = safeJsonParse(general?.light_logo_image);
        const generalDarkLogo = safeJsonParse(general?.dark_logo_image);
        const generalTinyLogo = safeJsonParse(general?.tiny_logo_image);
        const generalFavicon = safeJsonParse(general?.favicon_image);

        // ✅ logos جايين JSON string (top-level)
        const lightLogo =
            safeJsonParse(settings?.light_logo_image) ||
            safeJsonParse(parsedValues?.light_logo_image) ||
            generalLightLogo;
        const darkLogo =
            safeJsonParse(settings?.dark_logo_image) ||
            safeJsonParse(parsedValues?.dark_logo_image) ||
            generalDarkLogo;
        const tinyLogo =
            safeJsonParse(settings?.tiny_logo_image) ||
            safeJsonParse(parsedValues?.tiny_logo_image) ||
            generalTinyLogo;
        const favicon =
            safeJsonParse(settings?.favicon_image) ||
            safeJsonParse(parsedValues?.favicon_image) ||
            generalFavicon;

        // ✅ UI settings
        if (general?.mode === "dark-only") document.body.classList.add("dark-only");
        else document.body.classList.remove("dark-only");

        // RTL direction is now driven by the selected language (i18n-context.jsx syncRtl).
        // Removed: document.documentElement.dir override from backend settings.

        // ✅ currency (إذا موجود)
        if (!isLoading) setCurrencySymbol(general?.default_currency?.symbol);

        // ✅ dispatch
        dispatch({
            type: "SETTINGIMAGE",
            darkLogo,
            lightLogo,
            tinyLogo,
            favicon,
            title: general?.site_title || settings?.site_title,
            tagline: general?.site_tagline,
            multiVendor: Boolean((settings?.activation || parsedValues?.activation)?.multivendor),
            delivery: settings?.delivery || parsedValues?.delivery,
            copyRight: general?.copyright,
            darkLight: general?.mode,
        });
    }, [data, isLoading]);


    return (
        <SettingContext.Provider value={{ ...props, sidebarOpen, setSidebarOpen, currencySymbol, setCurrencySymbol, state, dispatch, searchSidebarMenu, setSearchSidebarMenu, convertCurrency, settingObj, setSettingObj, refetch }}>
            {props.children}
        </SettingContext.Provider>
    )
}

export default SettingProvider
