import Btn from "@/elements/buttons/Btn";
import { Href } from "@/utils/constants";
import React from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine } from "react-icons/ri";
import { Col, Modal, ModalBody, ModalHeader, Row } from "reactstrap";

const CouponModal = ({ couponData, onCopyCode, setToggle, toggle }) => {
  const { t } = useTranslation("common");

  const getDiscountText = (item) => {
    if (item?.type === 'percentage') {
      return `${item?.value}% off`;
    }
    return `${item?.value} off`;
  };

  return (
    <Modal size="lg" className="modal-dialog modal-dialog-centered coupon-modal theme-modal-2" toggle={() => setToggle(!toggle)} isOpen={toggle}>
      <div className="modal-content">
        <ModalHeader>
          {t("ApplyCoupon")}
          <Btn color="transparent" className=" btn-close" id="address_modal_close_btn" onClick={() => setToggle(false)}>
            <RiCloseLine />
          </Btn>
        </ModalHeader>
        <ModalBody>
          {couponData?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">{t("NoCouponsAvailable") || "No coupons available at the moment"}</p>
            </div>
          ) : (
            <Row className="g-3">
              {couponData?.map((item, i) => (
                <Col md="6" key={i}>
                  <div className="coupon-box">
                    <div className="coupon-name">
                      <div className="card-name">
                        <div>
                          <h5 className="fw-semibold dark-text">{getDiscountText(item)}</h5>
                        </div>
                      </div>
                    </div>
                    <div className="coupon-content">
                      <p>{item?.description || (item?.min_order_amount ? `Min. order: ${item.min_order_amount}` : 'No minimum order')}</p>
                      <div className="coupon-apply">
                        <h6 className="coupon-code success-color">{item?.code}</h6>
                        <a href={Href} className="btn theme-btn p-0 border-btn copy-btn mt-0" onClick={() => { onCopyCode(item?.code); setToggle(false); }}>
                          {t("CopyCode")}
                        </a>
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </ModalBody>
      </div>
    </Modal>
  );
};

export default CouponModal;
