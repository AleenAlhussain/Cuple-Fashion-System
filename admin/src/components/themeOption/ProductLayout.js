import Btn from "../../elements/buttons/Btn";
import { useEffect, useState } from "react";
import { RiArrowDownLine, RiCloseLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { Col, FormGroup, Input, Label, Row } from "reactstrap";
import { SettingProductBoxOptions, SettingProductLayoutOptions } from "../../data/TabTitleList";
import { getHelperText } from "../../utils/customFunctions/getHelperText";
import CheckBoxField from "../inputFields/CheckBoxField";
import FileUploadField from "../inputFields/FileUploadField";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import SimpleInputField from "../inputFields/SimpleInputField";
import DescriptionInput from "../widgets/DescriptionInput";

const SERVICE_LINK_TYPE_OPTIONS = [
  { id: "page", labelKey: "Page" },
  { id: "collection", labelKey: "Collection" },
  { id: "product", labelKey: "Product" },
  { id: "external_url", labelKey: "External Link" },
];

const ProductLayout = ({ values, setFieldValue }) => {
  const { t } = useTranslation("common");
  const [activeService, setActiveService] = useState();
  const productServiceBanners = values?.options?.product?.services?.banners || [];
  useEffect(() => {
    setFieldValue("[options][product][product_box_variant]", values?.options?.product?.product_box_variant ? values?.options?.product?.product_box_variant : "basic");
  }, []);
  const handleClick = (val) => {
    setFieldValue("[options][product][product_layout]", val.value);
  };
  useEffect(() => {
    if (values["options"]["product"]?.["product_box_bg"]) {
      setFieldValue("[options][product][image_bg]", false);
      setFieldValue("[options][product][full_border]", false);
    }
  }, [values["options"]["product"]?.["product_box_bg"]]);
  useEffect(() => {
    if (values["options"]["product"]?.["image_bg"]) {
      setFieldValue("[options][product][product_box_bg]", false);
      setFieldValue("[options][product][full_border]", false);
    }
  }, [values["options"]["product"]?.["image_bg"]]);
  useEffect(() => {
    if (values["options"]["product"]?.["product_box_border"]) {
      setFieldValue("[options][product][full_border]", false);
    }
  }, [values["options"]["product"]?.["product_box_border"]]);
  useEffect(() => {
    if (values["options"]["product"]?.["full_border"]) {
      setFieldValue("[options][product][product_box_bg]", false);
      setFieldValue("[options][product][product_box_border]", false);
      setFieldValue("[options][product][image_bg]", false);
    }
  }, [values["options"]["product"]?.["full_border"]]);

  const handleServiceLinkTypeChange = (index, value) => {
    setFieldValue(`[options][product][services][banners][${index}][redirect_link][link_type]`, value);
  };

  const handleServiceLinkChange = (index, value) => {
    setFieldValue(`[options][product][services][banners][${index}][redirect_link][link]`, value);
  };

  const removeService = (index) => {
    const updated = productServiceBanners.filter((_, i) => i !== index);
    setFieldValue("[options][product][services][banners]", updated);
    updated.forEach((service, i) => {
      if (service?.image_url) {
        setFieldValue(`productServiceImage${i}`, { original_url: service.image_url });
      }
    });
  };

  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "[options][product][product_layout]",
            title: "ProductPageLayout",
            inputprops: {
              name: "[options][product][product_layout]",
              id: "[options][product][product_layout]",
              options: SettingProductLayoutOptions,
              defaultOption: "Select Product Box Style",
            },
          },
        ]}
      />
      <SearchableSelectInput
        nameList={[
          {
            name: "[options][product][product_box_variant]",
            title: "LayoutVariation",
            inputprops: {
              name: "[options][product][product_box_variant]",
              id: "[options][product][product_box_variant]",
              options: SettingProductBoxOptions,
              defaultOption: "Select Product Box Style",
            },
          },
        ]}
      />
      <SearchableSelectInput
        nameList={[
          {
            name: "[options][product][image_variant]",
            title: "ImageVariation",
            inputprops: {
              name: "[options][product][image_variant]",
              id: "[options][product][image_variant]",
              options: [
                { id: "image_thumbnail", name: "ImageThumbnail" },
                { id: "image_slider", name: "ImageSlider" },
                { id: "image_flip", name: "ImageFlip" },
                { id: "image_zoom", name: "ImageZoom" },
              ],
              defaultOption: "Select Image Variation",
            },
          },
        ]}
      />

      <Row className="mt-5 align-items-center g-2">
        <CheckBoxField name="[options][product][is_trending_product]" title="TrendingProduct" helpertext="*Enabling this will showcase the product in the sidebar of the product page as a trending item." />
        <CheckBoxField name="[options][product][safe_checkout]" title="SafeCheckout" helpertext="*A safe checkout image will appear on the product page." />
        <FileUploadField name="safe_checkout_image" title="SafeCheckoutImage" id="safe_checkout_image" showImage={values["safe_checkout_image"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("50x50px")} />

        <CheckBoxField name="[options][product][secure_checkout]" title="SecureCheckout" helpertext="*A secure checkout image will appear on the product page." />
        <FileUploadField name="secure_checkout_image" title="SecureCheckoutImage" id="secure_checkout_image" showImage={values["secure_checkout_image"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("50x50px")} />

        <CheckBoxField name="[options][product][encourage_order]" title="EncourageOrder" helpertext="*A random order count between 1 and 100 will be displayed to motivate user purchases." />
        <SimpleInputField
          nameList={[
            {
              name: "[options][product][encourage_max_order_count]",
              title: "EncourageMaxOrderCount",
              max: "100",
              min: "0",
              type: "number",
              helpertext: "*Specify a number between 1 and 10 to encourage orders.",
            },
          ]}
        />
        <CheckBoxField name="[options][product][encourage_view]" title="EncourageView" helpertext="*This feature encourages users to view products by presenting engaging content or prompts." />
        <SimpleInputField
          nameList={[
            {
              name: "[options][product][encourage_max_view_count]",
              title: "EncourageMaxViewCount",
              max: "100",
              min: "0",
              type: "number",
              helpertext: "*Specify a number between 1 and 10 to encourage product view.",
            },
          ]}
        />
        <CheckBoxField name="[options][product][sticky_checkout]" title="StickyCheckout" helpertext="*Enable to make the Add to Cart and checkout options sticky at the bottom of the product page." />
        <CheckBoxField name="[options][product][sticky_product]" title="StickyProduct" helpertext="*Enable to showcase random products at the bottom of the website." />
        <CheckBoxField name="[options][product][social_share]" title="SocialShare" helpertext="*Enable this option to allow users to share the product on social media platforms." />
        <Col xs="12" className="mt-4">
          <h5 className="mb-2">{t("DeliveryReturnContentSection")}</h5>
          <p className="text-muted mb-0">{t("DeliveryReturnContentHelper")}</p>
        </Col>
        <DescriptionInput
          values={values}
          setFieldValue={setFieldValue}
          title={"ShippingAndReturnEnglish"}
          nameKey="[options][product][shipping_and_return]"
          helpertext="*Displayed when the storefront language is English. HTML formatting is supported."
        />
        <DescriptionInput
          values={values}
          setFieldValue={setFieldValue}
          title={"ShippingAndReturnArabic"}
          nameKey="[options][product][shipping_and_return_ar]"
          helpertext="*Displayed when the storefront language is Arabic. HTML formatting is supported."
        />
      </Row>

      <div className="mt-5">
        <h5 className="mb-3">Homepage / Product Service Cards</h5>
        <p className="text-muted mb-3">Manage the Free Shipping, Return, Exchange cards shown on the homepage and product pages.</p>
        <Btn
          className="btn-theme my-3"
          title="AddContent"
          onClick={() =>
            setFieldValue("[options][product][services][banners]", [
              ...productServiceBanners,
              { title: "", title_ar: "", description: "", description_ar: "", image_url: "", status: true, redirect_link: { link_type: "page", link: "" } },
            ])
          }
        />
        {productServiceBanners.map((service, index) => (
          <Row className="align-items-center" key={index}>
            <Col xs="11">
              <div className="shipping-accordion-custom">
                <div className="p-3 rule-dropdown d-flex justify-content-between" onClick={() => setActiveService((prev) => prev !== index && index)}>
                  {service?.title || service?.title_ar || `Service ${index + 1}`}
                  <RiArrowDownLine />
                </div>
                {activeService == index && (
                  <div className="rule-edit-form">
                    <SimpleInputField
                      nameList={[
                        { name: `[options][product][services][banners][${index}][title]`, title: "Headline Title", placeholder: t("EnterTitle") },
                        { name: `[options][product][services][banners][${index}][title_ar]`, title: "Headline Title (Arabic)", placeholder: t("EnterTitle"), dir: "rtl" },
                        { name: `[options][product][services][banners][${index}][description]`, title: "Service Details", placeholder: t("EnterDescription"), type: "textarea", rows: 4 },
                        { name: `[options][product][services][banners][${index}][description_ar]`, title: "Service Details (Arabic)", placeholder: t("EnterDescription"), type: "textarea", rows: 4, dir: "rtl" },
                      ]}
                    />
                    <FileUploadField
                      name={`productServiceImage${index}`}
                      title="Icon"
                      id={`productServiceImage${index}`}
                      showImage={values[`productServiceImage${index}`]}
                      type="file"
                      values={values}
                      setFieldValue={setFieldValue}
                      helpertext={getHelperText("80x80px")}
                    />
                    <Row className="gy-3 align-items-end">
                      <Col md="4">
                        <FormGroup>
                          <Label className="form-label">{t("LinkType")}</Label>
                          <Input
                            type="select"
                            value={service?.redirect_link?.link_type || SERVICE_LINK_TYPE_OPTIONS[0].id}
                            onChange={(e) => handleServiceLinkTypeChange(index, e.target.value)}
                          >
                            {SERVICE_LINK_TYPE_OPTIONS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {t(item.labelKey)}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md="8">
                        <FormGroup>
                          <Label className="form-label">{t("RedirectLink")}</Label>
                          <Input
                            type="text"
                            placeholder="e.g. exchange-and-refund"
                            value={service?.redirect_link?.link || ""}
                            onChange={(e) => handleServiceLinkChange(index, e.target.value)}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <CheckBoxField name={`[options][product][services][banners][${index}][status]`} title="Status" />
                  </div>
                )}
              </div>
            </Col>
            <Col xs="1">
              <a className="h-100 w-100 cursor-pointer close-icon" onClick={() => removeService(index)}>
                <RiCloseLine />
              </a>
            </Col>
          </Row>
        ))}
      </div>
    </>
  );
};

export default ProductLayout;
