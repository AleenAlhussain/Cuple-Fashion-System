import { useEffect, useRef, useState } from "react";
import useAxios from "@/utils/api/helpers/useAxios";

import useFetchQuery from "@/utils/hooks/useFetchQuery";
import DetailStatus from "./DetailStatus";
import DetailTitle from "./DetailTitle";
import DetailsTable from "./DetailsTable";
import DetailsConsumer from "./DetailsConsumer";
import SubOrdersTable from "./SubOrdersTable";
import Loader from "@/layout/loader";

const OrderAPI = "/order";

const Details = ({ params }) => {
  const axios = useAxios();
  const [intentHash, setIntentHash] = useState("");
  const tableRef = useRef(null);
  const { data, isLoading, refetch } = useFetchQuery([OrderAPI, params], () => axios({ url: `${OrderAPI}/${params}` }), {
    enabled: !!(params),
    refetchOnWindowFocus: false,
    select: (res) => res?.data?.data, // Extract the nested data object from API response { success: true, data: {...} }
  });
  if (isLoading)
    return (
      <div className="box-loader">
        <Loader classes={"blur-bg"} />
      </div>
    );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      setIntentHash(hash === "refund" || hash === "exchange" ? hash : "");
    };
    applyHash();
    const handleHashChange = () => applyHash();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !intentHash || !tableRef.current) return;
    const timer = window.setTimeout(() => {
      tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [intentHash, data]);
  return (
    <>
      <DetailTitle params={params} data={data} />
      <DetailStatus data={data} />
      <DetailsTable data={data} intentHash={intentHash} itemsRef={tableRef} />
      <DetailsConsumer data={data} />
      {data?.sub_orders?.length ? <SubOrdersTable data={data?.sub_orders} /> : null}
    </>
  );
};

export default Details;
