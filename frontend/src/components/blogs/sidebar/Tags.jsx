"use client";
import NoDataFound from "@/components/widgets/NoDataFound";
import useAxios from "@/utils/api/helpers/useAxios";
import { useTranslation } from "react-i18next";
import useFetchQuery from "@/utils/hooks/useFetchQuery";;
import Link from "next/link";
import React from "react";

const Tags = () => {
  const { t } = useTranslation("common");
  const { data: BlogTagData, isLoading } = useFetchQuery([TagAPI], () => axios({ url: TagAPI, params: { type: "post" } }), {
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    select: (data) => data.data.data,
  });

  return (
    <div className="theme-card">
      <h4>{t("Tags")}</h4>
      {BlogTagData?.length > 0 ? (
        <ul className="tags">
          <li>
            <Link href={`/blogs`}>{t("All")}</Link>
          </li>
          {BlogTagData?.map((tags, index) => (
            <li key={index}>
              <Link href={{ pathname: `/blogs`, query: { tag: tags?.slug } }}>{tags.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <NoDataFound customClass="bg-light no-data-added" title="NoTagsFound" />
      )}
    </div>
  );
};

export default Tags;
