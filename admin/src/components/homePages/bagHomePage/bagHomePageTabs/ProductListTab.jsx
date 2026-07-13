import { useTranslation } from "react-i18next";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/inputFields/SimpleInputField";

const ProductList1Tab = ({ productData, setSearch}) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField
        nameList={[
          { name: `[content][products_list][tag]`, placeholder: t("EnterTag"), title: "Tag" },
          { name: `[content][products_list][title]`, placeholder: t("EnterTitle"), title: "Title" },
        ]}
      />
      <SearchableSelectInput
        nameList={[
          {
            name: "productListProduct",
            title: "Products",
            inputprops: {
              name: "productListProduct",
              id: "productListProduct",
              options: productData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][products_list][status]`} title="Status" />
    </>
  );
};
export default ProductList1Tab;
