import MultiSelectField from "@/components/inputFields/MultiSelectField";
import { useTranslation } from "react-i18next";
import CheckBoxField from "@/components/inputFields/CheckBoxField";

const CategoryProductTab = ({ values, setFieldValue, categoryData }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <MultiSelectField values={values} setFieldValue={setFieldValue} name={"categoryProductList"} title="Categories" data={categoryData} />
      <CheckBoxField name={`[content][category_product][status]`} title="Status" />
    </>
  );
};
export default CategoryProductTab;
