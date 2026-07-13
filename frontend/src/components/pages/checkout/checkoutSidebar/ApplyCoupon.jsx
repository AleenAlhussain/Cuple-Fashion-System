import { useSettings } from "@/utils/hooks/useSettings";
import Btn from "@/elements/buttons/Btn";
import { Href, ImagePath } from "@/utils/constants";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import Image from "next/image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RiCouponLine } from "react-icons/ri";
import { Col, Input, Row, Spinner } from "reactstrap";
import CouponModal from "./CouponModal";
import useAxios from "@/utils/api/helpers/useAxios";
import useFetchQuery from "@/utils/hooks/useFetchQuery";

const ApplyCoupon = ({
  data,
  setFieldValue,
  storeCoupon,
  setStoreCoupon,
  values,
  appliedCoupon,
  setAppliedCoupon,
  errorCoupon,
  setErrorCoupon,
  couponDiscount,
  setCouponDiscount,
  cartTotal
}) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const axios = useAxios();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const [toggle, setToggle] = useState(false);
  const [validating, setValidating] = useState(false);

  // Fetch available coupons with React Query caching
  const { data: couponData = [], isLoading: couponLoader } = useFetchQuery(
    ["coupons"],
    async () => {
      const res = await axios.get("/coupons");
      return res?.data?.data || [];
    },
    {
      staleTime: 1000 * 60 * 10, // Cache for 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  const onCouponApply = (value) => {
    setFieldValue("coupon", value);
    setStoreCoupon(value);
    // Clear any previous errors when user types
    if (setErrorCoupon) setErrorCoupon("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setFieldValue("coupon", "");
    setStoreCoupon("");
    if (setCouponDiscount) setCouponDiscount(0);
    if (setErrorCoupon) setErrorCoupon("");
    ToastNotification("info", "Coupon removed");
  };

  const onCouponApplyClick = async () => {
    if (!storeCoupon || storeCoupon.trim() === "") {
      if (setErrorCoupon) setErrorCoupon("Please enter a coupon code");
      return;
    }

    setValidating(true);
    if (setErrorCoupon) setErrorCoupon("");

    try {
      const res = await axios.post("/coupons/validate", {
        code: storeCoupon.trim(),
        subtotal: cartTotal || 0,
      });

      if (res?.data?.success && res?.data?.data) {
        const { coupon, discount, message } = res.data.data;
        setAppliedCoupon("applied");
        setFieldValue("coupon", storeCoupon);
        setFieldValue("coupon_id", coupon.id);
        if (setCouponDiscount) setCouponDiscount(discount);
        ToastNotification("success", message || "Coupon applied successfully!");
      } else {
        if (setErrorCoupon) setErrorCoupon(res?.data?.message || "Failed to apply coupon");
        ToastNotification("error", res?.data?.message || "Failed to apply coupon");
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.message || "Failed to validate coupon";
      if (setErrorCoupon) setErrorCoupon(errorMessage);
      ToastNotification("error", errorMessage);
    } finally {
      setValidating(false);
    }
  };

  const onCopyCode = (couponCode) => {
    navigator.clipboard.writeText(couponCode);
    ToastNotification("success", "Code copied to clipboard");
    setStoreCoupon(couponCode);
    setFieldValue("coupon", couponCode);
  };

  return (
    <div className="promo-code-box">
      <div className="promo-title">
        <h5>{t("PromoCode")}</h5>
        <a href={Href} onClick={() => setToggle(true)}>
          <RiCouponLine /> {t("ViewAll")}
        </a>
      </div>
      <Row className="g-sm-3 g-2 mb-3">
        {couponLoader ? (
          <Col className="text-center py-2">
            <Spinner size="sm" />
          </Col>
        ) : (
          couponData?.slice(0, 2).map((item, i) => (
            <Col xl="6" key={i}>
              <div className="coupon-box">
                <div className="card-name">
                  <h6>{item?.description || `Save ${item?.type === 'percentage' ? item?.value + '%' : item?.value}`}</h6>
                </div>
                <div className="coupon-content">
                  <div className="coupon-apply">
                    <h6 className="coupon-code success-color">#{item?.code}</h6>
                    <Btn color="transparent" title={"CopyCode"} className="theme-btn border-btn copy-btn mt-0" onClick={() => onCopyCode(item?.code)} />
                  </div>
                </div>
              </div>
            </Col>
          ))
        )}
      </Row>
      {appliedCoupon === "applied" ? (
        <div className="offer-apply-box">
          <Image src={`${ImagePath}/offer.gif`} className="img-fluid" height={20} width={20} alt="offer" />
          <div>
            <h4>
              {t("Yousaved")} <span>{convertCurrency(couponDiscount?.toFixed(2) || "0.00")}</span> {t("withthiscode")}
              <p>{t("CouponApplied")}: <strong>{storeCoupon}</strong></p>
            </h4>
          </div>
          <a style={{ cursor: "pointer" }} className="close-coupon" onClick={() => removeCoupon()}>
            {t("Remove")}
          </a>
        </div>
      ) : (
        <>
          <div className="coupon-input-box">
            <Input
              type="text"
              value={values['coupon'] || ''}
              placeholder={t("EnterCoupon")}
              onChange={(e) => onCouponApply(e.target.value)}
              className={errorCoupon ? "is-invalid" : ""}
            />
            <div>
              <Btn className="apply-button" onClick={onCouponApplyClick} disabled={validating}>
                {validating ? <Spinner size="sm" /> : t("ApplyNow")}
              </Btn>
            </div>
          </div>
          {errorCoupon && (
            <div className="text-danger mt-2" style={{ fontSize: '12px' }}>
              {errorCoupon}
            </div>
          )}
        </>
      )}
      <CouponModal couponData={couponData} onCopyCode={onCopyCode} toggle={toggle} setToggle={setToggle} />
    </div>
  );
};

export default ApplyCoupon;
