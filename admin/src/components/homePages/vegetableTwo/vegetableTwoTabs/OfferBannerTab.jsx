import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import CommonRedirect from "../../CommonRedirect";

const OfferBannerTab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="offerBannerImage" title="Image" id="offerBannerImage" showImage={values["offerBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "offerBannerLinkType", multipleNameKey: "offerBannerLink" }} setSearch={setSearch} />
      <CheckBoxField name={`[content][offer_banner][status]`} title="Status" />
    </>
  );
};

export default OfferBannerTab;
