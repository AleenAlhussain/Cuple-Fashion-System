import CheckBoxField from "@/components/inputFields/CheckBoxField";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import FileUploadField from "@/components/inputFields/FileUploadField";
import CommonRedirect from "../../CommonRedirect";
import { mediaConfig } from "@/data/MediaConfig";

const BannerTab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="offerBannerImage" title="Image" id="offerBannerImage" showImage={values["offerBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("375x586px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "offerBannerLinkType", multipleNameKey: "offerBannerLink" }} setSearch={setSearch} />
      <CheckBoxField name={`[content][offer_banner][status]`} title="Status" />
    </>
  );
};

export default BannerTab;
