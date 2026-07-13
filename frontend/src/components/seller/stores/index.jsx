"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Loader from "@/layout/loader";
import useAxios from "@/utils/api/helpers/useAxios";

import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import useFetchQuery from "@/utils/hooks/useFetchQuery";;
import { useState } from "react";
import StoreCard from "./StoreCard";

const SellerStoreContent = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading,fetchStatus} = useFetchQuery([page], () => axios({ url: StoreAPI, params: { status: 1, page: page, paginate: 9 } }), { enabled: true, refetchOnWindowFocus: false, select: (res) => res?.data });
  if (isLoading) return <Loader />;

  return (
    <>
      <Breadcrumbs title={"SellerStores"} subNavigation={[{ name: "SellerStores" }]} />
      <WrapperComponent classes={{ sectionClass: "seller-grid-section section-b-space", row: "g-4", fluidClass: "container" }} customCol={true}>
        <StoreCard data={data} fetchStatus={fetchStatus} setPage={setPage} /> 
      </WrapperComponent>
    </>
  );
};

export default SellerStoreContent;
