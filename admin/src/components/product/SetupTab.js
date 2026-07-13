import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CheckBoxField from "../inputFields/CheckBoxField.js";
import request from "../../utils/axiosUtils/index.js";
import { BrandAPI, Category, product, tag } from "../../utils/axiosUtils/API.js";
import MultiSelectField from "../inputFields/MultiSelectField.js";
import SearchableSelectInput from "../inputFields/SearchableSelectInput.js";
import SimpleInputField from "../inputFields/SimpleInputField.js";
import useCustomQuery from "@/utils/hooks/useCustomQuery.js";

const SetupTab = ({ values, setFieldValue, errors, updateId }) => {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState(false);
  const [customSearch, setCustomSearch] = useState("");
  const [tc, setTc] = useState(null);
  const router = useRouter();

  // Getting Category Data with type products
  const { data: categoryData } = useCustomQuery([Category], () => request({ url: Category, params: { status: 1, type: "product" } }, router), { refetchOnWindowFocus: false, select: (data) => data.data.data });

  // Getting Tags Data with type products
  const { data: tagData } = useCustomQuery([tag], () => request({ url: tag, params: { status: 1, type: "product" } }, router), { refetchOnWindowFocus: false, select: (data) => data.data.data });

  //Getting Brand Data
  const { data: BrandsData } = useCustomQuery([BrandAPI], () => request({ url: BrandAPI, params: { status: 1 } }, router), { refetchOnWindowFocus: false, select: (data) => data.data.data });

  // Getting Products Data
  const [arrayState, setArrayState] = useState([]);
  useEffect(() => {
    if (updateId) {
      // Extract IDs from product objects - handle both object format {id: x} and direct IDs
      const extractIds = (products) => {
        if (!products || !Array.isArray(products)) return [];
        return products.map(p => typeof p === 'object' ? p.id : p).filter(id => id !== undefined && id !== null);
      };
      const relatedIds = extractIds(values["related_products"]);
      const crossSellIds = extractIds(values["cross_sell_products"]);
      const upsellIds = extractIds(values["upsell_products"]);
      const allIds = [...relatedIds, ...crossSellIds, ...upsellIds];
      if (allIds.length > 0) {
        setArrayState((prev) => Array.from(new Set([...prev, ...allIds])));
      }
    }
  }, [updateId, values["related_products"]?.length, values["cross_sell_products"]?.length, values["upsell_products"]?.length]);
  const {
    data: productData,
    isLoading: productLoader,
    refetch,
  } = useCustomQuery(
    [product, arrayState],
    () =>
      request(
        {
          url: product,
          params: {
            status: 1,
            search: customSearch ? customSearch : "",
            paginate: arrayState?.length >= 15 ? arrayState?.length : 15,
            ids: customSearch ? null : arrayState?.join() || null,
            with_union_products: arrayState?.length ? (arrayState?.length >= 15 ? 0 : 1) : 0,
          },
        },
        router
      ),
    {
      enabled: false,
      refetchOnWindowFocus: false,
      select: (res) =>
        res?.data?.data
          .filter((elem) => (updateId ? elem?.id !== Number(updateId) : elem))
          .map((elem) => {
            return { id: elem.id, name: elem.name, image: elem?.product_thumbnail?.original_url || "/assets/images/placeholder.png", slug: elem?.slug };
          }),
    }
  );

  useEffect(() => {
    productLoader && refetch();
  }, [productLoader]);

  // Added debouncing
  useEffect(() => {
    if (tc) clearTimeout(tc);
    setTc(setTimeout(() => setCustomSearch(search), 500));
  }, [search]);

  // Getting users data on searching users
  useEffect(() => {
    !productLoader && refetch();
  }, [customSearch, arrayState, updateId]);

  const customCrossSellProduct = (productData) => {
    return productData?.filter((elem) => elem?.stock_status !== "out_of_stock" && elem?.type !== "classified");
  };

  // if (productLoader) return <Loader />;
  return (
    <>
      <SimpleInputField nameList={[{ name: "unit", title: "Unit", placeholder: t("Enter Unit"), helpertext: "*Specify the measurement unit, such as 10 Pieces, 1 KG, 1 Ltr, etc." }]} />

      <MultiSelectField errors={errors} values={values} setFieldValue={setFieldValue} name="tags" data={tagData || []} />

      <MultiSelectField errors={errors} values={values} setFieldValue={setFieldValue} name="categories" require="true" data={categoryData || []} />

      <SearchableSelectInput
        nameList={[
          {
            name: "brand_id",
            title: "Brands",
            inputprops: {
              name: "brand_id",
              id: "brand_id",
              options: BrandsData || [],
              close: true,
            },
          },
        ]}
      />

      <CheckBoxField name="is_random_related_products" title="RandomRelatedProduct" helpertext="*Enabling this option allows the backend to randomly select 6 products for display." />
      {!values["is_random_related_products"] && (
        <SearchableSelectInput
          nameList={[
            {
              name: "related_products",
              title: "RelatedProducts",
              inputprops: {
                name: "related_products",
                id: "related_products",
                options: productData || [],
                setsearch: setSearch,
                helpertext: "*Choose a maximum of 6 products for effective related products display.",
              },
            },
          ]}
        />
      )}
      <SearchableSelectInput
        nameList={[
          {
            name: "cross_sell_products",
            title: "CrossSellProduct",
            inputprops: {
              name: "cross_sell_products",
              id: "cross_sell_products",
              options: customCrossSellProduct(productData)?.map((elem) => {
                return { id: elem.id, name: elem.name, image: elem?.image || "/assets/images/placeholder.png" };
              }),
              setsearch: setSearch,
              helpertext: "*Choose a maximum of 3 products for effective cross-selling display.",
            },
          },
        ]}
      />
      <SearchableSelectInput
        nameList={[
          {
            name: "upsell_products",
            title: "UpsellProducts",
            inputprops: {
              name: "upsell_products",
              id: "upsell_products",
              options: customCrossSellProduct(productData)?.map((elem) => {
                return { id: elem.id, name: elem.name, image: elem?.image || "/assets/images/placeholder.png" };
              }),
              setsearch: setSearch,
              helpertext: "*Choose a maximum of 3 products for upsell recommendations.",
            },
          },
        ]}
      />
    </>
  );
};

export default SetupTab;
