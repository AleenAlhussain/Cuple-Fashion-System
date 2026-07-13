"use client";
import React, { useContext } from "react";
import NoDataFound from "@/components/widgets/NoDataFound";
import { useGetCategories } from "@/utils/api";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const Category = () => {
  const { t } = useTranslation("common");
  const { data: categoriesResponse } = useGetCategories({}, { enabled: true });
  const categoryData = categoriesResponse?.data?.filter(c => c.type === "post") || [];
  return (
    <div className="theme-card">
      <h4>{t("Categories")}</h4>
      {categoryData?.length > 0 ? (
        <ul className="categories">
          <li>
            <Link className="category-name" href={`/blogs`}>
              <h5>{t("All")}</h5>
            </Link>
          </li>
          {categoryData?.slice(0, 4)?.map((category, index) => (
            <li key={index}>
              <Link
                className="category-name"
                href={{
                  pathname: `/blogs`,
                  query: { category: category?.slug },
                }}
              >
                <h5>{category.name}</h5>
                <span>({category?.blogs_count})</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <NoDataFound
          customClass="bg-light no-data-added"
          title="NoCategoryFound"
        />
      )}
    </div>
  );
};

export default Category;
