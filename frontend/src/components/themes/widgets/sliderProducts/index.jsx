import useAxios from "@/utils/api/helpers/useAxios";

import { FilterItemIds } from "@/utils/customFunctions/FilterItemIds";
import useFetchQuery from "@/utils/hooks/useFetchQuery";;
import React from "react";

const SliderProducts = ({ data = {}, classes }) => {
  const { data: productData } = useFetchQuery([ProductAPI], () => axios({ url: ProductAPI }), { select: (res) => res?.data?.data, refetchOnWindowFocus: false });
  const filteredItems = FilterItemIds({ neededData: data?.product_ids, mainData: productData });

  return (
    <div className={classes?.colClass ? classes?.colClass : "col-lg-3 col-sm-6"}>
      <div className={classes?.cardClass ? classes?.cardClass : "theme-card"}>
        <h5 className="title-border">{data?.title}</h5>
        <div className="offer-slider slide-1">
          <div>
            {filteredItems?.map((item, i) => (
              <div className="media" key={i}>
                <a href="product-page(no-sidebar).html">
                  <img className="img-fluid  lazyload" src={item?.product_galleries[0]?.original_url} alt />
                </a>
                <div className="media-body align-self-center">
                  <div className="rating">
                    <i className="fa fa-star" /> <i className="fa fa-star" /> <i className="fa fa-star" /> <i className="fa fa-star" /> <i className="fa fa-star" />
                  </div>
                  <a href="product-page(no-sidebar).html">
                    <h6>{item?.name}</h6>
                  </a>
                  <h4>
                    ${item?.price}.00 <del>$200.00</del>
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SliderProducts;
