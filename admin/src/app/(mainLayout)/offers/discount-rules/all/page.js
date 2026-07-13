'use client'

import AllDiscountRuleTable from "@/components/discountRule/AllDiscountRuleTable";
import { DiscountRuleAPI } from "@/utils/axiosUtils/API";
import { useMemo, useState } from "react";
import { Col, Input } from "reactstrap";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FiPlus } from "react-icons/fi";
import Btn from "@/elements/buttons/Btn";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";

const RULE_TYPE_OPTIONS = [
  { value: "", label: "AllTypes" },
  { value: "product", label: "Product" },
  { value: "cart", label: "Cart" },
  { value: "bulk", label: "Bulk" },
  { value: "bundle", label: "Bundle" },
  { value: "bogo", label: "BOGO" },
  { value: "bxgx", label: "BXGX" },
];

const OffersAllDiscountRulesPage = () => {
  const [isCheck, setIsCheck] = useState([]);
  const [ruleType, setRuleType] = useState("");
  const router = useRouter();
  const { t } = useTranslation("common");
  const [create] = usePermissionCheck(["create"]);

  // Custom Add button that navigates to the correct path
  const customAddButton = create ? (
    <Btn
      className="align-items-center btn-theme add-button"
      title={t("Add") + " " + t("DiscountRule")}
      onClick={() => router.push("/offers/discount-rules/add")}
    >
      <FiPlus />
    </Btn>
  ) : null;

  const paramsProps = useMemo(() => {
    const params = {};
    if (ruleType) params.rule_type = ruleType;
    return params;
  }, [ruleType]);

  const advanceFilter = {
    rule_type: (
      <div>
        <label className="form-label">{t("RuleType") || "Rule Type"}</label>
        <Input type="select" value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
          {RULE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.label) || opt.label}
            </option>
          ))}
        </Input>
      </div>
    ),
  };

  return (
    <Col sm="12">
      <AllDiscountRuleTable
        url={DiscountRuleAPI}
        moduleName="discount-rule"
        isCheck={isCheck}
        setIsCheck={setIsCheck}
        filterHeader={{ customTitleRight: customAddButton }}
        paramsProps={paramsProps}
        advanceFilter={advanceFilter}
      />
    </Col>
  );
};

export default OffersAllDiscountRulesPage;
