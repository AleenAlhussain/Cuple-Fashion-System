import { Col, Row } from 'reactstrap'
import { getHelperText } from '../../utils/customFunctions/getHelperText'
import FileUploadField from '../inputFields/FileUploadField'
import SimpleInputField from '../inputFields/SimpleInputField'

import { useTranslation } from "react-i18next"

const SeoTab = ({ values, setFieldValue, errors }) => {

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
          <SimpleInputField
            nameList={[
              { name: "[options][seo][meta_tags]", title: "MetaTags", placeholder: t("EnterMetaTags") },
              { name: "[options][seo][meta_title]", title: "MetaTitle", placeholder: t("EnterMetaTitle") },
              { name: "[options][seo][meta_description]", type: "textarea", title: "MetaDescription", placeholder: t("EnterMetaDescription") },
              { name: "[options][seo][og_title]", title: "OgTitle", placeholder: t("OgTitle") },
              { name: "[options][seo][og_description]", type: "textarea", title: "OgDescription", placeholder: t("EnterOgDescription") }]} />
          <FileUploadField errors={errors} name="og_image_id" title={"OgImage"} id="og_image_id" type="file" values={values} setFieldValue={setFieldValue} uniquename={asMediaObject(values?.og_image) || asMediaObject(values?.options?.seo?.og_image)} helpertext={getHelperText('1200x630px')} />
        </Col>
      </Row>
    </>
  )
}

export default SeoTab
