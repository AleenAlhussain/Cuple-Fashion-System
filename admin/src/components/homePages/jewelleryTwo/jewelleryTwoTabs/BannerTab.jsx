import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import CommonRedirect from "../../CommonRedirect";

const BannerTab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="banner1Image" title="Image" id="banner1Image" showImage={values["banner1Image"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("375x586px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "banner1LinkType", multipleNameKey: "banner1Link" }} setSearch={setSearch} />
      <CheckBoxField name={`[content][banner][status]`} title="Status" />
    </>
  );
};

export default BannerTab;
