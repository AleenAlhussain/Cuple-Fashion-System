import { useTranslation } from "react-i18next";
import { AllCountryCode } from '@/data/AllCountryCode';
import SearchableSelectInput from '../../inputFields/SearchableSelectInput';
import SimpleInputField from '../../inputFields/SimpleInputField';

const StoreVendor = () => {
    
    const { t } = useTranslation( 'common');
    return (
        <>
            <SimpleInputField nameList={[{ name: "name", placeholder: t("EnterName"), require: "true" }, { name: "email", placeholder: t("EnterEmail"), title: "EmailAddress", require: "true" }]} />
            <div className='country-input mb-4'>
                <SimpleInputField nameList={[{ name: "phone", title: "Phone", placeholder: t("EnterPhone"), require: "true", type: 'number' }]} />

                <SearchableSelectInput
                    nameList={[
                        {

                            name: "country_code",
                            notitle: "true",
                            inputprops: {
                                name: "country_code",
                                id: "country_code",
                                options: AllCountryCode,
                            },
                        },
                    ]}
                />
            </div>
        </>
    )
}

export default StoreVendor