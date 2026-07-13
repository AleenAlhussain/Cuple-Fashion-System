"use client";
import Loader from "@/components/commonComponent/Loader";
import { role } from "@/utils/axiosUtils/API";
import useUpdate from "@/utils/hooks/useUpdate";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Col, Row } from "reactstrap";

const UserUpdate = () => {
  const params = useParams();
  const { t } = useTranslation("common");
  const { mutate, isLoading } = useUpdate(role, params?.updateId, `/role`);
  const PermissionForm = dynamic(() => import("@/components/role/PermissionForm").then((mod) => mod.default), {
    loading: () => <Loader />,
    ssr: false,
  });
  return (
    params?.updateId && (
      <Row>
        <Col xxl="8" lg="10" className="m-auto">
          <Card>
            <CardBody>
              <div className="title-header option-title">
                <h5>{t("EditRole")}</h5>
              </div>
              <PermissionForm mutate={mutate} updateId={params?.updateId} loading={isLoading} buttonName="Update" />
            </CardBody>
          </Card>
        </Col>
      </Row>
    )
  );
};

export default UserUpdate;
