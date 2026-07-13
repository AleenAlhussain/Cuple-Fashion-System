import TabForProduct from "@/components/product/widgets/TabForProduct";
import Btn from "@/elements/buttons/Btn";
import AccountContext from "@/helper/accountContext";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Col, Row } from "reactstrap";
import SettingContext from "../../helper/settingContext";
import request from "../../utils/axiosUtils";
import { product } from "../../utils/axiosUtils/API";
import { YupObject, nameSchema } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import AllProductTabs from "./widgets/AllProductTabs";
import { ProductInitValues, ProductValidationSchema } from "./widgets/ProductObjects";
import ProductSubmitFunction from "./widgets/ProductSubmitFunction";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const ProductForm = ({ updateId, title, buttonName, saveButton, setSaveButton, mutate, loading }) => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("1");
  const { state } = useContext(SettingContext);
  const { data: oldData, isLoading: oldDataLoading, refetch, status } = useCustomQuery([updateId], () => request({ url: `${product}/${updateId}` }, router), { refetchOnWindowFocus: false, enabled: false, select: (data) => data.data.data });
  useEffect(() => {
    if (updateId) {
      !saveButton && refetch();
    }
  }, [updateId]);
  const watchEvent = useCallback(
    (oldData, updateId) => {
      return ProductInitValues(oldData, updateId);
    },
    [oldData, updateId]
  );
  const { role, accountData } = useContext(AccountContext);

  if (updateId && oldDataLoading) return <Loader />;
  return (
    <Formik
      initialValues={{ ...watchEvent(oldData, updateId) }}
      validationSchema={YupObject({
        ...ProductValidationSchema,
        store_id: state?.isMultiVendor && role === "admin" && nameSchema,
      })}
      onSubmit={(values) => {
        if (updateId) {
          values["_method"] = "put";
        }
        // Transform values for API
        ProductSubmitFunction(null, values, updateId);

        // Prepare simplified data for our backend
        const submitData = {
          // Basic info
          name: values.name,
          name_ar: values.name_ar || null,
          sku: values.sku,
          type: values.type || 'simple',
          short_description: values.short_description || null,
          short_description_ar: values.short_description_ar || null,
          description: values.description || null,
          description_ar: values.description_ar || null,

          // Pricing
          price: values.price || 0,
          sale_price: values.sale_price || null,
          is_sale_enable: values.is_sale_enable || false,
          sale_starts_at: values.sale_starts_at || null,
          sale_expired_at: values.sale_expired_at || null,
          cost_price: values.cost_price || null,

          // Inventory
          stock_quantity: values.quantity || 0,
          min_stock_alert: values.min_stock_alert || 5,
          weight: values.weight || null,
          weight_unit: values.weight_unit || 'kg',
          unit: values.unit || null,

          // Classification
          brand_id: values.brand_id || null,
          category_ids: values.categories || [],
          tag_ids: values.tags || [],

          // Related products
          is_random_related_products: values.is_random_related_products ?? true,
          related_product_ids: values.related_products?.map(p => p.id || p) || [],
          cross_sell_product_ids: values.cross_sell_products?.map(p => p.id || p) || [],
          upsell_product_ids: values.upsell_products?.map(p => p.id || p) || [],

          // Shipping
          is_free_shipping: values.is_free_shipping || false,
          estimated_delivery_text: values.estimated_delivery_text || null,
          is_return: values.is_return ?? true,
          return_policy_text: values.return_policy_text || null,

          // Display options
          is_active: values.status ? true : false,
          is_featured: values.is_featured || false,
          is_trending: values.is_trending || false,
          safe_checkout: values.safe_checkout ?? true,
          secure_checkout: values.secure_checkout ?? true,
          social_share: values.social_share ?? true,
          encourage_order: values.encourage_order ?? true,
          encourage_view: values.encourage_view ?? true,

          // SEO
          meta_title: values.meta_title || null,
          meta_description: values.meta_description || null,

          // Images - include product thumbnail and galleries
          product_thumbnail_id: values.product_thumbnail_id || null,
          product_galleries_id: values.product_galleries_id || [],
          size_chart_image_id: values.size_chart_image_id || null,

          // Variations - include variation updates
          variations: values.variations?.map((v, index) => ({
            id: v.id || null,
            name: v.name || '', // Variant name like "40/Black/Leather"
            sku: v.sku || '',
            price: parseFloat(v.price) || 0,
            sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
            stock_quantity: parseInt(v.quantity || v.stock_quantity) || 0,
            is_active: v.status !== false,
            image: v.image || v.variation_image?.original_url || null,
            // Extract attribute value IDs - handle both object format {id: x} and direct IDs
            attribute_values: v.attribute_values?.map(av => {
              if (typeof av === 'object' && av !== null) {
                return av.id || av.attribute_value_id;
              }
              return av;
            }).filter(id => id !== undefined && id !== null) || [],
          })) || [],

          // Deleted variant IDs for backend to remove
          deleted_variant_ids: values.deleted_variant_ids || [],
        };

        if (updateId) {
          submitData._method = 'PUT';
        }

        if (mutate) {
          mutate(submitData);
        } else {
          // Fallback - just navigate
          router.push(`/product`);
        }
      }}
    >
      {({ values, setFieldValue, errors, touched, isSubmitting, setErrors, setTouched }) => (
        <Form className="theme-form theme-form-2 mega-form vertical-tabs">
          <Row>
            <Col> 
              <Card>
                <div className="title-header option-title">
                  <h5>{t(title)}</h5>
                </div>
                <Row>
                  <Col xl="3" lg="4">
                    <TabForProduct values={values} activeTab={activeTab} setActiveTab={setActiveTab} errors={errors} touched={touched} />
                  </Col>
                  <AllProductTabs setErrors={setErrors} setTouched={setTouched} touched={touched} values={values} activeTab={activeTab} isSubmitting={isSubmitting} setFieldValue={setFieldValue} errors={errors} updateId={updateId} setActiveTab={setActiveTab} />
                  <div className="ms-auto justify-content-end dflex-wgap mt-sm-4 mt-2 save-back-button">
                    <Btn className="btn-outline" title="Back" onClick={() => router.back()} />
                    {updateId && <Btn className="btn-outline" type="submit" title={`save&Continue`} onClick={() => setSaveButton(true)} />}
                    <Btn className="btn-primary" type="submit" title={buttonName}  />
                  </div>
                </Row>  
              </Card>
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default ProductForm;
