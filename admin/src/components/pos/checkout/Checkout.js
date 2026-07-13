import React, { useEffect, useState } from "react";
import { Col, Row } from "reactstrap";
import { Form, Formik, useFormikContext } from "formik";
import DeliveryOptions from "./DeliveryOptions";
import PaymentOptions from "./PaymentOptions";
import SelectCustomer from "./SelectCustomer";
import DeliveryAddress from "./DeliveryAddress";
import CheckoutSidebar from "./CheckoutSidebar";
import CheckoutSummary from "./CheckoutSummary";
import { AddtoCartAPI, user } from "../../../utils/axiosUtils/API";
import request from "../../../utils/axiosUtils";
import Loader from "../../commonComponent/Loader";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { Input, Label } from "reactstrap";

const BillingSync = ({ enabled }) => {
  const { values, setFieldValue } = useFormikContext();
  useEffect(() => {
    if (enabled) {
      setFieldValue("billing_address_id", values["shipping_address_id"] || "");
    } else {
      setFieldValue("billing_address_id", "");
    }
  }, [enabled, values["shipping_address_id"]]);
  return null;
};

const Checkout = ({ loading, mutate, data, errorCoupon, setAppliedCoupon, appliedCoupon, storeCoupon, setStoreCoupon }) => {
  const [search, setSearch] = useState(false);
  const [customSearch, setCustomSearch] = useState("")
  const router = useRouter()
  const [tc, setTc] = useState(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  // Initial Value for checkout
  const [initValues, setInitValues] = useState(
    { products: [], consumer_id: "", billing_address_id: "", shipping_address_id: "", shipping_total: 0, total: 0, coupon: "", wallet_balance: false, points_amount: false, delivery_description: "", delivery_interval: "", isTimeSlot: false, payment_method: "", isPoint: "", isWallet: "" });
  // Calling Add to Cart API
  const { data: addToCartData, isLoading: addToCartLoader, refetch } = useCustomQuery(
    [AddtoCartAPI],
    () => request({ url: AddtoCartAPI }, router),
    { refetchOnWindowFocus: false, cacheTime: 0, select: (res) => res?.data?.data }
  );
  // Getting Users data (smart search handled by backend)
  const { data: userData, refetch: userRefetch } = useCustomQuery(
    [user, customSearch],
    () => request({ url: user, params: { role: 'customer', status: 1, paginate: 15, search: customSearch ? customSearch : "" } }, router),
    { enabled: true, refetchOnWindowFocus: false, select: (data) => data.data.data }
  );

  useEffect(() => {
    refetch();
  }, [])

  useEffect(() => {
    if (addToCartData) {
      setInitValues((prevValues) => ({
        ...prevValues,
        products: addToCartData.items || [],
        total: addToCartData.total || null,
        address: prevValues.address || {},
      }));
    }
  }, [addToCartData, setInitValues]);

  useEffect(() => {
    refetch();
  }, [initValues.products])
  useEffect(() => {
    // query key already includes customSearch; keep refetch for explicit refreshes (e.g., after creating user)
    if (!customSearch) return;
    userRefetch();
  }, [customSearch]);

  // Added debouncing
  useEffect(() => {
    if (tc) clearTimeout(tc);
    setTc(setTimeout(() => setCustomSearch(search), 500));
  }, [search])

  if (addToCartLoader) return <Loader />
  return (
    <Formik
      enableReinitialize
      initialValues={initValues}
    >
      {({ values, setFieldValue }) => (
        <Form>
          <BillingSync enabled={billingSameAsShipping} />
          <div className="pb-4 checkout-section-2">
            <Row className="g-sm-4 g-3">
              <Col xxl="8">
                <div className="left-sidebar-checkout">
                  <div className="checkout-detail-box">
                    <ul>
                      <SelectCustomer values={values} mutate={mutate} setFieldValue={setFieldValue} userData={userData} userRefetch={userRefetch} setSearch={setSearch} />
                      {!addToCartData?.is_digital_only && <DeliveryAddress type="shipping" title={"Shipping"} values={values} updateId={values["consumer_id"]} setFieldValue={setFieldValue} />}
                      <li className="mb-3">
                        <div className="form-check">
                          <Input
                            className="form-check-input"
                            type="checkbox"
                            id="billing-same-as-shipping"
                            checked={billingSameAsShipping}
                            onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                          />
                          <Label className="form-check-label" htmlFor="billing-same-as-shipping">
                            Billing same as Shipping
                          </Label>
                        </div>
                      </li>
                      {!billingSameAsShipping && (
                        <DeliveryAddress type="billing" title={"Billing"} values={values} updateId={values["consumer_id"]} setFieldValue={setFieldValue} />
                      )}
                      {!addToCartData?.is_digital_only && <DeliveryOptions values={values} setFieldValue={setFieldValue} />}
                      <PaymentOptions values={values} setFieldValue={setFieldValue} />
                    </ul>
                  </div>
                </div>
              </Col>

              <Col xxl="4">
                <div className="checkout-right-box mb-0">
                  <CheckoutSidebar addToCartData={addToCartData} errorCoupon={errorCoupon} values={values} setFieldValue={setFieldValue} data={data} loading={loading} mutate={mutate} userData={userData} appliedCoupon={appliedCoupon} setAppliedCoupon={setAppliedCoupon} storeCoupon={storeCoupon} setStoreCoupon={setStoreCoupon} />
                  <CheckoutSummary addToCartData={addToCartData} errorCoupon={errorCoupon} values={values} setFieldValue={setFieldValue} data={data} loading={loading} mutate={mutate} userData={userData} appliedCoupon={appliedCoupon} setAppliedCoupon={setAppliedCoupon} storeCoupon={storeCoupon} setStoreCoupon={setStoreCoupon} />
                </div>
              </Col>
            </Row>
          </div>
        </Form>
      )}
    </Formik >
  );
};

export default Checkout;
