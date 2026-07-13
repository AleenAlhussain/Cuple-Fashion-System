import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";

const ProductList5Tab = ({ productData, setSearch }) => {
  const { t } = useTranslation("common");

  return (
    <>
      <SimpleInputField nameList={[{ name: `[content][products_list_5][title]`, placeholder: t("EnterTitle"), title: "Title" }]} />
      <SearchableSelectInput
        nameList={[
          {
            name: "productList5Product",
            title: "Products",
            inputprops: {
              name: "productList5Product",
              id: "productList5Product",
              options: productData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][products_list_5][status]`} title="Status" />
    </>
  );
};
export default ProductList5Tab;
