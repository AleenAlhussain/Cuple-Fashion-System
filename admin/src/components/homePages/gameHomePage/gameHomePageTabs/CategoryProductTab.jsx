import CheckBoxField from "@/components/inputFields/CheckBoxField";
import MultiSelectField from "@/components/inputFields/MultiSelectField";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";

const CategoryProductTab = ({ values, setFieldValue, categoryData }) => {
  const { t } = useTranslation("common");

  return (
    <>
      <SimpleInputField
        nameList={[
          { name: `[content][category_product][tag]`, placeholder: t("EnterTag"), title: "Tag" },
          { name: `[content][category_product][title]`, placeholder: t("EnterTitle"), title: "Title" },
          { name: `[content][category_product][description]`, placeholder: t("EnterDescription"), title: "Description" },
        ]}
      />
      <MultiSelectField values={values} setFieldValue={setFieldValue} name="productCategories" title="Categories" data={categoryData} />
      <CheckBoxField name={`[content][category_product][status]`} title="Status" />
    </>
  );
};
export default CategoryProductTab;
