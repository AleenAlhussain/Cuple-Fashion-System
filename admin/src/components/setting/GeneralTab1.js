import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import SimpleInputField from "../inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";

const GeneralTab1 = () => {
  
  const { t } = useTranslation( 'common');
  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "[values][general][admin_site_language_direction]",
            title: "Direction",
            inputprops: {
              name: "[values][general][admin_site_language_direction]",
              id: "[values][general][admin_site_language_direction]",
              options: [{ name: 'RTL', id: "rtl" }, { name: 'LTR', id: "ltr" }]
            },
          },
        ]}
      />
      <SimpleInputField
        nameList={[
          { name: "[values][general][min_order_amount]", title: "MinimunOrderAmount", placeholder: t("EnterMinOrderAmount"), helpertext: "*Please enter the minimum amount required for an order to be processed." },
          { name: "[values][general][min_order_free_shipping]", type: 'number', title: "MinimumOrderFreeShipping", placeholder: t("EnterMinOrderFreeShipping"), helpertext: "*Please enter the minimum order amount for free shipping" },
          { name: "[values][general][cod_fee]", type: 'number', title: "CashOnDeliveryFee", placeholder: t("EnterCODFee"), helpertext: "*Fee applied when Cash On Delivery is selected" },
          { name: "[values][general][product_sku_prefix]", title: "StorePrefix", placeholder: t("EnterStorePrefix") }]}
      />
      <SearchableSelectInput
        nameList={[
          {
            name: "[values][general][mode]",
            title: "Mode",
            inputprops: {
              name: "[values][general][mode]",
              id: "[values][general][mode]",
              options: [
                { id: "light-only", name: "Light" },
                { id: "dark-only", name: "Dark" }
              ],
            },
          },
        ]}
      />
      <SimpleInputField
        nameList={[{ name: "[values][general][copyright]", title: "Copyright", placeholder: t("EnterCopyright") },
        ]}
      />
    </>
  );
};

export default GeneralTab1;
