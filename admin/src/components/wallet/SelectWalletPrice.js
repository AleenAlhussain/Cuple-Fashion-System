import React, { useContext, useEffect, useMemo, useState } from "react";
import { RiWalletLine } from "react-icons/ri";
import { Card, CardBody, Col } from "reactstrap";
import Btn from "../../elements/buttons/Btn";
import SimpleInputField from "../inputFields/SimpleInputField";
import SettingContext from "../../helper/settingContext";
import ConfirmationModal from "./ConfirmationModal";
import { useTranslation } from "react-i18next";
import AccountContext from "@/helper/accountContext";

const SelectWalletPrice = ({
  values,
  handleSubmit,
  setIsValue,
  title,
  description,
  selectUser,
  icon,
  isCredit,
  isDebit,
  role,
  setFieldValue,
  balanceDisplayFactor = 1,
  displayAsCurrency = true,
  secondaryBalanceLabel = "",
  secondaryBalanceValue = null,
  secondaryBalanceAsCurrency = false,
}) => {
  const { t } = useTranslation("common");
  const { convertCurrency } = useContext(SettingContext);
  const [modal, setModal] = useState(false);
  const [creditOrDebit, setCreditOrDebit] = useState("");
  const { accountData } = useContext(AccountContext);

  const formatValue = (value, isCurrency = true) => {
    const numericValue = Number(value ?? 0);
    const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
    return isCurrency ? convertCurrency(safeValue) : safeValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const displayBalance = useMemo(() => {
    const rawBalance = Number(values?.showBalance ?? 0);
    const factor = Number(balanceDisplayFactor ?? 1);
    const safeBalance = Number.isFinite(rawBalance) ? rawBalance : 0;
    const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
    return safeBalance * safeFactor;
  }, [values?.showBalance, balanceDisplayFactor]);

  const primaryDisplayValue = useMemo(
    () => formatValue(displayBalance, displayAsCurrency),
    [convertCurrency, displayAsCurrency, displayBalance]
  );

  const secondaryDisplayValue = useMemo(
    () => formatValue(secondaryBalanceValue, secondaryBalanceAsCurrency),
    [convertCurrency, secondaryBalanceAsCurrency, secondaryBalanceValue]
  );

  useEffect(() => {
    setFieldValue("vendor_id", accountData?.vendor_wallet?.vendor_id);
  }, [accountData?.vendor_wallet?.vendor_id]);
  return (
    <>
      <Col xxl={role !== "vendor" ? "8" : ""} xl={role !== "vendor" ? "7" : ""} sm={role == "vendor" ? "12" : ""}>
        <Card>
          <CardBody>
            <div className="title-header option-title">
              <div className="d-flex align-items-center">
                <h5>{title}</h5>
              </div>
            </div>
            <div className="wallet-sec theme-form">
              <div className="wallet-amount">
                <div className="wallet-icon">
                  {icon || <RiWalletLine />}
                </div>
                <div>
                  <h2>{primaryDisplayValue}</h2>
                  <h5>{description}</h5>
                  {secondaryBalanceLabel && (
                    <p className="mb-0 text-muted small">
                      {secondaryBalanceLabel}: <span className="fw-semibold">{secondaryDisplayValue}</span>
                    </p>
                  )}
                </div>
              </div>
              {role !== "vendor" && (
                <>
                  <SimpleInputField nameList={[{ name: "balance", placeholder: t("Add/WithdrawAmount"), notitle: "true", type: "number" }]} />
                  <div className="btn-sec">
                    {isCredit && (
                      <Btn
                        className={`btn-animation ${(!(values.consumer_id || values.vendor_id) || !values["balance"]) && "disabled"}`}
                        type="button"
                        title="Add"
                        onClick={() => {
                          setCreditOrDebit("credit");
                          setModal(true);
                        }}
                      >
                      </Btn>
                    )}
                    {isDebit && (
                      <Btn
                        className="btn-animation"
                        disabled={!values[selectUser] ? true : !values["balance"] ? true : values["balance"] > values["showBalance"] ? true : false}
                        type="button"
                        title="Withdraw"
                        onClick={() => {
                          setCreditOrDebit("debit");
                          setModal(true);
                        }}
                      >
                      </Btn>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </Col>
      <ConfirmationModal modal={modal} setModal={setModal} creditOrDebit={creditOrDebit} setCreditOrDebit={setCreditOrDebit} handleSubmit={handleSubmit} setIsValue={setIsValue}  />
    </>
  );
};

export default SelectWalletPrice;
