"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Row, Col } from "reactstrap";
import { RiCloseCircleFill, RiRefundLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import Btn from "@/elements/buttons/Btn";

const PaymentFailurePage = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("order_id");
  const gateway = searchParams.get("gateway");
  const status = searchParams.get("status"); // 'cancelled' or other failure status

  const [orderInfo, setOrderInfo] = useState(null);

  useEffect(() => {
    // Try to get order info from session storage
    const storedOrderId = sessionStorage.getItem("pending_bnpl_order_id");

    if (orderId || storedOrderId) {
      setOrderInfo({
        orderId: orderId || storedOrderId,
        gateway: gateway || sessionStorage.getItem("pending_bnpl_gateway"),
      });
    }

    // Clear session storage
    sessionStorage.removeItem("pending_bnpl_order_id");
    sessionStorage.removeItem("pending_bnpl_gateway");
  }, [orderId, gateway]);

  const isCancelled = status === "cancelled";

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md="8" lg="6" className="text-center">
          <div className="failure-icon mb-4">
            {isCancelled ? (
              <RiRefundLine
                size={80}
                className="text-warning"
              />
            ) : (
              <RiCloseCircleFill
                size={80}
                className="text-danger"
              />
            )}
          </div>

          <h2 className={isCancelled ? "text-warning mb-3" : "text-danger mb-3"}>
            {isCancelled ? t("PaymentCancelled") : t("PaymentFailed")}
          </h2>

          <p className="text-muted mb-4">
            {isCancelled
              ? t("PaymentWasCancelled")
              : t("PaymentCouldNotBeProcessed")}
            {" "}
            {t("NoChargesMade")}.
          </p>

          {orderInfo?.orderId && (
            <div className="order-info bg-light p-3 rounded mb-4">
              <p className="mb-1 text-muted">
                {t("YourOrderHasBeenSaved")}. {t("RetryPaymentAnytime")}.
              </p>
            </div>
          )}

          <div className="failure-reasons bg-light p-4 rounded mb-4 text-start">
            <h6 className="mb-3">{t("CommonReasons")}:</h6>
            <ul className="mb-0 ps-3">
              <li className="mb-2">{t("InsufficientFundsOrLimit")}</li>
              <li className="mb-2">{t("PaymentWasCancelledByUser")}</li>
              <li className="mb-2">{t("SessionExpired")}</li>
              <li className="mb-2">{t("TechnicalIssue")}</li>
            </ul>
          </div>

          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Btn
              className="btn-primary"
              onClick={() => router.push("/checkout")}
            >
              {t("TryAgain")}
            </Btn>
            <Btn
              className="btn-outline-secondary"
              onClick={() => router.push("/account/orders")}
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

          <div className="mt-4 pt-4 border-top">
            <p className="text-muted small">
              {t("NeedHelp")}?{" "}
              <a href="/contact-us" className="text-primary">
                {t("ContactSupport")}
              </a>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default PaymentFailurePage;
