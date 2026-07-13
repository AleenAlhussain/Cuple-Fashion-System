import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import MultiSelectField from "@/components/inputFields/MultiSelectField";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useTranslation } from "react-i18next";

const CategoryProductTab = ({ categoryData, setSearch, values, setFieldValue }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField
        nameList={[
          { name: `[content][category_product][tag]`, placeholder: t("EnterTag"), title: "Tag" },
          { name: `[content][category_product][title]`, placeholder: t("EnterTitle"), title: "Title" },
        ]}
      />
      <MultiSelectField values={values} setFieldValue={setFieldValue} name={"productCategories"} title="Categories" data={categoryData} />
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name={`categoryProductImage`} title="Image" id={`categoryProductImage`} type="file" values={values} setFieldValue={setFieldValue} showImage={values[`categoryProductImage`]} helpertext={getHelperText("806x670px")} />
      <CheckBoxField name={`[content][category_product][status]`} title="Status" />
    </>
  );
};
export default CategoryProductTab;
