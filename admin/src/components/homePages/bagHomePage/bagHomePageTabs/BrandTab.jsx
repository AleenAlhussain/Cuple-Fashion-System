import Loader from "@/components/commonComponent/Loader";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import MultiSelectField from "@/components/inputFields/MultiSelectField";

const BrandTab = ({ values, setFieldValue, noDescription, brandData, brandLoader }) => {

  if (brandLoader) return <Loader />;
  return (
    <>
      <MultiSelectField values={values} setFieldValue={setFieldValue} name="brandItems" title="Brand" data={brandData} />
      <CheckBoxField name={`[content][brand][status]`} title="Status" />
    </>
  );
};
export default BrandTab;
