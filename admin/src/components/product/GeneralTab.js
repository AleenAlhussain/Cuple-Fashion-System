import React, { useContext } from "react";
import request from "../../utils/axiosUtils";
import { store } from "../../utils/axiosUtils/API";
import SimpleInputField from "../inputFields/SimpleInputField";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import DescriptionInput from "../widgets/DescriptionInput";
import SettingContext from "../../helper/settingContext";
import { useTranslation } from "react-i18next";
import AccountContext from "@/helper/accountContext";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const GeneralTab = ({ values, setFieldValue, updateId }) => {
  const { t } = useTranslation("common");
  const { state } = useContext(SettingContext);
  const { role } = useContext(AccountContext);
  const router = useRouter();
  const { data: StoreData } = useCustomQuery([store], () => request({ url: store, params: { status: 1 } }, router), { refetchOnWindowFocus: false, select: (data) => data.data.data.map((item) => ({ id: item.id, name: item.store_name })) });
  return (
    <>
      {/* Product type is always Variable Product - hidden field */}
      {state?.isMultiVendor && role === "admin" && (
        <SearchableSelectInput
          nameList={[
            {
              name: "store_id",
              title: "Store",
              require: "true",
              inputprops: {
                name: "store_id",
                id: "store_id",
                options: StoreData || [],
                close: false,
              },
            },
          ]}
        />
      )}
      <SimpleInputField
        nameList={[
          { name: "name", require: "true", placeholder: t("EnterName") },
          { name: "name_ar", title: "ArabicName", placeholder: t("EnterArabicName") || "Enter Arabic Name", dir: "rtl" },
          { name: "short_description", require: "true", title: "ShortDescription", type: "textarea", rows: 3, placeholder: t("EnterShortDescription"), helpertext: "*Maximum length should be 300 characters." },
          { name: "short_description_ar", title: "ArabicShortDescription", type: "textarea", rows: 3, placeholder: t("EnterArabicShortDescription") || "Enter Arabic Short Description", dir: "rtl" },
        ]}
      />
      <DescriptionInput
        values={values}
        setFieldValue={setFieldValue}
        title={t("Description")}
        nameKey="description"
      />
      <DescriptionInput
        values={values}
        setFieldValue={setFieldValue}
        title={t("ArabicDescription") || "Arabic Description"}
        nameKey="description_ar"
      />
    </>
  );
};

export default GeneralTab;
