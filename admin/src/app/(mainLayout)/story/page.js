'use client'
import AllStoryTable from "@/components/story/AllStoryTable";
import { StoryAPI } from "@/utils/axiosUtils/API";
import { useState } from "react";
import { Col } from "reactstrap";

const AllStories = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllStoryTable url={StoryAPI} moduleName="Story" isCheck={isCheck} setIsCheck={setIsCheck} />
    </Col>
  );
};

export default AllStories;
