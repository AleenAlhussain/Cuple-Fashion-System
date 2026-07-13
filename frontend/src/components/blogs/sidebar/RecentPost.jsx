"use client";
import NoDataFound from "@/components/widgets/NoDataFound";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import useAxios from "@/utils/api/helpers/useAxios";

import { showMonthWiseDateAndTime } from "@/utils/customFunctions/DateFormat";
import useFetchQuery from "@/utils/hooks/useFetchQuery";;
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

const RecentPost = () => {
  const { data: blogState, isLoading, refetch } = useFetchQuery([BlogAPI], () => axios({ url: BlogAPI, params: { paginate: 5 } }), { enabled: false, refetchOnWindowFocus: false, select: (res) => res?.data?.data });

  useEffect(() => {
    isLoading && refetch();
  }, [isLoading]);

  const { t } = useTranslation("common");
  return (
    <div className="theme-card">
      <h4>{t("RecentBlog")}</h4>
      {blogState?.length > 0 ? (
        <ul className="recent-blog">
          {blogState?.slice(0, 5).map((blog, index) => (
            <li key={index}>
              <div className="media blog-box">
                <div className="blog-image">
                  <Image height={340} width={280} className="img-fluid lazyload" src={blog?.blog_thumbnail?.original_url ? blog?.blog_thumbnail?.original_url : placeHolderImage} alt="blog-image" />
                </div>
                <div className="media-body blog-content">
                  <h6>{showMonthWiseDateAndTime(blog?.created_at)}</h6>
                  <Link href={`/blogs/${blog?.slug}`}>
                    <h5>{blog.title}</h5>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <NoDataFound customClass="bg-light no-data-added" title="NoBlogsFound" />
      )}
    </div>
  );
};

export default RecentPost;
