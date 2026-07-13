import ThemeOptionContext from "@/context/themeOptionsContext";
import { ShopLayoutProvider } from "@/context/shopLayoutContext";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import { useContext, useEffect, useState } from "react";
import CollectionLeftSidebar from "../collection/collectionLeftSidebar";

const ShopMainPage = () => {
  const { isLoading } = useContext(ThemeOptionContext);
  const [filter, setFilter] = useState({
    category: [],
    brand: [],
    price: [],
    color: [],
    attribute: [],
    rating: [],
    q: "",
    offer_id: null,
    offer_key: null,
    promo_group_id: null,
    offer_name: null,
    page: 1,
    sortBy: null,
    field: null,
  });
  const [
    category,
    brand,
    color,
    size,
    attribute,
    price,
    rating,
    sortBy,
    field,
    layout,
    page,
    offer_id,
    offer_key,
    promo_group_id,
    q,
  ] =
    useCustomSearchParams([
      "category",
      "brand",
      "color",
      "size",
      "attribute",
      "price",
      "rating",
      "sortBy",
      "field",
      "layout",
      "page",
      "offer_id",
      "offer_key",
      "promo_group_id",
      "q",
    ]);
  useEffect(() => {
    setFilter((prev) => {
      return {
        ...prev,
        page: page ? page?.page : 1,
        category: category ? category?.category?.split(",") : [],
        brand: brand ? brand?.brand?.split(",") : [],
        color: color ? color?.color?.split(",") : [],
        size: size ? size?.size?.split(",") : [],
        attribute: attribute ? attribute?.attribute?.split(",") : [],
        price: price ? price?.price?.split(",") : [],
        rating: rating ? rating?.rating?.split(",") : [],
        q: q ? q?.q : "",
        offer_id: offer_id ? offer_id?.offer_id : null,
        offer_key: offer_key ? offer_key?.offer_key : null,
        promo_group_id: promo_group_id ? promo_group_id?.promo_group_id : null,
        sortBy: sortBy ? sortBy?.sortBy : null,
        field: field ? field?.field : null,
      };
    });
  }, [category, brand, color, size, attribute, price, rating, sortBy, field, page, offer_id, offer_key, promo_group_id, q]);

  return (
    <>
      <Breadcrumbs title={`Shop`} subNavigation={[{ name: "Shop" }]} />
      <ShopLayoutProvider scope="shop">
        <CollectionLeftSidebar
          filter={filter}
          setFilter={setFilter}
        />
      </ShopLayoutProvider>
    </>
  );
};

export default ShopMainPage;
