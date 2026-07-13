import { useTranslation } from "react-i18next";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import MultiSelectField from "@/components/inputFields/MultiSelectField";

const CategoriesTab = ({  categoryData, values, setFieldValue }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <MultiSelectField values={values} setFieldValue={setFieldValue} name={"categories"} title="Categories" data={categoryData} />
      <CheckBoxField name={`[content][categories][status]`} title="Status" />
    </>
  );
};
export default CategoriesTab;
