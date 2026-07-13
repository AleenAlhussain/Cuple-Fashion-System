"use client";
import { Card, CardBody, Col, Container, Row } from "reactstrap";
import dynamic from "next/dynamic";
import { CategoryExportAPI, CategoryImportAPI } from "@/utils/axiosUtils/API";
import SimpleCategoryForm from "@/components/category/SimpleCategoryForm";
import TreeForm from "@/components/category/TreeForm";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";
import TitleWithDropDown from "@/components/common/TitleWithDropDown";
import { useParams } from "next/navigation";

const CategoryUpdate = () => {
  const params = useParams();
  const TableTitle = dynamic(() => import("@/components/table/TableTitle"), {
    ssr: false,
  });
  const [edit] = usePermissionCheck(["edit"]);

  return (
    <>
      <Container fluid={true}>
        <Row>
          <Col xl="4">
            <Card>
              <CardBody>
                <TitleWithDropDown pathName="/category" moduleName="Category" importExport={{ importUrl: CategoryImportAPI, exportUrl: CategoryExportAPI }} />
                <TreeForm type={"product"} />
              </CardBody>
            </Card>
          </Col>
          <Col xl="8">
            <Card>
              {edit ? (
                <CardBody>
                  <TableTitle moduleName="Edit Category" onlyTitle={true} />
                  {params?.updateId && <SimpleCategoryForm updateId={params?.updateId} />}
                </CardBody>
              ) : (
                <h1>No Permission</h1>
              )}
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default CategoryUpdate;
