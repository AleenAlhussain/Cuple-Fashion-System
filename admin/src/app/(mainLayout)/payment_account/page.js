'use client'
import PaymentDetailsForm from "@/components/paymentDetails"
import FormWrapper from "@/utils/hoc/FormWrapper"

const PaymentDetails = () => {
    return (
        <FormWrapper title="Payment Details">
            <PaymentDetailsForm />
        </FormWrapper>
    )
}
export default PaymentDetails