"use client";
import BrandForm from "@/components/brand/BrandForm";
import { BrandAPI } from "@/utils/axiosUtils/API";
import useUpdate from "@/utils/hooks/useUpdate";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Col, Row } from "reactstrap";

const TaxUpdate = () => {
  const params = useParams();
  const updateId = params?.updateId;
  const { t } = useTranslation("common");
  const { mutate, isLoading } = useUpdate(BrandAPI, updateId, "/brand");
  return (
    updateId && (
      <Row>
        <Col sm="8" className="m-auto">
          <Card>
            <CardBody>
              <div className="card-header-2">
                <h5>{t("EditBrand")}</h5>
              </div>
              <BrandForm mutate={mutate} updateId={updateId} loading={isLoading} buttonName="Update" />
            </CardBody>
          </Card>
        </Col>
      </Row>
    )
  );
};

export default TaxUpdate;
