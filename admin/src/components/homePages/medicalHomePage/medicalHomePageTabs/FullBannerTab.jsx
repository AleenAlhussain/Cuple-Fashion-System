import { useTranslation } from "react-i18next";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import CommonRedirect from "../../CommonRedirect";
import { mediaConfig } from "@/data/MediaConfig";

const FullBannerTab = ({ values, setFieldValue,productData,categoryData,setSearch }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="fullBannerImage" title="Image" id="fullBannerImage" showImage={values["fullBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("1920x1018px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "fullBannerLinkType", multipleNameKey: "fullBannerLink" }} setSearch={setSearch} />
      <CheckBoxField name={`[content][parallax_banner][status]`} title="Status" />
    </>
  );
};

export default FullBannerTab;
