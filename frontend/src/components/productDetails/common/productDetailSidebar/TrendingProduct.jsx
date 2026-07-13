import ImageLink from "@/components/themes/widgets/imageLink";
import { useSettings } from "@/utils/hooks/useSettings";
import useAxios from "@/utils/api/helpers/useAxios";

import useFetchQuery from "@/utils/hooks/useFetchQuery";;
import Link from "next/link";
import React, { useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Media } from "reactstrap";

const TrendingProduct = ({ productState }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const categoryId = useMemo(() => {
    return productState?.product?.categories?.map((elem) => elem?.id);
  }, [productState?.product?.categories]);
  const { data: productData, refetch: productRefetch } = useFetchQuery([categoryId], () => axios({ url: ProductAPI, params: { status: 1, trending: 1, category_ids: categoryId?.join() } }), {
    enabled: false,
    refetchOnWindowFocus: false,
    select: (data) => data.data.data,
  });
  useEffect(() => {
    categoryId?.length > 0 && productRefetch();
  }, [categoryId]);
  if (productData?.length == 0) return null;
  return (
    <div className="theme-card">
      <h5 className="title-border">{t("TrendingProducts")}</h5>
      <div className="offer-slider">
        {productData?.slice(0, 4)?.map((elem, i) => (
          <Media className="mb-2" key={i}>
            <ImageLink imgUrl={elem?.product_galleries[0]?.original_url} width={105} height={120} />
            <Media body>
              <Link href={`/product/${elem?.slug}`}>
                <h6>{elem?.name}</h6>
              </Link>
              <h4>
                {convertCurrency(elem?.sale_price)} <del> {convertCurrency(elem?.price)} </del>
              </h4>
            </Media>
          </Media>
        ))}
      </div>
    </div>
  );
};

export default TrendingProduct;
