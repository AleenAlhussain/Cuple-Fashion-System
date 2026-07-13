import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import { useTranslation } from "react-i18next";

const CouponsTab = ({ couponsData, setSearch }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "couponsList",
            title: "Coupons",
            inputprops: {
              name: "couponsList",
              id: "couponsList",
              options: couponsData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][coupons][status]`} title="Status" />
    </>
  );
};
export default CouponsTab;
