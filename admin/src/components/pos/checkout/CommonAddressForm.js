import React, { useEffect, useMemo, useState } from 'react'
import SimpleInputField from '../../inputFields/SimpleInputField'
import SearchableSelectInput from '../../inputFields/SearchableSelectInput'
import { Form, Formik, useFormikContext } from 'formik'
import { YupObject, nameSchema, optionalPhoneSchema } from '@/utils/validation/ValidationSchemas'
import { country, shipping } from '@/utils/axiosUtils/API'
import request from '@/utils/axiosUtils'
import Btn from '@/elements/buttons/Btn'
import { AllCountryCode } from '@/data/AllCountryCode'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import useCustomQuery from '@/utils/hooks/useCustomQuery'

const CommonAddressForm = ({ type, updateId, setModal, addressMutate, customerPhone }) => {
    const router = useRouter()
    const { data: shippingZones } = useCustomQuery(
        [shipping],
        () => request({ url: shipping }, router),
        { enabled: true, refetchOnWindowFocus: false, select: (res) => res?.data?.data || [] }
    );
    const { data: countries, isLoading: countriesLoading } = useCustomQuery(
        [country],
        () => request({ url: country }, router),
        { enabled: true, refetchOnWindowFocus: false, select: (res) => res?.data?.data || [] }
    );
    const { t } = useTranslation('common');
    const allowedCountryIds = useMemo(() => shippingZones?.map((z) => z?.country?.id).filter(Boolean) || [], [shippingZones]);
    const countryOptions = useMemo(() => {
        const list = (countries || []).map((c) => ({ id: c.id, name: c.name, state: c.state || c.states || [] }));
        return allowedCountryIds.length ? list.filter((c) => allowedCountryIds.includes(c.id)) : list;
    }, [countries, allowedCountryIds]);
    const uaeCountryId = useMemo(() => countryOptions?.find((c) => c?.name === 'United Arab Emirates')?.id, [countryOptions]);
    const [selectedCountryId, setSelectedCountryId] = useState(uaeCountryId || "");
    const selectedCountry = useMemo(() => countryOptions?.find((c) => Number(c.id) === Number(selectedCountryId)), [countryOptions, selectedCountryId]);
    const stateOptions = useMemo(() => {
        return selectedCountry?.state || [];
    }, [selectedCountry]);
    const [selectedStateId, setSelectedStateId] = useState("");
    const selectedState = useMemo(() => stateOptions?.find((s) => Number(s.id) === Number(selectedStateId)), [stateOptions, selectedStateId]);
    const cityOptions = useMemo(() => {
        return selectedState?.cities || [];
    }, [selectedState]);
    const showState = stateOptions?.length > 0;
    const showCity = cityOptions?.length > 0;

    const AddressFieldSync = () => {
        const { values, setFieldValue } = useFormikContext();

        useEffect(() => {
            setSelectedCountryId(values.country_id || "");
        }, [values.country_id]);

        useEffect(() => {
            setSelectedStateId(values.state_id || "");
        }, [values.state_id]);

        useEffect(() => {
            if (!values.country_id && uaeCountryId) {
                setFieldValue("country_id", uaeCountryId);
            }
        }, [uaeCountryId, values.country_id]);

        useEffect(() => {
            if (!values.country_id) {
                setFieldValue("state_id", "");
                setFieldValue("city_id", "");
                setFieldValue("city", "");
                return;
            }
            if (stateOptions.length && values.state_id && !stateOptions.some((s) => Number(s.id) === Number(values.state_id))) {
                setFieldValue("state_id", "");
                setFieldValue("city_id", "");
                setFieldValue("city", "");
            }
            if (!stateOptions.length) {
                setFieldValue("state_id", "");
                setFieldValue("city_id", "");
            }
        }, [values.country_id, stateOptions]);

        useEffect(() => {
            if (values.state_id && cityOptions.length && values.city_id && !cityOptions.some((c) => Number(c.id) === Number(values.city_id))) {
                setFieldValue("city_id", "");
            }
            if (!cityOptions.length) {
                setFieldValue("city_id", "");
            }
        }, [values.state_id, cityOptions]);

        return null;
    };

    return (
        <>
            <Formik
                enableReinitialize
                initialValues={{
                    title: "Home",
                    street: "",
                    country_id: uaeCountryId || "",
                    state_id: "",
                    city_id: "",
                    city: "",
                    pincode: "",
                    phone: customerPhone || "",
                    type: type,
                    user_id: updateId,
                    country_code: '971',
                }}
                validationSchema={YupObject({
                    street: nameSchema,
                    city: null,
                    country_id: nameSchema,
                    state_id: showState ? nameSchema : null,
                    city_id: showCity ? nameSchema : null,
                    phone: optionalPhoneSchema,
                })}
                onSubmit={(values) => {
                    const resolvedCity = showCity
                        ? (cityOptions?.find((c) => Number(c.id) === Number(values.city_id))?.name || "")
                        : (showState ? (stateOptions?.find((s) => Number(s.id) === Number(values.state_id))?.name || "") : values.city || "");
                    const payload = {
                        title: values.title || null,
                        street: values.street,
                        city: resolvedCity,
                        country_id: values.country_id,
                        state_id: values.state_id || null,
                        phone: values.phone || null,
                        country_code: values.country_code || null,
                        pincode: values.pincode ? values.pincode.toString() : null,
                        type,
                        user_id: updateId,
                    };
                    addressMutate && addressMutate(payload);
                    setModal(false);
                }}>
                {({ values, setFieldValue }) => (
                    <Form className='row'>
                        <AddressFieldSync />
                        <SimpleInputField nameList={[{ name: "title", placeholder: t("EnterTitle"), title: "Title" }]} />
                        <div className='country-input mb-4'>
                            <SimpleInputField nameList={[{ name: "phone", type: "text", placeholder: "Enter Phone Number" }]} />
                            <SearchableSelectInput
                                nameList={[
                                    {
                                        name: "country_code", notitle: "true", inputprops: { name: "country_code", id: "country_code", options: AllCountryCode, },
                                    },
                                ]}
                            /></div>
                        <SimpleInputField nameList={[{ name: "street", placeholder: "Enter Address", title: "Address", require: "true" }]} />
                        <SearchableSelectInput
                            nameList={[
                                {
                                    name: "country_id", title: "Country",
                                    require: "true",
                                    inputprops: {
                                        name: "country_id",
                                        id: "country_id",
                                        options: countryOptions,
                                        defaultOption: "Select country",
                                        helpertext: countriesLoading ? "Loading..." : "",
                                    },
                                    disabled: false,
                                },
                                {
                                    name: "state_id", title: values?.["country_id"] == uaeCountryId ? "Emirate" : "State",
                                    require: showState ? "true" : "false",
                                    inputprops: {
                                        name: "state_id",
                                        id: "state_id",
                                        options: showState ? stateOptions : [],
                                        defaultOption: values?.["country_id"] == uaeCountryId ? "Select emirate" : "Select state",
                                        helpertext: values?.["country_id"] ? (showState ? "" : "No states available for selected country") : "",
                                    },
                                    disabled: values?.["country_id"] ? false : true,
                                },
                            ]}
                        />
                        {showCity ? (
                          <SearchableSelectInput
                            nameList={[
                              {
                                name: "city_id",
                                title: "City",
                                require: "true",
                                inputprops: {
                                  name: "city_id",
                                  id: "city_id",
                                  options: cityOptions,
                                  defaultOption: "Select city",
                                  helpertext: values?.["state_id"] ? (cityOptions.length ? "" : "No cities available for selected state") : "",
                                },
                                disabled: values?.["state_id"] ? false : true,
                              },
                            ]}
                          />
                        ) : null}
                        <SimpleInputField nameList={[{ name: "pincode", title: "Pincode", type: 'text', placeholder: "Enter Pincode" }]} />

                        <div className="ms-auto justify-content-center dflex-wgap save-back-button">
                            <Btn className="btn-md btn-secondary fw-bold" title="Cancel" onClick={() => { setModal(false) }} />
                            <Btn className="btn-md btn-theme fw-bold" type="submit" title="Save"  />
                        </div>
                    </Form>
                )
                }
            </Formik>

        </>
    )
}

export default CommonAddressForm
