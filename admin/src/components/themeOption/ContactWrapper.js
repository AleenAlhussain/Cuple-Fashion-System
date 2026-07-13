import { mediaConfig } from "@/data/MediaConfig";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import { getHelperText } from "../../utils/customFunctions/getHelperText";
import FileUploadField from "../inputFields/FileUploadField";
import SimpleInputField from "../inputFields/SimpleInputField";

const ContactWrapper = ({ contactDetails, values, setFieldValue, errors }) => {
  const { t } = useTranslation("common");
  const iconFieldName = `contactDetailIcon${contactDetails.index}`;

  return (
    <div className="border rounded p-3">
      <h4 className="fw-semibold mb-3 txt-primary w-100">{contactDetails.title}</h4>
      <Row className="g-sm-4 g-3">
        <Col md="6">
          <SimpleInputField
            nameList={[
              {
                name: `[options][contact_us][${contactDetails.value}][label]`,
                title: "Label (English)",
                placeholder: t("EnterLabel"),
              },
              {
                name: `[options][contact_us][${contactDetails.value}][label_ar]`,
                title: "Label (Arabic)",
                placeholder: "أدخل العنوان بالعربية",
              },
            ]}
          />
        </Col>
        <Col md="6">
          <FileUploadField
            paramsProps={{ mime_type: mediaConfig.image.join(",") }}
            errors={errors}
            name={iconFieldName}
            title="Icon Image"
            id={iconFieldName}
            type="file"
            values={values}
            setFieldValue={setFieldValue}
            showImage={values?.[iconFieldName]}
            helpertext={getHelperText("80x80px")}
          />
        </Col>
        <Col md="6">
          <SimpleInputField
            nameList={[
              {
                name: `[options][contact_us][${contactDetails.value}][text]`,
                title: "Value (English)",
                placeholder: t("EnterText"),
              },
            ]}
          />
        </Col>
        <Col md="6">
          <SimpleInputField
            nameList={[
              {
                name: `[options][contact_us][${contactDetails.value}][text_ar]`,
                title: "Value (Arabic)",
                placeholder: "أدخل القيمة بالعربية",
              },
            ]}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ContactWrapper;
