import Avatar from "@/components/widgets/Avatar";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import { useSettings } from "@/utils/hooks/useSettings";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Table, Tooltip } from "reactstrap";
import RefundModal from "./RefundModal";
import ExchangeModal from "./ExchangeModal";
import { Href } from "@/utils/constants";
import Btn from "@/elements/buttons/Btn";
import { CapitalizeMultiple } from "@/utils/customFunctions/Capitalize";

const DetailsTable = ({ data, intentHash, itemsRef }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const OPEN_STATUSES = ["pending", "under_review", "approved", "processing"];

  // Refund modal state
  const [refundModal, setRefundModal] = useState("");
  // Exchange modal state
  const [exchangeModal, setExchangeModal] = useState("");
  const [storeData, setStoreData] = useState("");

  const onRefundModalOpen = (product) => {
    setStoreData(product);
    setRefundModal(product?.id);
  };

  const onExchangeModalOpen = (product) => {
    setStoreData(product);
    setExchangeModal(product?.id);
  };

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const toggle = (index) =>
    setTooltipOpen((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));

  const [bannerVisible, setBannerVisible] = useState(Boolean(intentHash));
  const [highlightActive, setHighlightActive] = useState(false);

  useEffect(() => {
    if (!intentHash) {
      setBannerVisible(false);
      setHighlightActive(false);
      return;
    }
    if (typeof window === "undefined") return;
    setBannerVisible(true);
    setHighlightActive(true);
    const highlightTimer = window.setTimeout(() => setHighlightActive(false), 5000);
    const bannerTimer = window.setTimeout(() => setBannerVisible(false), 10000);
    return () => {
      window.clearTimeout(highlightTimer);
      window.clearTimeout(bannerTimer);
    };
  }, [intentHash]);

  const isOpenStatus = (status) => {
    if (!status) return false;
    return OPEN_STATUSES.includes(status.toLowerCase());
  };

  const isClosedStatus = (status) => {
    if (!status) return false;
    return ["rejected", "completed", "cancelled"].includes(status.toLowerCase());
  };

  const isWithinWindow = () => {
    if (!data?.delivered_at) return false;
    const deliveredAt = new Date(data.delivered_at).getTime();
    if (Number.isNaN(deliveredAt)) return false;
    const windowEnd = deliveredAt + 15 * 24 * 60 * 60 * 1000;
    return Date.now() <= windowEnd;
  };

  const getEligibilityReason = (product, type) => {
    if (data?.has_open_return_request) {
      return t("OrderRequestExists");
    }
    const status = type === "refund" ? product?.pivot?.refund_status : product?.pivot?.exchange_status;
    if (status && isOpenStatus(status)) {
      return t("ActiveRequestExists");
    }
    if (data?.order_status?.slug !== "delivered" || !data?.delivered_at) {
      return t("EnableAfterDelivery");
    }
    if (!isWithinWindow()) {
      return t("ReturnWindowExpired");
    }
    return "";
  };

  return (
    <>
      {intentHash && bannerVisible && (
        <div className="intent-banner">
          <p>{t("RefundExchangeInstruction")}</p>
          <button
            type="button"
            className="intent-banner__close"
            aria-label="Close"
            onClick={() => setBannerVisible(false)}
          >
            &times;
          </button>
        </div>
      )}
      <Card className={`dashboard-table ${highlightActive ? "intent-highlight" : ""}`}>
        <CardBody className="p-0">
          <div className="wallet-table">
            <div className="tracking-wrapper table-responsive" ref={itemsRef}>
              <Table className="product-table order-table">
                <thead>
                  <tr>
                    <th scope="col">{t("Image")}</th>
                    <th scope="col">{t("Name")}</th>
                    <th scope="col">{t("Price")}</th>
                    <th scope="col">{t("Quantity")}</th>
                    <th scope="col">{t("Subtotal")}</th>
                    <th scope="col">{t("RefundStatus")}</th>
                    <th scope="col">{t("ExchangeStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.products?.length > 0
                    ? data?.products?.map((product, i) => (
                        <tr key={i}>
                          <td className="product-image">
                            <Avatar
                              data={
                                product?.pivot?.variation &&
                                product?.pivot?.variation?.variation_image
                                  ? product?.pivot?.variation?.variation_image
                                  : product?.product_thumbnail
                                  ? product?.product_thumbnail
                                  : placeHolderImage
                              }
                              name={
                                product?.pivot?.variation
                                  ? product?.pivot?.variation?.name
                                  : product?.name
                              }
                              customImageClass="img-fluid"
                            />
                          </td>
                          <td>
                            <h6>
                              {product?.pivot?.variation
                                ? product?.pivot?.variation?.name
                                : product?.name}
                            </h6>
                          </td>
                          <td>
                            <h6>
                              {convertCurrency(
                                product?.pivot?.single_price
                              )}
                            </h6>
                          </td>
                          <td>
                            <h6>{product?.pivot?.quantity}</h6>
                          </td>
                          <td>
                            <h6>
                              {convertCurrency(
                                product?.pivot?.subtotal
                              )}
                            </h6>
                          </td>

                          {/* ============ Refund Column ============ */}
                          <td>
                            {product?.is_return === 0 ? (
                              <span>{t("NonRefundable")}</span>
                            ) : product?.pivot?.refund_status &&
                              isClosedStatus(product?.pivot?.refund_status) ? (
                              <div
                                className={`status-${product?.pivot?.refund_status?.toLowerCase()}`}
                              >
                                <span>
                                  {CapitalizeMultiple(
                                    product?.pivot?.refund_status
                                  )}
                                </span>
                              </div>
                            ) : !getEligibilityReason(product, "refund") ? (
                              <a
                                className="btn btn-solid"
                                href={Href}
                                onClick={() => onRefundModalOpen(product)}
                              >
                                {t("Refund")}
                              </a>
                            ) : (
                              <>
                                <div
                                  className="black-tooltip"
                                  id={"refunded" + i}
                                >
                                  <Btn className="btn-solid disabled">
                                    {t("Refund")}
                                  </Btn>
                                </div>
                                <Tooltip
                                  isOpen={tooltipOpen[i]}
                                  target={"refunded" + i}
                                  toggle={() => toggle(i)}
                                >
                                  {getEligibilityReason(product, "refund")}
                                </Tooltip>
                              </>
                            )}
                          </td>

                          {/* ============ Exchange Column ============ */}
                          <td>
                            {product?.is_exchange === 0 ? (
                              <span>{t("NonExchangeable")}</span>
                            ) : product?.pivot?.exchange_status &&
                              isClosedStatus(product?.pivot?.exchange_status) ? (
                              <div
                                className={`status-${product?.pivot?.exchange_status?.toLowerCase()}`}
                              >
                                <span>
                                  {CapitalizeMultiple(
                                    product?.pivot?.exchange_status
                                  )}
                                </span>
                              </div>
                            ) : !getEligibilityReason(product, "exchange") ? (
                              <a
                                className="btn btn-solid"
                                href={Href}
                                onClick={() => onExchangeModalOpen(product)}
                              >
                                {t("Exchange")}
                              </a>
                            ) : (
                              <>
                                <div
                                  className="black-tooltip"
                                  id={"exchanged" + i}
                                >
                                  <Btn className="btn-solid disabled">
                                    {t("Exchange")}
                                  </Btn>
                                </div>
                                <Tooltip
                                  isOpen={tooltipOpen["ex" + i]}
                                  target={"exchanged" + i}
                                  toggle={() =>
                                    toggle("ex" + i)
                                  } // نستخدم key مختلف عشان ما تتلخبط مع refund
                                >
                                  {getEligibilityReason(product, "exchange")}
                                </Tooltip>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </Table>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Modals */}
      <RefundModal
        modal={refundModal}
        setModal={setRefundModal}
        storeData={storeData}
      />
      <ExchangeModal
        modal={exchangeModal}
        setModal={setExchangeModal}
        storeData={storeData}
      />
    </>
  );
};

export default DetailsTable;

