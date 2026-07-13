import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import useCartDiscount from "@/utils/hooks/useCartDiscount";
import React from "react";
import { useTranslation } from "react-i18next";
import { Col, Row, Table } from "reactstrap";
import NoDataFound from "../widgets/NoDataFound";
import CartData from "./CartData";

const ShowCartData = () => {
  const cart = useCartState((state) => state.cart);
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { t } = useTranslation("common");
  const subTotal = cart?.reduce((sum, item) => sum + (item?.sub_total || 0), 0) || 0;
  const giftDiscount = cart?.reduce((sum, item) => sum + (item?.gift_box_discount || 0), 0) || 0;

  // Rule-based discounts from Offer Engine
  const {
    appliedDiscounts,
    totalDiscount: ruleBasedDiscount,
    isCalculating,
    isCartInitialized,
  } = useCartDiscount({ enabled: true }); // Always enabled - hook handles initialization

  const allDiscounts = giftDiscount + (ruleBasedDiscount || 0);
  const total = Math.max(0, subTotal - allDiscounts);
  return (
    <Row>
      {cart?.length > 0 ? (
        <>
          <Col xs={12}>
            <div className="table-responsive">
              <Table className="cart-table">
                <thead>
                  <tr className="table-head">
                    <th scope="col">{t("Image")}</th>
                    <th scope="col">{t("ProductName")}</th>
                    <th scope="col">{t("Price")}</th>
                    <th scope="col">{t("Quantity")}</th>
                    <th scope="col">{t("Total")}</th>
                    <th scope="col">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((elem, i) => (
                    <CartData elem={elem} key={i} />
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="d-md-table-cell d-none">
                      {t("Subtotal")} :
                    </td>
                    <td className="d-md-none">{t("Subtotal")} :</td>
                    <td>
                      <h2>{convertCurrency(subTotal.toFixed(2))}</h2>
                    </td>
                  </tr>
                  {giftDiscount > 0 && (
                    <tr>
                      <td colSpan="4" className="d-md-table-cell d-none">
                        {t("GiftDiscount")} :
                      </td>
                      <td className="d-md-none">{t("GiftDiscount")} :</td>
                      <td>
                        <h2 className="text-success">-{convertCurrency(giftDiscount.toFixed(2))}</h2>
                      </td>
                    </tr>
                  )}
                  {isCalculating && (
                    <tr>
                      <td colSpan="4" className="d-md-table-cell d-none text-muted">
                        {t("CalculatingDiscounts")}...
                      </td>
                      <td className="d-md-none text-muted">{t("Calculating")}...</td>
                      <td></td>
                    </tr>
                  )}
                  {appliedDiscounts?.map((discount, index) => (
                    <tr key={`discount-${index}`}>
                      <td colSpan="4" className="d-md-table-cell d-none">
                        {discount.name} :
                      </td>
                      <td className="d-md-none">{discount.name} :</td>
                      <td>
                        <h2 className="text-success">-{convertCurrency(Number(discount.amount || 0).toFixed(2))}</h2>
                      </td>
                    </tr>
                  ))}
                  {allDiscounts > 0 && (
                    <tr>
                      <td colSpan="4" className="d-md-table-cell d-none text-success">
                        {t("YouSave")} :
                      </td>
                      <td className="d-md-none text-success">{t("YouSave")} :</td>
                      <td>
                        <h2 className="text-success">{convertCurrency(allDiscounts.toFixed(2))}</h2>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="4" className="d-md-table-cell d-none">
                      {t("Total")} :
                    </td>
                    <td className="d-md-none">{t("Total")} :</td>
                    <td>
                      <h2>{convertCurrency(total.toFixed(2))}</h2>
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Col>
        </>
      ) : (
        <NoDataFound customClass="no-data-added" imageUrl={`/assets/svg/empty-items.svg`} title="NoItemsAdded" description="NoItemsAddedDescription" height={230} width={270} />
      )}
    </Row>
  );
};

export default ShowCartData;
