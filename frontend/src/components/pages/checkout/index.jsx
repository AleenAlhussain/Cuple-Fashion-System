"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import { useAuthState, useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";
import useAxios from "@/utils/api/helpers/useAxios";
import { AddressAPI, AddToCartAPI } from "@/utils/api";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import useCreate from "@/utils/hooks/useCreate";
import { emailSchema, idCreateAccount, idCreateAccountConfirm, nameSchema, optionalNameSchema, phoneSchema } from "@/utils/validation/ValidationSchema";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { Form, Formik } from "formik";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { Fragment, useContext, useEffect, useState } from "react";
import { Col, Row } from "reactstrap";
import * as Yup from "yup";
import CheckoutForm from "./CheckoutForm";
import CheckoutSidebar from "./checkoutSidebar";
import DeliveryAddress from "./DeliveryAddress";
import PaymentOptions from "./PaymentOptions";
import { STRIPE_PAYMENT_METHODS } from "./StripePaymentForm";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const CheckoutContent = () => {
  const user = useAuthState((state) => state.user);
  const refetchAuth = useAuthState((state) => state.refetch);
  const { settingData } = useSettings();
  const cart = useCartState((state) => state.cart);
  const cartTotal = useCartState((state) => state.cartTotal);
  const [address, setAddress] = useState([]);
  const [modal, setModal] = useState("");
  const router = useRouter();
  const axios = useAxios();
  const [accessToken, setAccessToken] = useState(null);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [stripeConfirmHandler, setStripeConfirmHandler] = useState({ handler: null });

  useEffect(() => {
    const token = Cookies.get("uat");
    setAccessToken(token);
  }, []);

  useEffect(() => {
    if (user?.address?.length > 0) {
      setAddress([...user.address]);
    }
  }, [user]);

  const { mutate, isLoading } = useCreate(
    AddressAPI,
    false,
    false,
    "Address Added successfully",
    () => {
      setModal("");
      // Refresh auth state - the useEffect will update addresses from user.address
      refetchAuth();
    },
    false, // notHandler
    null,  // setCouponError
    null,  // refetch
    null,  // setShowBoxMessage
    null,  // responseType
    (err) => {
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to add address";
      ToastNotification("error", errorMessage);
      console.error("Address API Error:", err?.response?.data || err);
    }
  );

  // Use cart from state instead of API call
  const addToCartData = { items: cart, is_digital_only: false };

  const { isLoading: themeLoad, setCartCanvas } = useContext(ThemeOptionContext);

  // Guard checkout route from sticky UI classes that can overlap content/footer.
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.add("checkout-route");
    document.body.classList.remove("stickyCart");
    document.body.classList.remove("cart-open");
    setCartCanvas?.(false);

    return () => {
      document.body.classList.remove("checkout-route");
      document.body.classList.remove("stickyCart");
      document.body.classList.remove("cart-open");
    };
  }, [setCartCanvas]);

  const addressSchema = Yup.object().shape({
    street: nameSchema,
    city: nameSchema,
    country_id: nameSchema,
    state: optionalNameSchema,
  });

  if (themeLoad) return <Loader />;
  return (
    <Fragment>
      <Breadcrumbs title={"Checkout"} subNavigation={[{ name: "Checkout" }]} />
      <WrapperComponent classes={{ sectionClass: "section-b-space checkout-section-2", fluidClass: "container" }} noRowCol={true}>
        <div className="checkout-page checkout-form">
          <Formik
            initialValues={{
              products: [],
              shipping_address_id: "",
              billing_address_id: "",
              country_id: 1, // Default UAE, will be updated when address is selected
              points_amount: 0,
              points_to_use: 0,
              wallet_balance: "",
              coupon: "",
              delivery_description: "",
              delivery_interval: "",
              payment_method: "",
              create_account: false,
              name: "",
              email: "",
              country_code: "971",
              phone: "",
              password: "",
              password_confirmation: "",
              billing_address: {
                street: "",
                city: "",
                country_id: "",
                state: "",
                postal_code: "",
                latitude: "",
                longitude: "",
              },
              stripe_payment_intent_id: "",
              stripe_client_secret: "",
            }}
            validationSchema={Yup.object().shape({
              name: nameSchema,
              email: emailSchema,
              phone: phoneSchema,
              password: idCreateAccount,
              password_confirmation: idCreateAccountConfirm,
              billing_address: addressSchema,
            })}
            onSubmit={mutate}
          >
            {({ values, setFieldValue, errors }) => {
              const stripeActive = STRIPE_PAYMENT_METHODS.includes(values["payment_method"]);
              const shippingCountryId = values["billing_address"]?.country_id || values["country_id"];
              const paymentMethod = values["payment_method"] || "";
              const itemsQuantity = (cart || []).reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
              const { data: shippingData, isFetching: shippingLoading } = useFetchQuery(
                ["shipping-calc", shippingCountryId, cartTotal, paymentMethod, itemsQuantity],
                async () => {
                  const response = await axios.post("/shipping/calculate", {
                    country_id: shippingCountryId,
                    subtotal: cartTotal,
                    items_quantity: itemsQuantity,
                    payment_method: paymentMethod || null,
                  });
                  return response?.data?.data ?? { shipping_amount: 0 };
                },
                {
                  refetchOnWindowFocus: false,
                  staleTime: 1000 * 60 * 5,
                  enabled: Boolean(shippingCountryId && cartTotal > 0 && itemsQuantity > 0),
                }
              );
              const shippingAmount = Number(shippingData?.shipping_amount ?? 0) || 0;
              const shippingLabel = shippingData?.rule?.name ?? shippingData?.zone?.name ?? "";
              const shippingDescription = shippingData?.rule?.description ?? "";
              const paymentFee = Number(shippingData?.payment_fee ?? 0) || 0;
              return (
                <Form className="checkout-form">
                  <Row className="g-sm-4 g-3">
                    <Col lg="7">
                      <div className="left-sidebar-checkout">
                        <div className="checkout-detail-box">
                          {settingData?.activation?.guest_checkout && !accessToken && (
                            <div className="checkout-form-section">
                              <CheckoutForm
                                values={values}
                                setFieldValue={setFieldValue}
                                errors={errors}
                                emailExists={emailExists}
                                setEmailExists={setEmailExists}
                                checkingEmail={checkingEmail}
                                setCheckingEmail={setCheckingEmail}
                                onStripeReady={(handler) => {
                                  setStripeConfirmHandler({ handler });
                                }}
                              />
                            </div>
                          )}
                          {accessToken && (
                            <div className="checkout-detail-box">
                              <ul>
                                <DeliveryAddress key="billing" type="billing" title={"BillingAddress"} values={values} updateId={values["consumer_id"]} setFieldValue={setFieldValue} address={address} modal={modal} mutate={mutate} isLoading={isLoading} setModal={setModal} />
                                <PaymentOptions values={values} setFieldValue={setFieldValue} cartTotal={cartTotal + shippingAmount} onStripeReady={(handler) => {
                                  setStripeConfirmHandler({ handler });
                                }} />
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </Col>
                    <CheckoutSidebar
                      addToCartData={addToCartData}
                      values={values}
                      setFieldValue={setFieldValue}
                      errors={errors}
                      emailExists={emailExists}
                      checkingEmail={checkingEmail}
                      stripeConfirmHandler={stripeConfirmHandler}
                      isStripeActive={stripeActive}
                      shippingAmount={shippingAmount}
                      shippingLabel={shippingLabel}
                      shippingDescription={shippingDescription}
                      shippingLoading={shippingLoading}
                      paymentFee={paymentFee}
                      paymentMethod={paymentMethod}
                      />
                  </Row>
                </Form>
              );
            }}
          </Formik>
        </div>
      </WrapperComponent>
    </Fragment>
  );
};

export default CheckoutContent;
