"use client";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";
import useAxios from "@/utils/api/helpers/useAxios";

import Breadcrumb from "@/utils/commonComponents/breadcrumb";
import { ModifyString } from "@/utils/customFunctions/ModifyString";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import useFetchQuery from "@/utils/hooks/useFetchQuery";;
import { useContext, useEffect, useState } from "react";
import SellerDetailClassic from "./SellerDetailClassic";

const SingleStoreDetail = ({ params }) => {
  const { data: StoreData, isLoading, refetch } = useFetchQuery([params], () => axios({ url: `${StoreAPI}/slug/${params}` }), { enabled: false, refetchOnWindowFocus: false, select: (res) => res?.data });

  useEffect(() => {
    params && refetch();
  }, [params]);

  const [filter, setFilter] = useState({ category: [], price: [], attribute: [], rating: [], sortBy: "", field: "" });
  const { themeOption } = useContext(ThemeOptionContext);
  const [category, brand, attribute, price, rating, sortBy, field, layout] = useCustomSearchParams(["category", "brand", "attribute", "price", "rating", "sortBy", "field", "layout"]);
  const sellerDetailLayout = layout?.layout ? layout?.layout : themeOption?.collection?.collection_layout;

  useEffect(() => {
    setFilter((prev) => {
      return {
        ...prev,
        category: category ? category?.category?.split(",") : [],
        brand: brand ? brand?.brand?.split(",") : [],
        attribute: attribute ? attribute?.attribute?.split(",") : [],
        price: price ? price?.price?.split(",") : [],
        rating: rating ? rating?.rating?.split(",") : [],
        sortBy: sortBy ? sortBy?.sortBy : "",
        field: field ? field?.field : "",
      };
    });
  }, [category, brand, attribute, price, rating, sortBy, field]);
  const storeName = ModifyString(params, false, "-");
  if (isLoading) return <Loader />;
  return (
    <>
      <Breadcrumb title={storeName} subNavigation={[{ name: "SellerStores" }, { name: storeName }]} />
      <SellerDetailClassic filter={filter} setFilter={setFilter} StoreData={StoreData} />
    </>
  );
};
export default SingleStoreDetail;
