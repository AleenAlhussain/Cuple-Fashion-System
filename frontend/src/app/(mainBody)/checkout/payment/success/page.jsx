"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Row, Col, Spinner } from "reactstrap";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "react-icons/ri";
import useAxios from "@/utils/api/helpers/useAxios";
import { useCartState } from "@/states";
import useDiscountState from "@/states/DiscountState";
import { useTranslation } from "react-i18next";
import Btn from "@/elements/buttons/Btn";

const PaymentSuccessPage = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const axios = useAxios();
  const clearCart = useCartState((state) => state.clearCart);
  const { clearDiscounts } = useDiscountState();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null); // 'success', 'pending', 'error'
  const [orderInfo, setOrderInfo] = useState(null);

  const orderId = searchParams.get("order_id");
  const gateway = searchParams.get("gateway");
  const paymentId = searchParams.get("payment_id") || searchParams.get("checkout_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId || !gateway) {
        // Try to get from session storage
        const storedOrderId = sessionStorage.getItem("pending_bnpl_order_id");
        const storedGateway = sessionStorage.getItem("pending_bnpl_gateway");

        if (!storedOrderId) {
          setStatus("error");
          setLoading(false);
          return;
        }

        // Use stored values
        await processPaymentCallback(storedOrderId, storedGateway);
      } else {
        await processPaymentCallback(orderId, gateway);
      }
    };

    const processPaymentCallback = async (oid, gw) => {
      try {
        const response = await axios.get(`/payment/callback/${gw}`, {
          params: {
            order_id: oid,
            payment_id: paymentId,
          },
        });

        if (response?.data?.success) {
          setStatus("success");
          setOrderInfo({
            orderId: response.data.data.order_id,
            orderNumber: response.data.data.order_number,
          });

          // Clear cart and discounts on successful payment
          clearCart();
          clearDiscounts();

          // Clear session storage
          sessionStorage.removeItem("pending_bnpl_order_id");
          sessionStorage.removeItem("pending_bnpl_gateway");
        } else {
          // Payment not completed but order exists
          setStatus("pending");
          setOrderInfo({
            orderId: oid,
          });
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
        setStatus("error");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [orderId, gateway, paymentId, axios, clearCart, clearDiscounts]);

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md="6" className="text-center">
            <Spinner size="lg" color="primary" />
            <h4 className="mt-3">{t("VerifyingPayment")}...</h4>
            <p className="text-muted">{t("PleaseWait")}</p>
          </Col>
        </Row>
      </Container>
    );
  }

  if (status === "success") {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md="8" lg="6" className="text-center">
            <div className="success-icon mb-4">
              <RiCheckboxCircleFill
                size={80}
                className="text-success"
                style={{ animation: "pulse 2s infinite" }}
              />
            </div>
            <h2 className="text-success mb-3">{t("PaymentSuccessful")}</h2>
            <p className="text-muted mb-4">
              {t("ThankYouForYourOrder")}. {t("OrderConfirmationSent")}.
            </p>

            {orderInfo?.orderNumber && (
              <div className="order-info bg-light p-3 rounded mb-4">
                <p className="mb-1">
                  <strong>{t("OrderNumber")}:</strong>
                </p>
                <h4 className="text-primary">#{orderInfo.orderNumber}</h4>
              </div>
            )}

            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Btn
                className="btn-primary"
                onClick={() => router.push(`/order/success/${orderInfo?.orderId}`)}
              >
                {t("ViewOrderDetails")}
              </Btn>
              <Btn
                className="btn-outline-primary"
                onClick={() => router.push("/")}
              >
                {t("ContinueShopping")}
              </Btn>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  if (status === "pending") {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md="8" lg="6" className="text-center">
            <div className="pending-icon mb-4">
              <RiErrorWarningFill
                size={80}
                className="text-warning"
              />
            </div>
            <h2 className="text-warning mb-3">{t("PaymentPending")}</h2>
            <p className="text-muted mb-4">
              {t("PaymentNotCompleted")}. {t("OrderCreatedPendingPayment")}.
            </p>

            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Btn
                className="btn-primary"
                onClick={() => router.push(`/account/orders`)}
              >
                {t("ViewMyOrders")}
              </Btn>
              <Btn
                className="btn-outline-primary"
                onClick={() => router.push("/")}
              >
                {t("ContinueShopping")}
              </Btn>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  // Error state
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md="8" lg="6" className="text-center">
          <div className="error-icon mb-4">
            <RiErrorWarningFill
              size={80}
              className="text-danger"
            />
          </div>
          <h2 className="text-danger mb-3">{t("PaymentError")}</h2>
          <p className="text-muted mb-4">
            {t("PaymentVerificationFailed")}. {t("PleaseTryAgainOrContactSupport")}.
          </p>

          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Btn
              className="btn-primary"
              onClick={() => router.push("/checkout")}
            >
              {t("TryAgain")}
            </Btn>
            <Btn
              className="btn-outline-primary"
              onClick={() => router.push("/contact-us")}
            >
              {t("ContactSupport")}
            </Btn>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default PaymentSuccessPage;
