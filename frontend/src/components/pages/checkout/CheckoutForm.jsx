import useAxios from "@/utils/api/helpers/useAxios";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { CountryAPI } from "@/utils/api";
import AccountSection from "./checkoutFormData/AccountSection";
import BillingAddressForm from "./checkoutFormData/BillingAddressForm";
import DeliverySection from "./checkoutFormData/DeliverySection";
import PaymentSection from "./checkoutFormData/PaymentSection";

const CheckoutForm = ({ values, setFieldValue, errors, emailExists, setEmailExists, checkingEmail, setCheckingEmail, onStripeReady }) => {
  const axios = useAxios();

  const { data: countriesData } = useFetchQuery(
    ["shipping-countries"],
    async () => {
      const response = await axios.get("/shipping/countries");
      return response?.data?.data ?? [];
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10, // Cache for 10 minutes
        select: (countries) =>
          countries?.map((country) => ({ id: country.id, name: country.name, state: country.state })) ?? [],
    }
  );

  // Ensure data is always an array
  const data = countriesData || [];

  return (
    <>
      <AccountSection setFieldValue={setFieldValue} values={values} emailExists={emailExists} setEmailExists={setEmailExists} checkingEmail={checkingEmail} setCheckingEmail={setCheckingEmail} />
      <BillingAddressForm setFieldValue={setFieldValue} errors={errors} data={data} values={values} />
      <DeliverySection values={values} setFieldValue={setFieldValue} />
      <PaymentSection values={values} setFieldValue={setFieldValue} setStripeConfirmHandler={onStripeReady} />
    </>
  );
};

export default CheckoutForm;
