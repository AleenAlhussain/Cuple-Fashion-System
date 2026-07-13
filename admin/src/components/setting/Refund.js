import { useTranslation } from "react-i18next";
import CheckBoxField from '../inputFields/CheckBoxField';
import SimpleInputField from '../inputFields/SimpleInputField';

const RefundTab = ({ values }) => {
    
    const { t } = useTranslation( 'common');
    return (
        <div>
            <CheckBoxField name="[values][refund][status]" title="Status" />
            <SimpleInputField
                nameList={[
                    { name: "[values][refund][refundable_days]", title: "RefundableDays", placeholder: t("EnterRefundableDays"), helpertext: "*Define the period within which users can initiate refund requests for delivered items If left blank, this functionality will be disabled." },
                    { name: "[values][refund][aramex_return_account_number]", title: "AramexReturnAccountNumber", placeholder: t("EnterAramexReturnAccountNumber"), helpertext: "*Optional. If set, this account number is used for Aramex return shipments." }
                ]}
            />
        </div>
    )
}

export default RefundTab
