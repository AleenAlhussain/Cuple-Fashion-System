import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useTranslation } from "react-i18next";

const FullBannerTab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField
        nameList={[
          { name: `[content][parallax_banner][main_title]`, placeholder: t("EnterMainTitle"), title: "MainTitle" },
          { name: `[content][parallax_banner][title]`, placeholder: t("EnterTitle"), title: "Title" },
          { name: `[content][parallax_banner][sub_title]`, placeholder: t("EnterSubTitle"), title: "SubTitle" },
        ]}
      />
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="fullBannerImage" title="Image" id="fullBannerImage" showImage={values["fullBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
      <CheckBoxField name={`[content][parallax_banner][status]`} title="Status" />
    </>
  );
};

export default FullBannerTab;
