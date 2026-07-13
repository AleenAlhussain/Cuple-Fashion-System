import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useTranslation } from "react-i18next";
import CommonRedirect from "../../CommonRedirect";
import { mediaConfig } from "@/data/MediaConfig";

const HomeBannerTab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  const { t } = useTranslation("common");

  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name={`homeBannerImage`} title="Image" id={`homeBannerImage`} type="file" values={values} setFieldValue={setFieldValue} showImage={values[`homeBannerImage`]} helpertext={getHelperText("376x231px")} />
      <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: `homeRedirectLinkType`, multipleNameKey: `homeRedirectLink` }} setSearch={setSearch} />
      <CheckBoxField name={`[content][home_banner][status]`} title="Status" />
    </>
  );
};

export default HomeBannerTab;
