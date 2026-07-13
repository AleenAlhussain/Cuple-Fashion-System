import { useMutation, useQuery } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Row } from "reactstrap";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";
import request from "../../utils/axiosUtils";
import { country, shipping } from "../../utils/axiosUtils/API";
import SuccessHandle from "../../utils/customFunctions/SuccessHandle";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";
import { YupObject, nameSchema } from "../../utils/validation/ValidationSchemas";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import useCustomMutation from "@/utils/hooks/useCustomMutation";

const FormShipping = ({ open, setActive, shippingData, refetch: shippingRefetch }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { refetch, data, isLoading: countryLoader } = useCustomQuery(
    [country],
    () => request({ url: country }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => (res?.data?.data || []).map((country) => ({ id: country.id, name: country.name })),
    },
  );

  const { mutate, isLoading } = useCustomMutation((data) => request({ url: shipping, data, method: "post" }, router), {
    onSuccess: (resDta) => {
      SuccessHandle(resDta, false, false, t("ShippingCreatedSuccessFully"));
      setActive(false);
    },
    onError: (error) => {
      console.error("Shipping API error", error);
      ToastNotification("error");
    },
  });
  const shippingList = Array.isArray(shippingData) ? shippingData : [];
  const usedCountryIds = shippingList.map((el) => el?.country?.id).filter((id) => id != null);
  const countryData = (data || []).filter((country) => !usedCountryIds.includes(country.id));

  useEffect(() => {
    shippingRefetch();
  }, [isLoading]);
  return (
    <ShowModal title="SelectCountry" modalAttr={{ className: "select-country-modal" }} open={open} close={false}>
      <Formik
        enableReinitialize
        initialValues={{
          country_id: [],
          status: true,
        }}
        validationSchema={YupObject({
          status: nameSchema,
        })}
        onSubmit={(values) => {
          const countryIds = Array.isArray(values.country_id)
            ? values.country_id
            : values.country_id
              ? [values.country_id]
              : [];

          if (!countryIds.length) {
            return ToastNotification("error", t("SelectCountry"));
          }

          mutate({
            country_id: countryIds,
            status: values.status,
          });
        }}
      >
        {() => (
          <Form>
            <Row>
              <SearchableSelectInput
                nameList={[
                  {
                    name: "country_id",
                    title: "Country",
                    inputprops: {
                      name: "country_id",
                      id: "country_id",
                      options: countryData,
                    },
                  },
                ]}
              />
            </Row>
            <div className="ms-auto save-back-button">
              <div className="button-box">
                <Btn className="btn-md btn-outline fw-bold" form="permission-form" title="Cancel" onClick={() => setActive(false)} />
                <Btn className="btn-md btn-theme fw-bold" type="submit" title="Submit" />
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </ShowModal>
  );
};

export default FormShipping;
