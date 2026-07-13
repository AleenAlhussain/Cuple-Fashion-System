"use client";
import React, { useState } from "react";
import { Col } from "reactstrap";
import AllTagsTable from "@/components/tag/AllTagsTable";
import { tag,TagExportAPI, TagImportAPI } from "@/utils/axiosUtils/API";

const AllTags = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllTagsTable
        url={tag}
        moduleName="Tag"
        isCheck={isCheck}
        setIsCheck={setIsCheck}
        type={"product"}
        exportButton={true}
        importExport={{ importUrl: TagImportAPI, exportUrl: TagExportAPI ,sampleFile:"tags.csv",}}
      />
    </Col>
  );
};

export default AllTags;
