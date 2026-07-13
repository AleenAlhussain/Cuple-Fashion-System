"use client";
import SelectUser from "@/components/wallet/SelectUser";
import SelectWalletPrice from "@/components/wallet/SelectWalletPrice";
import UserTransactionsTable from "@/components/wallet/UserTransactionsTable";
import { checkPermission } from "@/components/common/CheckPermissionList";
import { PointCredit, PointDebit, PointUserTransactions } from "@/utils/axiosUtils/API";
import useCreate from "@/utils/hooks/useCreate";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";
import { YupObject, nameSchema } from "@/utils/validation/ValidationSchemas";
import { Form, Formik } from "formik";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiCoinsLine } from "react-icons/ri";
import { Col, Row } from "reactstrap";

const Point = () => {
  const [isValue, setIsValue] = useState("");
  const [credit, debit] = usePermissionCheck(["credit", "debit"]);
  const { t } = useTranslation("common");
  const refRefetch = useRef();
  const hasPointPermission = useMemo(() => checkPermission("point.index"), []);
  const { mutate: CreatePointCredit } = useCreate(PointCredit, false, "/point", false, () => {
    refRefetch.current.call();
  });
  const { mutate: CreatePointDebit } = useCreate(PointDebit, false, "/point", false, () => {
    refRefetch.current.call();
  });

  if (!hasPointPermission) {
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
          consumer_id: "",
          showBalance: "",
          balance: "",
        }}
        validationSchema={YupObject({ consumer_id: nameSchema })}
        onSubmit={(values, { setFieldValue }) => {
          const payload = {
            user_id: values.consumer_id,
            amount: Number(values.balance || 0),
            detail: "",
          };
          if (isValue == "credit") {
            CreatePointCredit(payload);
          } else if (isValue == "debit") {
            CreatePointDebit(payload);
          }
          setFieldValue("balance", "");
        }}
      >
        {({ values, handleSubmit, setFieldValue, errors }) => (
          <>
            <Form>
              <Row>
                <SelectUser
                  title={t("SelectCustomer")}
                  values={values}
                  setFieldValue={setFieldValue}
                  errors={errors}
                  name={"consumer_id"}
                  role="consumer"
                  onUserDataChange={(selectedUser) => {
                    setFieldValue("showBalance", Number(selectedUser?.point_balance ?? 0));
                  }}
                />
                <SelectWalletPrice
                  values={values}
                  setFieldValue={setFieldValue}
                  handleSubmit={handleSubmit}
                  setIsValue={setIsValue}
                  title={t("Point")}
                  description={t("PointBalance")}
                  selectUser={"consumer_id"}
                  icon={<RiCoinsLine />}
                  isCredit={credit}
                  isDebit={debit}
                  displayAsCurrency={false}
                />
              </Row>
            </Form>
            <Col sm="12">
              <UserTransactionsTable filterHeader={{ customTitle: "Transactions", customTitleRight: <></> }} pointTable url={PointUserTransactions} moduleName="UserTransactions" setFieldValue={setFieldValue} userIdParams={true} ref={refRefetch} dateRange={true} paramsProps={{ consumer_id: values["consumer_id"] ? values["consumer_id"] : null }} />
            </Col>
          </>
        )}
      </Formik>
    </div>
  );
};

export default Point; 
