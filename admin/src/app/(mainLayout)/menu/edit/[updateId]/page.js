"use client";
import dynamic from "next/dynamic";
import TitleWithDropDown from "@/components/common/TitleWithDropDown";
const FrontMenuForm = dynamic(() => import("@/components/frontMenu/FrontMenuForm"), { ssr: false });
const MenuForm = dynamic(() => import("@/components/frontMenu/MenuForm"), { ssr: false });
import { Menu } from "@/utils/axiosUtils/API";
import useUpdate from "@/utils/hooks/useUpdate";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiLockLine } from "react-icons/ri";
import { Card, CardBody, Col, Row } from "reactstrap";

const FrontMenuCreate = () => {
  const params = useParams();
  const { t } = useTranslation("common");
  const { mutate, isLoading } = useUpdate(Menu, params?.updateId, `/menu`, "Menu updated successfully");
  return (
    <>
      <Row>
        <Col xl="4">
          <Card>
            <CardBody>
              <TitleWithDropDown pathName="/menu" moduleName="Menu" />
              <FrontMenuForm isLoading={isLoading} />
            </CardBody>
          </Card>
        </Col>
        <Col xl="8">
          <Card>
            <CardBody>
              <div className="title-header option-title">
                <h5>{t("EditMenu")}</h5>
              </div>
              <MenuForm updateId={params?.updateId} loading={isLoading} mutate={mutate} />
            </CardBody>
            <div className="no-permission">
              <div>
                <RiLockLine />
                <h3>{t("NoPermission")}</h3>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default FrontMenuCreate;
