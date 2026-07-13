import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Col, TabContent, TabPane } from "reactstrap";
import request from "@/utils/axiosUtils";
import { product } from "@/utils/axiosUtils/API";
import Loader from "@/components/commonComponent/Loader";
import BrandTab from "./vegetableFourTabs/BrandTab";
import CategoriesTab from "./vegetableFourTabs/CategoriesTab";
import FeaturedBlogTab from "./vegetableFourTabs/FeaturedBlogTab ";
import HomeBannerTab from "./vegetableFourTabs/HomeBannerTab";
import OfferBanner1Tab from "./vegetableFourTabs/OfferBanner1Tab";
import OfferBanner2Tab from "./vegetableFourTabs/OfferBanner2Tab";
import ProductList1Tab from "./vegetableFourTabs/ProductList1Tab";
import ProductList2Tab from "./vegetableFourTabs/ProductList2Tab";
import ProductList3Tab from "./vegetableFourTabs/ProductList3Tab";
import ProductList4Tab from "./vegetableFourTabs/ProductList4Tab";
import ServicesTab from "./vegetableFourTabs/ServicesTab";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const AllTabsVegetableFour = forwardRef(({ activeTab, values, setFieldValue, apiData = {} }, ref) => {
  const { categoryData, blogData, brandData, categoryLoader, brandLoader, categoryRefetch } = apiData;
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
          <CategoriesTab setSearch={setSearch} categoryData={categoryData} values={values} setFieldValue={setFieldValue} />
        </TabPane>
        <TabPane tabId="3">
          <OfferBanner1Tab values={values} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="4">
          <ProductList1Tab values={values} setSearch={setSearch} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} />
        </TabPane>
        <TabPane tabId="5">
          <ProductList2Tab values={values} setSearch={setSearch} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} />
        </TabPane>
        <TabPane tabId="6">
          <OfferBanner2Tab values={values} setSearch={setSearch} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} />
        </TabPane>
        <TabPane tabId="7">
          <ProductList3Tab values={values} setSearch={setSearch} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} />
        </TabPane>
        <TabPane tabId="8">
          <ServicesTab values={values} setSearch={setSearch} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} />
        </TabPane>
        <TabPane tabId="9">
          <ProductList4Tab values={values} setSearch={setSearch} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} />
        </TabPane>
        <TabPane tabId="10">
          <FeaturedBlogTab blogData={blogData} values={values} setSearch={setSearch} setFieldValue={setFieldValue} />
        </TabPane>
        <TabPane tabId="11">
          <BrandTab values={values} setSearch={setSearch} setFieldValue={setFieldValue} brandData={brandData} brandLoader={brandLoader} />
        </TabPane>
      </TabContent>
    </Col>
  );
});
export default AllTabsVegetableFour;
