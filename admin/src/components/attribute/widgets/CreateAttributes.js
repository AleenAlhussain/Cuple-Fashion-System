import SimpleInputField from '../../inputFields/SimpleInputField'
import SearchableSelectInput from '../../inputFields/SearchableSelectInput'
import { variantStyle } from '../../../data/TabTitleList'
import { useTranslation } from "react-i18next";

const CreateAttributes = () => {

    const { t } = useTranslation( 'common');
    return (
        <>
            <SimpleInputField nameList={[
                { name: "name", title: "Name", placeholder: t("EnterAttributeName"), require: "true", helpertext: "*Name for the attribute (shown on the front-end)." },
                { name: "slug", title: "Slug", placeholder: t("EnterSlug"), helpertext: "*Unique slug/reference for the attribute; must be no more than 28 characters." }
            ]} />
            <SearchableSelectInput
                nameList={[
                    {
                        name: "style",
                        title: "Type",
                        require: "true",
                        inputprops: {
                            name: "style",
                            id: "style",
                            options: variantStyle,
                            helpertext: "*Determines how this attribute's values are displayed."
                        },
                    },
                ]}
            />
        </>
    )
}

export default CreateAttributes