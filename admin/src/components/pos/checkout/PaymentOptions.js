import { useEffect, useMemo, useState } from "react";
import { Col, Input, Label, Row } from "reactstrap";
import { RiBankCardLine } from "react-icons/ri";
import CheckoutCard from "./common/CheckoutCard";
import { useTranslation } from "react-i18next";

const PAYMENT_OPTIONS = [
  { value: "cod", label: "Cash on delivery" },
  { value: "stripe_card", label: "Credit/Debit Cards" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "google_pay", label: "Google Pay" },
  { value: "tabby", label: "Pay later with Tabby" },
];

const PaymentOptions = ({ values, setFieldValue }) => {
  const { t } = useTranslation("common");

  const availablePaymentMethods = useMemo(() => PAYMENT_OPTIONS, []);

  const [selectedIndex, setSelectedIndex] = useState(() =>
    availablePaymentMethods.length ? 0 : null
  );

  useEffect(() => {
    if (!availablePaymentMethods.length) return;

    const currentValue = values?.payment_method;
    if (currentValue) {
      const matchIndex = availablePaymentMethods.findIndex((m) => m.value === currentValue);
      if (matchIndex !== -1 && matchIndex !== selectedIndex) {
        setSelectedIndex(matchIndex);
      }
      return;
    }

    if (selectedIndex === null) return;
    const method = availablePaymentMethods[selectedIndex];
    if (method?.value) {
      setFieldValue("payment_method", method.value);
    }
  }, [availablePaymentMethods, selectedIndex, setFieldValue, values?.payment_method]);

  const handleSelection = (index) => {
    setSelectedIndex(index);
    const method = availablePaymentMethods[index];
    if (method?.value) {
      setFieldValue("payment_method", method.value);
    }
  };

  const hasConsumer = Boolean(values["consumer_id"]);
  const hasMethods = availablePaymentMethods.length;

  const renderOptions = () =>
    availablePaymentMethods.map((method, index) => (
      <Col xxl={6} lg={6} key={method.value}>
        <div className="payment-option">
          <div className="payment-category w-100">
            <div className="form-check custom-form-check hide-check-box w-100">
              <Input
                className="form-check-input"
                type="radio"
                id={`payment-${method.value}`}
                name="payment_method"
                checked={selectedIndex === index}
                onChange={() => handleSelection(index)}
              />
              <Label className="form-check-label" htmlFor={`payment-${method.value}`}>
                {method.label}
              </Label>
            </div>
          </div>
        </div>
      </Col>
    ));

  const renderNoOptions = () => (
    <div className="empty-box w-100">
      <h2>{t("NoPaymentOptionFound")}</h2>
    </div>
  );

  return (
    <CheckoutCard icon={<RiBankCardLine />}>
      <div className="checkout-title">
        <h4>{t("PaymentOption")}</h4>
      </div>
      <div className="checkout-detail">
        {hasConsumer ? (
          hasMethods ? (
            <Row className="g-sm-4 g-3">{renderOptions()}</Row>
          ) : (
            renderNoOptions()
          )
        ) : (
          renderNoOptions()
        )}
      </div>
    </CheckoutCard>
  );
};

export default PaymentOptions;
