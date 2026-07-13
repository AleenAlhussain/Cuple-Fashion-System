import { Form } from "formik";
import { useCallback, useEffect, useState } from "react";
import { Col, ModalFooter, Row } from "reactstrap";
import Btn from "@/elements/buttons/Btn";
import { useTranslation } from "react-i18next";
import SearchableSelectInput from "@/utils/commonComponents/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/widgets/inputFields/SimpleInputField";
import useAxios from "@/utils/api/helpers/useAxios";
import { AllCountryCode } from "@/data/CountryCode";

const friendlyErrorMap = {
  name: "PleaseEnterName",
  email: "PleaseEnterEmail",
  phone: "PleaseEnterPhone",
  country_id: "PleaseSelectCountry",
  state_id: "PleaseSelectState",
  city_id: "PleaseSelectCity",
  address_line: "PleaseEnterAddress",
};

const SelectForm = ({
  values,
  setFieldValue,
  isLoading,
  data = [],
  setModal,
  isFooterDisplay = true,
  errors,
  touched,
  autoUseLocation = false,
  autoLocationKey,
}) => {
  const { t } = useTranslation("common");
  const axios = useAxios();
  const [locationStatus, setLocationStatus] = useState({ state: "idle", message: "" });
  const countries = data || [];
  const countrySelection = countries.find((country) => String(country.id) === String(values?.country_id));
  const stateOptions = countrySelection?.state ?? [];
  const hasStateOptions = stateOptions?.length > 0;
  const selectedState = stateOptions.find((state) => String(state.id) === String(values?.state_id));
  const cityOptions = selectedState?.cities ?? [];

  const handleCountryChange = (name, value) => {
    setFieldValue(name, value);
    setFieldValue("state_id", "");
    setFieldValue("state", "");
    setFieldValue("city_id", "");
    setFieldValue("city", "");
  };

  const handleStateChange = (name, value) => {
    setFieldValue(name, value);
    const match = stateOptions.find((state) => String(state.id) === String(value));
    setFieldValue("state", match?.name ?? "");
    setFieldValue("city_id", "");
    setFieldValue("city", "");
  };

  const handleCityChange = (name, value) => {
    setFieldValue(name, value);
    const match = cityOptions.find((city) => String(city.id) === String(value));
    if (match) {
      setFieldValue("city", match.name);
    }
  };

  const handlePhoneCodeChange = (name, value) => {
    setFieldValue("phone_code", value);
    setFieldValue("country_code", value);
  };

  const validationErrors = Object.keys(friendlyErrorMap)
    .filter((key) => touched[key] && errors[key])
    .map((key) => t(friendlyErrorMap[key]) || errors[key]);

  const handleUseLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus({ state: "error", message: t("LocationNotSupported") });
      return;
    }

    setLocationStatus({ state: "fetching", message: t("Locating") });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFieldValue("latitude", latitude);
        setFieldValue("longitude", longitude);

        try {
          const response = await axios.post("/geo/reverse", {
            lat: latitude,
            lng: longitude,
          });
          const locationData = response?.data?.data ?? {};
          const formattedAddress = locationData.formatted_address || "";

          if (formattedAddress) {
            setFieldValue("formatted_address", formattedAddress);
            setFieldValue("address_line", formattedAddress);
          }

          if (locationData.country_id) {
            setFieldValue("country_id", locationData.country_id);
          }
          setFieldValue("state_id", locationData.state_id ?? "");
          setFieldValue("state", locationData.state_name ?? "");
          setFieldValue("city_id", locationData.city_id ?? "");
          setFieldValue("city", locationData.city_name ?? "");

          setLocationStatus({ state: "success", message: t("LocationDetected") });
        } catch (error) {
          const message = error?.response?.data?.message || t("LocationFetchFailed");
          setLocationStatus({ state: "error", message });
        }
      },
      (error) => {
        const message = error?.message || t("LocationPermissionDenied");
        setLocationStatus({ state: "error", message });
      },
      { enableHighAccuracy: true }
    );
  }, [axios, countries, stateOptions, setFieldValue, t, values.city]);

  const [autoLocationTriggered, setAutoLocationTriggered] = useState(false);
  const [lastAutoLocationKey, setLastAutoLocationKey] = useState(null);

  useEffect(() => {
    if (autoUseLocation) {
      if (!autoLocationTriggered || autoLocationKey !== lastAutoLocationKey) {
        handleUseLocation();
        setAutoLocationTriggered(true);
        setLastAutoLocationKey(autoLocationKey);
      }
    } else if (autoLocationTriggered) {
      setAutoLocationTriggered(false);
    }
  }, [autoUseLocation, autoLocationKey, autoLocationTriggered, handleUseLocation, lastAutoLocationKey]);

  return (
    <Form>
      <Row className="g-3">
        <SimpleInputField
          nameList={[
            {
              name: "name",
              placeholder: t("EnterFullName"),
              toplabel: "FullName",
              colprops: { xs: 12 },
              require: "true",
            },
            {
              name: "email",
              placeholder: t("EnterEmailAddress"),
              toplabel: "EmailAddress",
              colprops: { xs: 12 },
              require: "true",
            },
            {
              name: "title",
              placeholder: t("EnterTitle"),
              toplabel: "Title",
              colprops: { xs: 12 },
              require: "false",
            },
          ]}
        />
        <Col xs={12}>
          <div className="address-line-with-location">
            <SimpleInputField
              nameList={[
                {
                  name: "address_line",
                  placeholder: t("EnterAddress"),
                  toplabel: "Address",
                  colprops: { xs: 12 },
                  require: "true",
                },
              ]}
            />
            <button
              type="button"
              className="btn btn-link location-btn"
              onClick={handleUseLocation}
              disabled={locationStatus.state === "fetching"}
            >
              {locationStatus.state === "fetching" ? t("Locating") : t("UseMyLocation")}
            </button>
          </div>
          {locationStatus.message && (
            <p
              className={`location-status ${
                locationStatus.state === "error" ? "text-danger" : "text-success"
              } mb-2`}
            >
              {locationStatus.message}
            </p>
          )}
        </Col>
        <Col xs="12">
          <div className="country-input position-relative phone-field">
            <SimpleInputField
              nameList={[
                {
                  name: "phone",
                  type: "tel",
                  placeholder: t("EnterPhoneNumber"),
                  require: "true",
                  toplabel: "Phone",
                  colclass: "country-input-box",
                  maxLength: 15,
                },
              ]}
            />
            <SearchableSelectInput
              nameList={[
                {
                  name: "phone_code",
                  notitle: "true",
                  inputprops: {
                    name: "phone_code",
                    id: "phone_code",
                    options: AllCountryCode,
                  },
                  setvalue: handlePhoneCodeChange,
                },
              ]}
            />
          </div>
        </Col>
        <SearchableSelectInput
          nameList={[
            {
              name: "country_id",
              require: "true",
              toplabel: "Country",
              colprops: { sm: 6 },
              inputprops: {
                name: "country_id",
                id: "country_id",
                options: countries,
                defaultOption: t("SelectCountry"),
              },
              setvalue: handleCountryChange,
            },
          ]}
        />
        {hasStateOptions ? (
          <SearchableSelectInput
            nameList={[
              {
                name: "state_id",
                require: "true",
                title: "State",
                label: "State",
                colprops: { sm: 6 },
                inputprops: {
                  name: "state_id",
                  id: "state_id",
                  options: stateOptions,
                  defaultOption: t("SelectState"),
                },
                disabled: !values?.country_id,
                setvalue: handleStateChange,
              },
            ]}
          />
        ) : (
          <SimpleInputField
            nameList={[
              {
                name: "state",
                placeholder: t("EnterState"),
                toplabel: "State/Province",
                colprops: { sm: 6 },
                require: "false",
              },
            ]}
          />
        )}
        {cityOptions.length > 0 ? (
          <SearchableSelectInput
            nameList={[
              {
                name: "city_id",
                require: "true",
                title: "City",
                label: "City",
                colprops: { xs: 12 },
                inputprops: {
                  name: "city_id",
                  id: "city_id",
                  options: cityOptions,
                  defaultOption: t("SelectCity"),
                },
                setvalue: handleCityChange,
              },
            ]}
          />
        ) : (
          <SimpleInputField
            nameList={[
              {
                name: "city",
                placeholder: t("EnterCity"),
                toplabel: "City",
                colprops: { xs: 12 },
                require: "true",
              },
            ]}
          />
        )}

        {isFooterDisplay && (
          <>
            {validationErrors.length > 0 && (
              <Col xs={12}>
                <div className="text-danger small mb-2">
                  {validationErrors.map((message, index) => (
                    <div key={index}>{message}</div>
                  ))}
                </div>
              </Col>
            )}
            <ModalFooter className="ms-auto justify-content-end save-back-button">
              <Btn size="md" className="btn-outline fw-bold" title={t("Cancel")} onClick={() => setModal(false)} />
              <Btn className="btn-solid" type="submit" title={t("Submit")} loading={Number(isLoading)} />
            </ModalFooter>
          </>
        )}
      </Row>
    </Form>
  );
};

export default SelectForm;
