import FileUploadField from "@/components/inputFields/FileUploadField";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import CommonRedirect from "../../CommonRedirect";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import { mediaConfig } from "@/data/MediaConfig";

const FullBannerTab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="fullBannerImage" title="Image" id="fullBannerImage" showImage={values["fullBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "fullBannerLinkType", multipleNameKey: "fullBannerLink" }} setSearch={setSearch} />
      <CheckBoxField name={`[content][full_banner][status]`} title="Status" />
    </>
  );
};

export default FullBannerTab;
 