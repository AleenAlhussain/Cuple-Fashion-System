"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Col, Row } from "reactstrap";
import Btn from "@/elements/buttons/Btn";
import { RiCheckboxCircleFill } from "react-icons/ri";

const OrderSuccess = () => {
  const { t } = useTranslation("common");
  const params = useParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.add("order-success-route");

    return () => {
      document.body.classList.remove("order-success-route");
    };
  }, []);

  useEffect(() => {
    const getOrderId = async () => {
      const resolvedParams = await params;
      setOrderId(resolvedParams?.orderId);
    };
    getOrderId();
  }, [params]);

  return (
    <Fragment>
      <Breadcrumbs title={"Order Success"} subNavigation={[{ name: "Order Success" }]} />
      <WrapperComponent classes={{ sectionClass: "section-b-space order-success-section", fluidClass: "container" }}>
        <Row className="justify-content-center">
          <Col lg={6} md={8} xs={12}>
            <div className="order-success-content text-center">
              <div className="success-icon mb-4">
                <RiCheckboxCircleFill size={80} color="#4CAF50" />
              </div>
              <h2 className="mb-3">{t("Thank You For Your Order!")}</h2>
              <p className="text-muted mb-2">
                {t("Your order has been placed successfully.")}
              </p>
              {orderId && (
                <p className="mb-4">
                  <strong>{t("Order ID")}:</strong> #{orderId}
                </p>
              )}
              <p className="text-muted mb-4">
                {t("We will send you a confirmation email with order details shortly.")}
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap order-success-actions">
                <Btn
                  className="btn-solid"
                  onClick={() => router.push("/")}
                >
                  {t("Continue Shopping")}
                </Btn>
                {orderId && (
                  <Btn
                    className="btn-outline"
                    onClick={() => router.push(`/account/order/details/${orderId}`)}
                  >
                    {t("View Order")}
                  </Btn>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </WrapperComponent>
    </Fragment>
  );
};

export default OrderSuccess;
