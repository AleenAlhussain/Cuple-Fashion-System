import { useSettings } from "@/utils/hooks/useSettings";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Col, Row } from "reactstrap";

const PAYMENT_METHOD_KEYS = {
  cod: "CashOnDelivery",
  cash_on_delivery: "CashOnDelivery",
  stripe_card: "CreditDebitCards",
  apple_pay: "ApplePay",
  google_pay: "GooglePay",
  tabby: "PayWithTabby",
  tamara: "PayWithTamara",
};

const PAYMENT_STATUS_KEYS = {
  paid: "Paid",
  pending: "Pending",
  unpaid: "Unpaid",
  failed: "Failed",
  refunded: "Refunded",
};

const DetailsConsumer = ({ data }) => {
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { t } = useTranslation("common");

  const getPaymentMethodLabel = (method) => {
    const key = PAYMENT_METHOD_KEYS[method?.toLowerCase()];
    return key ? t(key) : method;
  };

  const getPaymentStatusLabel = (status) => {
    const key = PAYMENT_STATUS_KEYS[status?.toLowerCase()];
    return key ? t(key) : status;
  };

  return (
    <>
      <div className="summary-details my-3">
        <Row className="g-sm-4 g-3">
          <Col xxl={8} lg={12} md={7}>
            <Card>
              <CardBody>
                <h3 className="order-title">{t("ConsumerDetails")}</h3>
                <div className="customer-detail tracking-wrapper">
                  <ul className="row g-3">
                    {data?.billing_address ? (
                      <li className="col-sm-6">
                        <label>{t("BillingAddress")}:</label>
                        <h4>
                          {data.billing_address.street} {data.billing_address.city} {data.billing_address.state?.name} {data.billing_address.country?.name} {data.billing_address.pincode} <br></br>
                          {t("Phone")} : +{data?.billing_address?.country_code} {data.billing_address.phone}
                        </h4>
                      </li>
                    ) : null}
                    {data?.shipping_address ? (
                      <li className="col-sm-6">
                        <label>{t("ShippingAddress")}:</label>
                        <h4>
                          {data.shipping_address.street} {data.shipping_address.city} {data.shipping_address.state?.name} {data.shipping_address.country?.name} {data.shipping_address.pincode} <br></br>
                          {t("Phone")} : +{data.shipping_address.country_code} {data.shipping_address.phone}
                        </h4>
                      </li>
                    ) : null}
                    {data?.delivery_description ? (
                      <li className="col-sm-6">
                        <label>{t("DeliverySlot")}:</label>
                        <h4>{data.delivery_description}</h4>
                      </li>
                    ) : null}
                    {data?.payment_method ? (
                      <li className="col-3">
                        <label>{t("PaymentMode")}:</label>
                        <div className="d-flex align-items-center gap-2">
                          <h4>{getPaymentMethodLabel(data.payment_method)}</h4>
                        </div>
                      </li>
                    ) : null}
                    {data?.payment_status ? (
                      <li className="col-3">
                        <label>{t("PaymentStatus")}:</label>
                        <div className="d-flex align-items-center gap-2">
                          <h4>{getPaymentStatusLabel(data.payment_status)}</h4>
                        </div>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col xxl={4} lg={12} md={5}>
            <Card className="h-m30">
              <CardBody>
                <h3 className="order-title">{t("Summary")}</h3>
                <div className="tracking-total tracking-wrapper">
                  <ul>
                    <li>
                      {t("Subtotal")} <span>{data?.amount ? convertCurrency(data?.amount) : convertCurrency(0)}</span>
                    </li>
                    {data && !data?.is_digital_only && (
                      <li>
                        {t("Shipping")} <span>{data?.shipping_total ? convertCurrency(data?.shipping_total) : convertCurrency(0)}</span>
                      </li>
                    )}
                    <li>
                      {t("Tax")} <span>{data?.tax_total ? convertCurrency(data?.tax_total) : convertCurrency(0)}</span>
                    </li>
                    {data?.coupon_total_discount > 0 && (
                      <li className="text-success">
                        {t("CouponDiscount")} <span className="text-success">-{convertCurrency(data?.coupon_total_discount)}</span>
                      </li>
                    )}
                    {data?.rule_discount_amount > 0 && (
                      <li className="text-success">
                        {data?.rule_discount_name || t("Discount")} <span className="text-success">-{convertCurrency(data?.rule_discount_amount)}</span>
                      </li>
                    )}
                    {data?.points_amount != 0 ? (
                      <li className="txt-primary fw-bold">
                        {t("Points")} <span>{data?.points_amount}</span>
                      </li>
                    ) : null}
                    {data?.wallet_balance != 0 ? (
                      <li className="txt-primary fw-bold">
                        {t("WalletBalance")}
                        <span>{convertCurrency(data?.wallet_balance)}</span>
                      </li>
                    ) : null}
                    {(data?.coupon_total_discount > 0 || data?.rule_discount_amount > 0) && (
                      <li className="text-success fw-bold">
                        {t("YouSave")} <span className="text-success">{convertCurrency((data?.coupon_total_discount || 0) + (data?.rule_discount_amount || 0))}</span>
                      </li>
                    )}
                    <li>
                      {t("Total")} <span>{data?.total ? convertCurrency(data?.total) : convertCurrency(0)}</span>
                    </li>
                  </ul>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default DetailsConsumer;
