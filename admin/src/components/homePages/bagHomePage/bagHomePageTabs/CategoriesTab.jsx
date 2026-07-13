import CheckBoxField from "@/components/inputFields/CheckBoxField";
import MultiSelectField from "@/components/inputFields/MultiSelectField";

const CategoriesTab = ({ setSearch, categoryData, values, setFieldValue }) => {

  return (
    <>
      <MultiSelectField values={values} setFieldValue={setFieldValue} name={"categories"} title="Categories" data={categoryData} />
      <CheckBoxField name={`[content][category][status]`} title="Status" />
    </>
  );
};
export default CategoriesTab;
