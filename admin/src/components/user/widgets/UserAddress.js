import request from '../../../utils/axiosUtils'
import { country } from '../../../utils/axiosUtils/API'
import CheckBoxField from '../../inputFields/CheckBoxField'
import SearchableSelectInput from '../../inputFields/SearchableSelectInput'
import SimpleInputField from '../../inputFields/SimpleInputField'
import { useTranslation } from "react-i18next"
import { useRouter } from 'next/navigation'
import useCustomQuery from '@/utils/hooks/useCustomQuery'

const UserAddress = ({ addAddress, type }) => {
    const router = useRouter();
    const { t } = useTranslation( 'common');
    const { data } = useCustomQuery([country], () => request({ url: country },router), { enabled: addAddress ? true : false, refetchOnWindowFocus: false, select: (res) => res.data.map((country) => ({ id: country.id, name: country.name, state: country.state })) });
    return (
        <>
            {addAddress && (
                <>
                    <SimpleInputField nameList={[{ name: "address[0][title]", placeholder: t("EnterTitle"), title: "Title" }, { name: "address[0][street]", placeholder: "Enter Street", title: "Street" }]} />
                    {!type && (
                        <SearchableSelectInput
                            nameList={[
                                {
                                    name: "address[0][type]",
                                    inputprops: {
                                        name: "address[0][type]",
                                        id: "address[0][type]",
                                        options: [
                                            { id: "billing", name: "Billing" },
                                            { id: "shipping", name: "Shipping" },
                                        ],
                                        defaultOption: "Select state",
                                    },
                                },
                            ]}
                        />
                    )}
                    <SimpleInputField nameList={[{ name: "address[0][city]", title: "City" }]} />
                    <SearchableSelectInput
                        nameList={[
                            {
                                name: "address[0][country_id]", title: "Country",
                                inputprops: {
                                    name: "address[0][country_id]",
                                    id: "address[0][country_id]",
                                    options: data,
                                    defaultOption: "Select state",
                                },
                            },
                            {
                                name: "address[0][state_id]", title: "State",
                                inputprops: {
                                    name: "address[0][state_id]",
                                    id: "address[0][state_id]",
                                    options: values?.["address"][0]?.["country_id"] ? data.filter((country) => Number(country.id) === Number(values?.["address"][0]?.["country_id"]))?.[0]?.["state"] : [],
                                    defaultOption: "Select state",
                                },
                                disabled: values?.["address"][0]?.["country_id"] ? false : true,
                            },
                        ]}
                    />
                    <SimpleInputField nameList={[{ name: "address[0][pincode]", title: "Pincode" }, { name: "phone", type: "number", placeholder: "Enter Phone Number" }]} />
                    <CheckBoxField name="address[0][is_default]" title="Is_Default" />
                </>
            )}
        </>
    )
}

export default UserAddress