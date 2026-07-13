"use client";
import DiscountRuleForm from "@/components/discountRule/DiscountRuleForm";
import RuleStatistics from "@/components/discountRule/RuleStatistics";
import { useParams } from "next/navigation";
import { Row, Col } from "reactstrap";

const DiscountRuleUpdate = () => {
  const params = useParams();

  return params?.updateId && (
    <div className="discount-rule-page">
      <Row>
        <Col sm="12">
          <DiscountRuleForm
            updateId={params?.updateId}
            title="Update Discount Rule"
            buttonName="Update"
          />
        </Col>
        <Col sm="12" className="discount-rule-stats-wrap">
          <RuleStatistics ruleId={params?.updateId} />
        </Col>
      </Row>
    </div>
  );
};

export default DiscountRuleUpdate;
