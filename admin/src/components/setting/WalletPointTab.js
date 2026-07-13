import { RiCopperDiamondLine } from 'react-icons/ri';
import SimpleInputField from '../inputFields/SimpleInputField';
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { useFormikContext } from "formik";
import request from "../../utils/axiosUtils";
import { setting } from "../../utils/axiosUtils/API";

const WalletPointTab = () => {

    const { t } = useTranslation('common');
    const { setFieldValue } = useFormikContext();
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (hasLoaded.current) return;
        hasLoaded.current = true;

        request({ url: setting, params: { group: "points" } })
            .then((res) => {
                const data = res?.data?.data || {};
                if (!data) return;
                setFieldValue("values.wallet_points.signup_points", data.signup_points ?? "");
                setFieldValue("values.wallet_points.reward_per_order_amount", data.reward_per_order_amount ?? "");
                setFieldValue("values.wallet_points.currency_ratio", data.currency_ratio ?? "");
                setFieldValue("values.wallet_points.max_redeem_percent", data.max_redeem_percent ?? "");
            })
            .catch(() => {
                // ignore fetch errors for settings tab
            });
    }, [setFieldValue]);

    return (
        <SimpleInputField
            nameList={[
                { name: "[values][wallet_points][signup_points]", type: 'number', title: "SignUpPoints", placeholder: t("EnterSignupPoints"), helpertext: "*Provide points to new users as a signup incentive." },
                { name: "[values][wallet_points][reward_per_order_amount]", inputaddon: "true", title: "RewardPerOrderAmount", placeholder: t("EnterRewardPerOrderAmount"), helpertext: "Points earned per 1 AED spent." },
                { name: "[values][wallet_points][currency_ratio]", title: "PointCurrencyRatio", inputaddon: "true", prefixvalue: <RiCopperDiamondLine />, placeholder: t("EnterPointCurrencyRatio"), helpertext: "Value of 1 point in AED." },
                { name: "[values][wallet_points][max_redeem_percent]", inputaddon: "true", title: "MaxRedeemPercentPerOrder", placeholder: t("EnterMaxRedeemPercentPerOrder"), helpertext: "Maximum discount from points as % of order amount." },
            ]}
        />
    )
}
export default WalletPointTab
