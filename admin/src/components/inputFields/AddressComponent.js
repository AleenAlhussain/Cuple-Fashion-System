import request from "../../utils/axiosUtils";
import { country } from "../../utils/axiosUtils/API";
import SearchableSelectInput from "./SearchableSelectInput";
import SimpleInputField from "./SimpleInputField";
import Loader from "../commonComponent/Loader";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const AddressComponent = ({ values, noAddress, isRequired = true }) => {
  const router = useRouter()
  const { t } = useTranslation( 'common');
  const { data, isLoading } = useCustomQuery([country], () => request({ url: country },router), { refetchOnWindowFocus: false, select: (res) => res.data.map((country) => ({ id: country.id, name: country.name, state: country.state })) });
  if (isLoading) return <Loader />;
  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "country_id",
            require: isRequired ? "true" : undefined,
            title: "Country",
            inputprops: {
              name: "country_id",
              id: "country_id",
              options: data,
              defaultOption: "Select state",
              close: (values['country_id'] !== '') ? true : false
            },
          },
          {
            name: "state_id",
            require: isRequired ? "true" : undefined,
            title: "State",
            inputprops: {
              name: "state_id",
              id: "state_id",
              options: values["country_id"] ? data.filter((country) => Number(country.id) === Number(values["country_id"]))?.[0]?.["state"] : [],
              defaultOption: "Select state",
              close: values['state_id'] !== '' ? true : false
            },
            disabled: values["country_id"] ? false : true,
          },
        ]}
      />
      <SimpleInputField nameList={[{ name: "city", placeholder: t("EnterCity"), require: isRequired ? "true" : undefined }]} />
      {!noAddress && <SimpleInputField nameList={[{ name: "address", type: "textarea", placeholder: t("EnterAddress"), require: isRequired ? "true" : undefined }]} />}
      <SimpleInputField nameList={[{ name: "pincode", placeholder: t("EnterPincode"), require: isRequired ? "true" : undefined }]} />
    </>
  );
};

export default AddressComponent;
