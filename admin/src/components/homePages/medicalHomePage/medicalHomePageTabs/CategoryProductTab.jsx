import MultiSelectField from "@/components/inputFields/MultiSelectField";
import { useTranslation } from "react-i18next";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SimpleInputField from "@/components/inputFields/SimpleInputField";

const CategoryProductTab = ({ categoryData, setSearch, values, setFieldValue }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField nameList={[{ name: `[content][category_product][title]`, placeholder: t("EnterTitle"), title: "Title" }]} />
      <MultiSelectField values={values} setFieldValue={setFieldValue} name={"productCategory"} title="Categories" data={categoryData} />
      <CheckBoxField name={`[content][category_product][status]`} title="Status" />
    </>
  );
};
export default CategoryProductTab;
