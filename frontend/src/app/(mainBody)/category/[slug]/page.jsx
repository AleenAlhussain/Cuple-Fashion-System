"use client";
import CategoryMainPage from "@/components/category";
import { use } from "react";

const Category = ({ params }) => {
  const { slug } = use(params);
  return <CategoryMainPage slug={slug} />;
};

export default Category;
