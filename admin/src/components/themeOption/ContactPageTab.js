import { mediaConfig } from "@/data/MediaConfig";
import { Col, Row } from "reactstrap";
import { useTranslation } from "react-i18next";
import { getHelperText } from "../../utils/customFunctions/getHelperText";
import CheckBoxField from "../inputFields/CheckBoxField";
import ContactWrapper from "./ContactWrapper";
import FileUploadField from "../inputFields/FileUploadField";
import SimpleInputField from "../inputFields/SimpleInputField";

const CONTACT_DETAILS = [
  { title: "Phone Card", value: "detail_1", index: 1 },
  { title: "Email Card", value: "detail_2", index: 2 },
  { title: "Address Card", value: "detail_3", index: 3 },
];

const ContactPageTab = ({ values, setFieldValue, errors }) => {
  const { t } = useTranslation("common");

  return (
    <Row>
      <Col sm="12">
        <div className="mb-4 p-3 rounded border bg-light">
          <strong>{t("ContactPage")}</strong>
          <p className="mb-0 mt-2 text-muted">
            Manage the Contact Us page content here, including the localized heading,
            social links, and the 3 contact info cards shown under the form.
          </p>
        </div>

        <SimpleInputField
          nameList={[
            {
              name: "[options][contact_us][title]",
              title: "Title (English)",
              placeholder: "Get In Touch",
            },
            {
              name: "[options][contact_us][title_ar]",
              title: "Title (Arabic)",
              placeholder: "تواصل معنا",
            },
            {
              name: "[options][contact_us][description]",
              title: "Description (English)",
              type: "textarea",
              placeholder: t("EnterDescription(optional)"),
            },
            {
              name: "[options][contact_us][description_ar]",
              title: "Description (Arabic)",
              type: "textarea",
              placeholder: "أدخل الوصف بالعربية",
            },
          ]}
        />

        <FileUploadField
          paramsProps={{ mime_type: mediaConfig.image.join(",") }}
          errors={errors}
          name="contactUsImage"
          title="Contact Page Image"
          id="contactUsImage"
          type="file"
          values={values}
          setFieldValue={setFieldValue}
          showImage={values?.contactUsImage}
          helpertext={getHelperText("900x700px")}
        />

        <div className="mt-4 border rounded p-3">
          <h4 className="fw-semibold mb-3">Social Media Links</h4>
          <CheckBoxField
            name="[options][contact_us][social_media_enable]"
            title="Enable Social Icons On Contact Page"
          />
          {values?.options?.contact_us?.social_media_enable && (
            <SimpleInputField
              nameList={[
                {
                  name: "[options][contact_us][facebook]",
                  title: "Facebook",
                  placeholder: t("Enterfacebook"),
                },
                {
                  name: "[options][contact_us][instagram]",
                  title: "Instagram",
                  placeholder: t("EnterInstagram"),
                },
                {
                  name: "[options][contact_us][tiktok]",
                  title: "TikTok",
                  placeholder: "https://tiktok.com/@yourbrand",
                },
                {
                  name: "[options][contact_us][snapchat]",
                  title: "Snapchat",
                  placeholder: "https://snapchat.com/add/yourbrand",
                },
                {
                  name: "[options][contact_us][twitter]",
                  title: "Twitter",
                  placeholder: t("EnterTwitter"),
                },
                {
                  name: "[options][contact_us][pinterest]",
                  title: "Pinterest",
                  placeholder: t("EnterPinterest"),
                },
              ]}
            />
          )}
        </div>

        <div className="mt-4">
          {CONTACT_DETAILS.map((detail) => (
            <div key={detail.value} className="mb-4">
              <ContactWrapper
                contactDetails={detail}
                values={values}
                setFieldValue={setFieldValue}
                errors={errors}
              />
            </div>
          ))}
        </div>
      </Col>
    </Row>
  );
};

export default ContactPageTab;
