import { Col, Row } from 'reactstrap'
import { getHelperText } from '../../utils/customFunctions/getHelperText'
import CheckBoxField from '../inputFields/CheckBoxField'
import FileUploadField from '../inputFields/FileUploadField'
import SearchableSelectInput from '../inputFields/SearchableSelectInput'
import SimpleInputField from '../inputFields/SimpleInputField'
import { useTranslation } from "react-i18next"

const GeneralTab = ({ values, setFieldValue, errors }) => {
  const { t } = useTranslation('common');
  const asMediaObject = (value) =>
    value &&
    typeof value === "object" &&
    (value.original_url || value.url || value.path || value.file_name || value.name)
      ? value
      : null;
  return (
    <>
      <Row>
        <Col sm="12">
          <FileUploadField name="header_logo_id" uniquename={asMediaObject(values?.header_logo) || asMediaObject(values?.options?.logo?.header_logo)} title={"HeaderLogo"} errors={errors} id="header_logo_id" type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText('180x50px')} />
          <FileUploadField errors={errors} name="footer_logo_id" id="footer_logo_id" uniquename={asMediaObject(values?.footer_logo) || asMediaObject(values?.options?.logo?.footer_logo)} title={"FooterLogo"} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText('180x50px')} />
          <FileUploadField errors={errors} name="favicon_icon_id" title={"FaviconIcon"} id="favicon_icon_id" type="file" values={values} setFieldValue={setFieldValue} uniquename={asMediaObject(values?.favicon_icon) || asMediaObject(values?.options?.logo?.favicon_icon)} helpertext={getHelperText('16x16px')} />
          <SimpleInputField
            nameList={[
              { name: "[options][general][site_title]", title: "SiteTitle", placeholder: t("EnterSiteTitle") },
              { name: "[options][general][site_tagline]", title: "SiteTagline", placeholder: t("EnterSiteTagline") },
            ]} />
          <SimpleInputField
            nameList={[
              {
                name: "[options][general][topbar_promo_text]",
                title: "Top Header Promo Text (English)",
                placeholder: "Enter top header promo text (English)",
              },
              {
                name: "[options][general][topbar_promo_text_ar]",
                title: "Top Header Promo Text (Arabic)",
                placeholder: "Enter top header promo text (Arabic)",
                dir: "rtl",
              },
            ]}
          />
          <small className="text-muted d-block mb-3">
            Fill both promo texts (English + Arabic), or leave both empty.
          </small>
          <SimpleInputField
            nameList={[
              { name: "[options][general][primary_color]", title: "PrimaryColor", type: "color" },
              { name: "[options][general][secondary_color]", title: "SecondaryColor", type: "color" },
            ]} />
          <CheckBoxField name="[options][general][back_to_top_enable]" title="BacktoTop" />
          <CheckBoxField name="[options][general][sticky_cart_enable]" title="StickyCart" />
          <SearchableSelectInput
            nameList={[
              {
                name: "[options][general][cart_style]",
                title: "CartStyle",
                inputprops: {
                  name: "[options][general][cart_style]",
                  id: "[options][general][cart_style]",
                  options: [
                    { id: "cart_sidebar", name: "Cart Sidebar" },
                    { id: "cart_mini", name: "Cart Mini" },
                  ],
                  defaultOption: "Select Cart Style",
                },
              },
              {
                name: "[options][general][language_direction]",
                title: "LanguageDirection",
                inputprops: {
                  name: "[options][general][language_direction]",
                  id: "[options][general][language_direction]",
                  options: [
                    { id: "ltr", name: "LTR" },
                    { id: "rtl", name: "RTL" },
                  ],
                  defaultOption: "Select Language Direction",
                },
              },
              {
                name: "[options][general][mode]",
                title: "SelectMode",
                inputprops: {
                  name: "[options][general][mode]",
                  id: "[options][general][mode]",
                  options: [
                    { id: "light", name: "Light" },
                    { id: "dark", name: "Dark" },
                  ],
                  defaultOption: "Select Mode",
                },
              },

            ]}
          />
          <CheckBoxField name="[options][general][celebration_effect]" title="CelebrationEffect" />
          <CheckBoxField name="[options][general][exit_tagline_enable]" title="ExitTabTagline" />
          {values?.options?.general?.taglines?.map((val, index) =>
            <SimpleInputField key={index} nameList={[{ name: `[options][general][taglines][${index}]`, title: `Tag Line ${index + 1}`, placeholder: t("EnterTagLine") },]} />
          )}
        </Col>
      </Row>
    </>
  )
}

export default GeneralTab
