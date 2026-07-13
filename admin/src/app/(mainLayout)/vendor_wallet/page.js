"use client";
import SelectUser from "@/components/wallet/SelectUser";
import SelectWalletPrice from "@/components/wallet/SelectWalletPrice";
import UserTransactionsTable from "@/components/wallet/UserTransactionsTable";
import { checkPermission } from "@/components/common/CheckPermissionList";
import AccountContext from "@/helper/accountContext";
import { VendorTransactions, VendorWalletCredit, VendorWalletDebit } from "@/utils/axiosUtils/API";
import useCreate from "@/utils/hooks/useCreate";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";
import { YupObject, nameSchema } from "@/utils/validation/ValidationSchemas";
import { Form, Formik } from "formik";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiWallet2Line } from "react-icons/ri";
import { Col, Row } from "reactstrap";

const VendorWallet = () => {
  const { role, setRole } = useContext(AccountContext);
  const hasVendorWalletPermission = useMemo(() => checkPermission("vendor_wallet.index"), []);
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole && storedRole !== "undefined" && storedRole !== "null") {
      try {
        const parsedRole = JSON.parse(storedRole);
        if (parsedRole?.name) {
          setRole(parsedRole.name);
        }
      } catch (e) {
        localStorage.removeItem("role");
      }
    }
  }, []);

  const { t } = useTranslation("common");
  const [credit, debit] = usePermissionCheck(["credit", "debit"]);
  const [isValue, setIsValue] = useState("");
  const refRefetch = useRef();
  const { mutate: CreateWalletCredit, isLoading: creditLoader } = useCreate(VendorWalletCredit, false, "/vendor_wallet", false, () => {
    refRefetch.current.call();
  });
  const { mutate: CreateWalletDebit, isLoading: debitLoader } = useCreate(VendorWalletDebit, false, "/vendor_wallet", false, () => {
    refRefetch.current.call();
  });
  if (!hasVendorWalletPermission) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="p-4 text-center">
            <div className="fw-semibold text-danger fs-4 mb-2">
              Permission Required
            </div>
            <div className="text-muted small fs-6">
              This section is available to administrators only.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="save-back-button">
      <Formik
        initialValues={{
          vendor_id: "",
          showBalance: "",
          balance: "",
        }}
        validationSchema={YupObject({ vendor_id: nameSchema })}
        onSubmit={(values, { setFieldValue }) => {
          const payload = {
            user_id: values.vendor_id,
            amount: Number(values.balance || 0),
            detail: "",
          };

          if (isValue == "credit") {
            CreateWalletCredit(payload);
          } else if (isValue == "debit") {
            CreateWalletDebit(payload);
          }

          setFieldValue("balance", "");
        }}
      >
        {({ values, handleSubmit, setFieldValue }) => (
          <>
            <Form>
              <div className="card-spacing">
                <Row>
                  {role !== "vendor" && <SelectUser title={t("SelectVendor")} values={values} setFieldValue={setFieldValue} role={"vendor"} name={"vendor_id"} userRole={role} />}
                  <SelectWalletPrice values={values} setFieldValue={setFieldValue} handleSubmit={handleSubmit} setIsValue={setIsValue} creditLoader={creditLoader} debitLoader={debitLoader} title={t("Wallet")} description={t("WalletBalance")} selectUser={"vendor_id"} icon={<RiWallet2Line />} isCredit={credit} isDebit={debit} role={role} />
                </Row>
              </div>
            </Form>
            <Col sm="12">
              <UserTransactionsTable filterHeader={{ customTitle: "Transactions", customTitleRight: <></> }} url={VendorTransactions} moduleName="UserTransactions" setFieldValue={setFieldValue} values={values} ref={refRefetch} dateRange={true} userIdParams={true} paramsProps={{ vendor_id: values["vendor_id"] ? values["vendor_id"] : null }} />
            </Col>
          </>
        )}
      </Formik>
    </div>
  );
};

export default VendorWallet;
