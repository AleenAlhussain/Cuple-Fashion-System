import ThemeOptionContext from "@/context/themeOptionsContext";
import { showMonthWiseDateAndTime } from "@/utils/customFunctions/DateFormat";
import React, { useContext } from "react";

const BlogImageDetails = ({ Blog }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  return (
    <>
      <h3>{Blog?.title}</h3>
      <ul className="post-social">
        {themeOption?.blog?.blog_author_enable && <li>Posted by: {Blog?.created_by?.name}</li>} <li>Created At: {showMonthWiseDateAndTime(Blog?.created_at)}</li>
      </ul>
    </>
  );
};

export default BlogImageDetails;
