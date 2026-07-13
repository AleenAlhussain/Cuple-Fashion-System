import Loader from "@/components/commonComponent/Loader";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import MultiSelectField from "@/components/inputFields/MultiSelectField";
import { useTranslation } from "react-i18next";

const BrandTab = ({ values, setFieldValue, brandData, brandLoader }) => {
  const { t } = useTranslation("common");
  if (brandLoader) return <Loader />;

  return (
    <>
      <MultiSelectField values={values} setFieldValue={setFieldValue} name="brandItems" title="Brand" data={brandData} />
      <CheckBoxField name={`[content][brand][status]`} title="Status" />
    </>
  );
};
export default BrandTab;
