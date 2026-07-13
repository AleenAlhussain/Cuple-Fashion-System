import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Col, TabContent, TabPane } from "reactstrap";
import request from "@/utils/axiosUtils";
import { product } from "@/utils/axiosUtils/API";
import Loader from "@/components/commonComponent/Loader";
import BrandTab from "./petsHomePageTabs/BrandTab";
import FeaturedBlogTab from "./petsHomePageTabs/FeaturedBlogTab ";
import FullBannerTab from "./petsHomePageTabs/FullBannerTab";
import HomeBannerTab from "./petsHomePageTabs/HomeBannerTab";
import OfferBannerTab from "./petsHomePageTabs/OfferBannerTab";
import ProductList1Tab from "./petsHomePageTabs/ProductList1Tab";
import ProductList2Tab from "./petsHomePageTabs/ProductList2Tab";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const AllTabsPetsHomePage = forwardRef(({ activeTab, values, setFieldValue, apiData = {} }, ref) => {
  const { categoryData, blogData, brandData, categoryLoader, brandLoader } = apiData;
  const [search, setSearch] = useState(false);
  const [customSearch, setCustomSearch] = useState("");
  const [tc, setTc] = useState(null);

  const {
    data: productData,
    isLoading: productLoader,
    refetch,
  } = useCustomQuery(
    [product],
    () =>
      request({
        url: product,
        params: {
          status: 1,
          search: customSearch ? customSearch : "",
          paginate: values["content"]?.["products_ids"]?.length > 15 ? values["content"]?.["products_ids"]?.length : 15,
          ids: customSearch ? null : values["content"]["products_ids"].join() || null,
          with_union_products: values["content"]?.["products_ids"]?.length ? (values["content"]?.["products_ids"]?.length >= 15 ? 0 : 1) : 0,
        },
      }),
    {
      refetchOnWindowFocus: false,
      select: (res) =>
        res?.data?.data.map((elem) => {
          return { id: elem.id, name: elem.name, image: elem?.product_thumbnail?.original_url || "/assets/images/placeholder.png", slug: elem?.slug };
        }),
    }
  );

  useImperativeHandle(ref, () => ({
    call() {
      refetch();
    },
  }));

  // Added debouncing
  useEffect(() => {
    if (tc) clearTimeout(tc);
    setTc(setTimeout(() => setCustomSearch(search), 500));
  }, [search]);
  // Getting users data on searching users
  useEffect(() => {
    refetch();
  }, [customSearch]);

  if (productLoader || categoryLoader) return <Loader />;

  return (
    <Col xl="7" lg="8">
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <HomeBannerTab values={values} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="2">
          <BrandTab values={values} setSearch={setSearch} setFieldValue={setFieldValue} brandData={brandData} brandLoader={brandLoader} />
        </TabPane>
        <TabPane tabId="3">
          <OfferBannerTab setFieldValue={setFieldValue} values={values} categoryData={categoryData} productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="4">
          <ProductList1Tab productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="5">
          <FullBannerTab setFieldValue={setFieldValue} values={values} categoryData={categoryData} productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="6">
          <ProductList2Tab productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="7">
          <FeaturedBlogTab setSearch={setSearch} blogData={blogData} />
        </TabPane>
      </TabContent>
    </Col>
  );
});
export default AllTabsPetsHomePage;
