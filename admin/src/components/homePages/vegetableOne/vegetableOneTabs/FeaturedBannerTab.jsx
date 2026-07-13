import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useTranslation } from "react-i18next";
import CommonRedirect from "../../CommonRedirect";

const FeaturedBannerTab = ({ values, setFieldValue, categoryData, productData, setSearch }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="featuredBannerImage" title="Image" id="featuredBannerImage" showImage={values["featuredBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "featuredBannerLinkType", multipleNameKey: "featuredBannerLink" }} setSearch={setSearch} />
      <CheckBoxField name="[content][featured_banners][status]" title="Status" />
    </>
  );
};

export default FeaturedBannerTab;
