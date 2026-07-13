import { useEffect, useState } from "react";
import { Input, Label, Spinner } from "reactstrap";
import { useSettings } from "@/utils/hooks/useSettings";
import useAxios from "@/utils/api/helpers/useAxios";
import Cookies from "js-cookie";
import { useTranslation } from "react-i18next";

const PointWallet = ({ values, setFieldValue, cartTotal }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const axios = useAxios();
  const [balance, setBalance] = useState(0);
  const [currencyRatio, setCurrencyRatio] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const isLoggedIn = !!Cookies.get("uat");
  const pointsEnabled = settingData?.activation?.point_enable !== false;

  // Fetch points balance on mount
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchBalance = async () => {
      try {
        const res = await axios.get("/points");
        const data = res?.data?.data;
        if (data) {
          setBalance(data.balance || 0);
          setCurrencyRatio(data.settings?.currency_ratio || 0);
        }
      } catch (err) {
        console.error("Failed to fetch points balance:", err);
      }
    };
    fetchBalance();
  }, [isLoggedIn]);

  // Recalculate when cart total changes while points are applied
  useEffect(() => {
    if (checked && cartTotal > 0) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotal, checked]);

  const handleCalculate = async () => {
    if (!isLoggedIn || balance <= 0 || !cartTotal) return;
    setLoading(true);
    try {
      const res = await axios.post("/points/calculate", {
        points_to_use: balance,
        order_total: cartTotal,
      });
      const data = res?.data?.data;
      if (data) {
        setFieldValue("points_amount", data.allowed_discount_value || 0);
        setFieldValue("points_to_use", data.applied_points || 0);
      }
    } catch (err) {
      console.error("Failed to calculate points:", err);
      setFieldValue("points_amount", 0);
      setFieldValue("points_to_use", 0);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (checked) {
      // Turn off
      setChecked(false);
      setFieldValue("points_amount", 0);
      setFieldValue("points_to_use", 0);
    } else {
      // Turn on
      setChecked(true);
      await handleCalculate();
    }
  };

  if (!pointsEnabled || !isLoggedIn || balance <= 0) return null;

  const balanceInAED = currencyRatio > 0 ? (balance * currencyRatio).toFixed(2) : "0.00";
  const appliedDiscount = Number(values["points_amount"]) || 0;

  return (
    <>
      <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          {t("Points")}
          <small className="text-muted d-block">
            {balance} {t("pts")} = {balanceInAED} AED
          </small>
        </span>
        <span className={`count ${checked ? "fw-bold txt-primary" : "text-muted"}`}>
          {checked && appliedDiscount > 0 ? `-${appliedDiscount.toFixed(2)} AED` : `${balanceInAED} AED`}
        </span>
      </li>
      <li className="border-cls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label className="form-check-label m-0">{t("Wouldyouprefertopayusingpoints")}</Label>
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <Input
            type="checkbox"
            className="checkbox_animated check-it"
            checked={checked}
            onChange={handleToggle}
          />
        )}
      </li>
    </>
  );
};

export default PointWallet;
