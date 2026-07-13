import useAxios from "@/utils/api/helpers/useAxios";
import { CountryAPI } from "@/utils/api";
import { phoneSchema } from "@/utils/validation/ValidationSchema";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { Formik } from "formik";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import SelectForm from "./SelectForm";
import * as Yup from "yup";

const combineName = (address) => {
  if (!address) return "";
  if (address.name) return address.name;
  const parts = [address.first_name, address.last_name].filter(Boolean);
  return parts.join(" ").trim();
};

const AddAddressForm = ({
  isLoading,
  type,
  editAddress,
  setEditAddress,
  modal,
  setModal,
  isFooterDisplay,
  method,
  mutate,
  autoLocationKey,
}) => {
  const axios = useAxios();
  const { t } = useTranslation("common");

  useEffect(() => {
    if (modal !== "edit" && setEditAddress) {
      setEditAddress({});
    }
  }, [modal, setEditAddress]);

  const { data: countriesData } = useFetchQuery(
    ["countries"],
    async () => {
      const response = await axios.get(CountryAPI);
      return response?.data?.data ?? [];
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10,
      select: (countries) =>
        countries?.map((country) => ({
          id: country.id,
          name: country.name,
          code: country.code,
          state: country.state,
        })) ?? [],
    }
  );

  const data = countriesData || [];

  const initialValues = {
    type: type ?? null,
    name: editAddress ? combineName(editAddress) : "",
    title: editAddress ? editAddress?.title : "",
    email: editAddress ? editAddress?.email : "",
    phone: editAddress ? editAddress?.phone : "",
    phone_code: editAddress ? editAddress?.country_code : "971",
    country_code: editAddress ? editAddress?.country_code : "971",
    address_line: editAddress?.address_line ?? editAddress?.street ?? "",
    formatted_address: editAddress?.formatted_address ?? "",
    latitude: editAddress?.latitude ?? "",
    longitude: editAddress?.longitude ?? "",
    country_id: editAddress ? editAddress?.country_id : "",
    state_id: editAddress ? editAddress?.state_id : "",
    state: editAddress ? editAddress?.state ?? "" : "",
    city: editAddress ? editAddress?.city : "",
    city_id: editAddress ? editAddress?.city_id : "",
    apartment: editAddress ? editAddress?.apartment : "",
  };

  const validationSchema = Yup.object().shape({
    name: Yup.string().required(t("PleaseEnterName")),
    email: Yup.string().email(t("EnterValidEmail")).required(t("PleaseEnterEmail")),
    phone_code: Yup.string().required(t("PleaseEnterPhone")),
    phone: phoneSchema,
    country_id: Yup.number().required(t("PleaseSelectCountry")),
    state_id: Yup.number().required(t("PleaseSelectState")),
    city: Yup.string().required(t("PleaseEnterCity")),
    address_line: Yup.string().when(["latitude", "longitude"], {
      is: (latitude, longitude) => !latitude && !longitude,
      then: (schema) => schema.required(t("PleaseEnterAddress")),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        const payload = {
          ...values,
          country_id: values.country_id ? Number(values.country_id) : undefined,
          state_id: values.state_id ? Number(values.state_id) : undefined,
          city_id: values.city_id ? Number(values.city_id) : undefined,
          latitude: values.latitude || null,
          longitude: values.longitude || null,
          type: type ?? values.type,
        };

        if (!payload.country_id) {
          delete payload.country_id;
        }
        if (!payload.state_id) {
          delete payload.state_id;
        }
        if (!payload.city_id) {
          delete payload.city_id;
        }
        if (!payload.type) {
          delete payload.type;
        }

        if (editAddress) {
          payload["_method"] = method ? method : "PUT";
        }

        if (mutate) {
          mutate(payload);
        } else {
          setModal(false);
        }
      }}
    >
      {({ values, setFieldValue, errors, touched, isSubmitting }) => (
          <SelectForm
            values={values}
            setFieldValue={setFieldValue}
            setModal={setModal}
            isLoading={isLoading || isSubmitting}
            data={data}
            isFooterDisplay={isFooterDisplay}
            errors={errors}
            touched={touched}
            autoUseLocation={!Boolean(editAddress)}
            autoLocationKey={autoLocationKey}
          />
      )}
    </Formik>
  );
};

export default AddAddressForm;
