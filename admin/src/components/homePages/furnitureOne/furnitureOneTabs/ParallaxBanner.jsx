import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useTranslation } from "react-i18next";

const ProductList = ({ values, setFieldValue, helpertext }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField
        nameList={[
          { name: `[content][parallax_banner][main_title]`, placeholder: t("EnterMainTitle"), title: "Main Title" },
          { name: `[content][parallax_banner][title]`, placeholder: t("EnterTitle"), title: "Title" },
          { name: `[content][parallax_banner][sub_title]`, placeholder: t("EnterSubTitle"), title: "Sub Title" },
        ]}
      />
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="categoriesIconImage" title="Image" id="categoriesIconImage" showImage={values["categoriesIconImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText(helpertext || "153x157px")} />
      <CheckBoxField name={`[content][parallax_banner][status]`} title="Status" />
    </>
  );
};
export default ProductList;
