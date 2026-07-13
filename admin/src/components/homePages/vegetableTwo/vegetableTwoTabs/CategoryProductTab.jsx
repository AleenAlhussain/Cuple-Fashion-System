import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";

const CategoryProductTab = ({ setSearch, categoryData }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField nameList={[{ name: `[content][category_product][title]`, placeholder: t("Title"), title: "Title" }]} />
      <SearchableSelectInput
        nameList={[
          {
            name: "categoryProductList",
            title: "Categories",
            inputprops: {
              name: "categoryProductList",
              id: "categoryProductList",
              options: categoryData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][category_product][status]`} title="Status" />
    </>
  );
};
export default CategoryProductTab;
