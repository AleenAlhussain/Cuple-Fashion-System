import Loader from "@/components/commonComponent/Loader";
import request from "@/utils/axiosUtils";
import { product } from "@/utils/axiosUtils/API";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Col, TabContent, TabPane } from "reactstrap";
import AboutBannerTab from "./shoesHomePageTabs/AboutBannerTab";
import AttributeTab from "./shoesHomePageTabs/AttributeTab";
import BrandTab from "./shoesHomePageTabs/BrandTab";
import Categories1Tab from "./shoesHomePageTabs/Categories1Tab";
import Categories2Tab from "./shoesHomePageTabs/Categories2Tab";
import CategoryProductTab from "./shoesHomePageTabs/CategoryProductTab";
import FeaturedBlogTab from "./shoesHomePageTabs/FeaturedBlogTab ";
import HomeBannerTab from "./shoesHomePageTabs/HomeBannerTab";
import ProductList1Tab from "./shoesHomePageTabs/ProductList1Tab";
import ServicesTab from "./shoesHomePageTabs/ServicesTab";
import SliderProductTab from "./shoesHomePageTabs/sliderProductTab";
import SocialMediaTab from "./shoesHomePageTabs/SocialMediaTab";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const AllTabsShoesHomePage = forwardRef(({ activeTab, values, setFieldValue, apiData = {} }, ref) => {
  const { categoryData, blogData, brandData, categoryLoader, brandLoader, categoryRefetch, attributeData } = apiData;
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

  useEffect(() => {
    categoryRefetch();
  }, []);

  if (productLoader || categoryLoader) return <Loader />;

  return (
    <Col xl="7" lg="8">
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <HomeBannerTab values={values} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="2">
          <Categories1Tab values={values} setFieldValue={setFieldValue} categoryData={categoryData} />
        </TabPane>
        <TabPane tabId="3">
          <AboutBannerTab productData={productData} setSearch={setSearch} values={values} setFieldValue={setFieldValue} categoryData={categoryData} />
        </TabPane>
        <TabPane tabId="4">
          <ProductList1Tab values={values} setFieldValue={setFieldValue} categoryData={categoryData} productData={productData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="5">
          <Categories2Tab categoryData={categoryData} setFieldValue={setFieldValue} values={values} />
        </TabPane>
        <TabPane tabId="6">
          <SliderProductTab productData={productData} setSearch={setSearch} setFieldValue={setFieldValue} values={values} />
        </TabPane>
        <TabPane tabId="7">
          <AttributeTab attributeData={attributeData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="8">
          <CategoryProductTab values={values} setFieldValue={setFieldValue} categoryData={categoryData} />
        </TabPane>
        <TabPane tabId="9">
          <FeaturedBlogTab blogData={blogData} setSearch={setSearch} />
        </TabPane>
        <TabPane tabId="10">
          <ServicesTab setFieldValue={setFieldValue} values={values} />
        </TabPane>
        <TabPane tabId="11">
          <SocialMediaTab values={values} setFieldValue={setFieldValue} />
        </TabPane>
        <TabPane tabId="12">
          <BrandTab values={values} setFieldValue={setFieldValue} brandData={brandData} brandLoader={brandLoader} />
        </TabPane>
      </TabContent>
    </Col>
  );
});
export default AllTabsShoesHomePage;
