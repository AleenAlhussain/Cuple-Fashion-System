import SimpleInputField from "../inputFields/SimpleInputField";
import request from "@/utils/axiosUtils";
import { coupon } from "@/utils/axiosUtils/API";
import { useTranslation } from "react-i18next";
import CheckBoxField from "../inputFields/CheckBoxField";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const CouponTab = ({ values, setFieldValue }) => {
  
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: couponData, isLoading: categoryLoader } = useCustomQuery(
    [coupon],
    () => request({ url: coupon },router),
    {
      refetchOnWindowFocus: false,
      select: (res) =>
        res?.data?.data.map((elem) => {
          return { id: elem.id, name: elem.title };
        }),
    }
  );
  return (
    <>
      <SimpleInputField
        nameList={[
          {
            name: `[values][coupons][title]`,
            placeholder: t("EnterTitle"),
            title: "Title",
          },
          {
            name: `[values][coupons][description]`,
            placeholder: t("EnterDescription"),
            title: "Description",
          },
        ]}
      />
      <SearchableSelectInput
        nameList={[
          {
            name: "couponIds",
            title: "coupons",
            inputprops: {
              name: "couponIds",
              id: "couponIds",
              options: couponData || [],
            },
          },
        ]}
      />
      <CheckBoxField name={`[values][coupons][status]`} title="Status" />
    </>
  );
};

export default CouponTab;
