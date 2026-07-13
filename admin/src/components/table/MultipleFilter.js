import AccountContext from "@/helper/accountContext";
import SettingContext from "@/helper/settingContext";
import { useContext } from "react";
import { Col, Row } from "reactstrap";

const MultipleFilter = ({ showAdvanceFilter, advanceFilter }) => {
  const { accountData } = useContext(AccountContext);
  const { settingObj } = useContext(SettingContext);
  return (
    <>
      <div className="show-box mb-4 d-block product-category-option filter-option-list">
        <Row className="gy-3">
          {accountData?.role?.name !== "vendor" && settingObj?.activation?.multivendor ? <Col xl={3} sm={6}>{advanceFilter?.store_ids}</Col> : null}
          <Col xl={3} sm={6}>{advanceFilter?.category_ids}</Col>
          <Col xl={3} sm={6}>{advanceFilter?.productType}</Col>
          <Col xl={3} sm={6}>{advanceFilter?.stock_status}</Col>
          <Col xl={3} sm={6}>{advanceFilter?.brand}</Col>
          <Col xl={3} sm={6}>{advanceFilter?.tag_ids}</Col>
          <Col xl={3} sm={6}>{advanceFilter?.status}</Col>
          {/* Discount rule filters */}
          <Col xl={3} sm={6}>{advanceFilter?.rule_type}</Col>
          {/* User filters */}
          <Col xl={3} sm={6}>{advanceFilter?.role}</Col>
          <Col xl={3} sm={6}>{advanceFilter?.userStatus}</Col>
        </Row>
      </div>
    </>
  );
};

export default MultipleFilter;
