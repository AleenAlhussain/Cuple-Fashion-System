import { useTranslation } from "react-i18next";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import CommonRedirect from "../../CommonRedirect";
import { mediaConfig } from "@/data/MediaConfig";

const CollectionBannerTab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="collectionBannerImage" title="Image" id="collectionBannerImage" showImage={values["collectionBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("1859x550px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "collectionBannerLinkType", multipleNameKey: "collectionBannerLink" }} setSearch={setSearch} />
      <CheckBoxField name={`[content][collection_banner][status]`} title="Status" />
    </>
  );
};

export default CollectionBannerTab;
