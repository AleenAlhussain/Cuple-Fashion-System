import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";

const ProductList1Tab = ({ productData, setSearch}) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField
        nameList={[
          { name: `[content][product_list_1][tag]`, placeholder: t("EnterTag"), title: "Tag" },
          { name: `[content][product_list_1][title]`, placeholder: t("EnterTitle"), title: "Title" },
          { name: `[content][product_list_1][description]`, placeholder: t("EnterDescription"), title: "Description" },
        ]}
      />
      <SearchableSelectInput
        nameList={[
          {
            name: "productList1Product",
            title: "Products",
            inputprops: {
              name: "productList1Product",
              id: "productList1Product",
              options: productData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][product_list_1][status]`} title="Status" />
    </>
  );
};
export default ProductList1Tab;
