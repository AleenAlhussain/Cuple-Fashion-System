import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useTranslation } from "react-i18next";
import CommonRedirect from "../../CommonRedirect";

const HomeBannerTab = ({ values, setFieldValue, categoryData, productData, setSearch }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="homeBannerImage" title="Image" id="homeBannerImage" showImage={values["homeBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("1920x637px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "homeBannerLinkType", multipleNameKey: "homeBannerLink" }} setSearch={setSearch} />
      <CheckBoxField name="[content][home_banner][status]" title="Status" />
    </>
  );
};

export default HomeBannerTab;
