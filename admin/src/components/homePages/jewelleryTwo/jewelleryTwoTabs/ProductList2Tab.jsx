import { useTranslation } from "react-i18next";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";

const ProductList2Tab = ({ productData, setSearch }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "productList2Product",
            title: "Products",
            inputprops: {
              name: "productList2Product",
              id: "productList2Product",
              options: productData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][products_list_2][status]`} title="Status" />
    </>
  );
};
export default ProductList2Tab;
