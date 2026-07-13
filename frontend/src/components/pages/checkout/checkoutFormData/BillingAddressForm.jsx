import SimpleInputField from "@/components/widgets/inputFields/SimpleInputField";
import SearchableSelectInput from "@/utils/commonComponents/inputFields/SearchableSelectInput";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import { useCallback, useEffect, useMemo, useState } from "react";
import useAxios from "@/utils/api/helpers/useAxios";

// UAE Emirates and Saudi regions for state dropdown (matches database country IDs)
const countryStates = {
  1: [ // UAE (database id: 1)
    { id: "Abu Dhabi", name: "Abu Dhabi" },
    { id: "Dubai", name: "Dubai" },
    { id: "Sharjah", name: "Sharjah" },
    { id: "Ajman", name: "Ajman" },
    { id: "Umm Al Quwain", name: "Umm Al Quwain" },
    { id: "Ras Al Khaimah", name: "Ras Al Khaimah" },
    { id: "Fujairah", name: "Fujairah" },
  ],
  2: [ // Saudi Arabia (database id: 2)
    { id: "Riyadh", name: "Riyadh" },
    { id: "Makkah", name: "Makkah" },
    { id: "Madinah", name: "Madinah" },
    { id: "Eastern Province", name: "Eastern Province" },
    { id: "Asir", name: "Asir" },
    { id: "Tabuk", name: "Tabuk" },
    { id: "Hail", name: "Hail" },
    { id: "Qassim", name: "Qassim" },
  ],
};

const countryAliases = {
  AE: ["united arab emirates", "uae", "emirates", "الإمارات العربية المتحدة", "الامارات العربية المتحدة", "الإمارات", "الامارات"],
  SA: ["saudi arabia", "ksa", "المملكة العربية السعودية", "السعودية"],
  KW: ["kuwait", "الكويت"],
  QA: ["qatar", "قطر"],
};

const stateAliasesByCountry = {
  1: {
    "abu dhabi": ["abu dhabi", "abudhabi", "أبوظبي", "ابوظبي", "أبو ظبي", "ابو ظبي"],
    dubai: ["dubai", "دبي"],
    sharjah: ["sharjah", "الشارقة"],
    ajman: ["ajman", "عجمان"],
    "umm al quwain": ["umm al quwain", "umm al-quwain", "أم القيوين", "ام القيوين"],
    "ras al khaimah": ["ras al khaimah", "ras al-khaimah", "رأس الخيمة", "راس الخيمة"],
    fujairah: ["fujairah", "الفجيرة"],
  },
  2: {
    riyadh: ["riyadh", "الرياض"],
    makkah: ["makkah", "mecca", "مكة", "مكة المكرمة"],
    madinah: ["madinah", "medina", "المدينة", "المدينة المنورة"],
    "eastern province": ["eastern province", "ash sharqiyah", "المنطقة الشرقية", "الشرقية"],
    asir: ["asir", "عسير"],
    tabuk: ["tabuk", "تبوك"],
    hail: ["hail", "حائل"],
    qassim: ["qassim", "القصيم"],
  },
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-_/.,]+/g, " ")
    .trim();

const BillingAddressForm = ({ values, setFieldValue, data = [] }) => {
  const { t, i18n } = useTranslation("common");
  const axios = useAxios();
  const [locationStatus, setLocationStatus] = useState({ state: "idle", message: "" });
  const [autoLocationRequested, setAutoLocationRequested] = useState(false);

  // Use API data for countries (ensures IDs match database)
  const countryOptions = data || [];

  useEffect(() => {
    const billingCountry = values?.billing_address?.country_id;
    if (!billingCountry && values?.country_id) {
      setFieldValue("billing_address.country_id", values.country_id);
    }
  }, [setFieldValue, values?.billing_address?.country_id, values?.country_id]);

  // Get states for selected country
  const selectedCountryId = Number(values?.billing_address?.country_id || values?.country_id || 0);
  const stateOptions = useMemo(() => {
    return countryStates[selectedCountryId] || [];
  }, [selectedCountryId]);

  const hasStateOptions = stateOptions.length > 0;
  const hasManualAddressInput = Boolean(
    values?.billing_address?.street || values?.billing_address?.city || values?.billing_address?.state
  );

  const resolveCountryId = useCallback(
    (locationData) => {
      if (locationData?.country_id && countryOptions.some((item) => String(item.id) === String(locationData.country_id))) {
        return locationData.country_id;
      }

      const normalizedCountryName = normalizeText(locationData?.country);
      let countryCode = String(locationData?.country_code || "").toUpperCase();

      if (!countryCode && normalizedCountryName) {
        const matchedCode = Object.entries(countryAliases).find(([, aliases]) =>
          aliases.some((alias) => normalizeText(alias) === normalizedCountryName)
        );
        countryCode = matchedCode?.[0] || "";
      }

      if (countryCode && countryAliases[countryCode]) {
        const aliases = countryAliases[countryCode].map(normalizeText);
        const match = countryOptions.find((country) => aliases.includes(normalizeText(country.name)));
        if (match) return match.id;
      }

      if (normalizedCountryName) {
        const byName = countryOptions.find((country) => normalizeText(country.name) === normalizedCountryName);
        if (byName) return byName.id;
      }

      return selectedCountryId || null;
    },
    [countryOptions, selectedCountryId]
  );

  const resolveStateValue = useCallback((rawState, countryId) => {
    const stateName = String(rawState || "").trim();
    if (!stateName) return "";

    const options = countryStates[Number(countryId)] || [];
    if (!options.length) return stateName;

    const normalizedState = normalizeText(stateName);
    const direct = options.find((option) => {
      const optionName = normalizeText(option.name);
      const optionId = normalizeText(option.id);
      return optionName === normalizedState || optionId === normalizedState;
    });
    if (direct) return direct.id;

    const aliases = stateAliasesByCountry[Number(countryId)] || {};
    for (const [canonical, valuesList] of Object.entries(aliases)) {
      const matchedAlias = valuesList.some((value) => normalizeText(value) === normalizedState);
      if (!matchedAlias) continue;

      const option = options.find((item) => {
        const optionName = normalizeText(item.name);
        const optionId = normalizeText(item.id);
        return optionName === canonical || optionId === canonical;
      });
      if (option) return option.id;
    }

    const partial = options.find((option) => {
      const optionName = normalizeText(option.name);
      return normalizedState.includes(optionName) || optionName.includes(normalizedState);
    });
    if (partial) return partial.id;

    return "";
  }, []);

  const handleCountryChange = useCallback(
    (name, value) => {
      setFieldValue(name, value);
      setFieldValue("country_id", value);
      setFieldValue("billing_address.state", "");
    },
    [setFieldValue]
  );

  const handleUseLocation = useCallback(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus({ state: "error", message: t("LocationNotSupported") });
      return;
    }

    setLocationStatus({ state: "fetching", message: t("Locating") });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFieldValue("billing_address.latitude", latitude);
        setFieldValue("billing_address.longitude", longitude);

        try {
          const lang = i18n?.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
          const response = await axios.post("/geo/reverse", {
            lat: latitude,
            lng: longitude,
            lang,
          });

          const locationData = response?.data?.data ?? {};
          const resolvedCountryId = resolveCountryId(locationData);
          const targetCountryId = Number(resolvedCountryId || selectedCountryId || 0);

          if (resolvedCountryId) {
            setFieldValue("billing_address.country_id", resolvedCountryId);
            setFieldValue("country_id", resolvedCountryId);
          }

          const stateValue = resolveStateValue(locationData?.state_name || locationData?.state, targetCountryId);
          if (stateValue) {
            setFieldValue("billing_address.state", stateValue);
          } else if ((countryStates[targetCountryId] || []).length > 0) {
            setFieldValue("billing_address.state", "");
          }

          const cityValue = String(
            locationData?.city ||
              locationData?.city_name ||
              locationData?.town ||
              locationData?.suburb ||
              locationData?.locality ||
              ""
          ).trim();
          if (cityValue) {
            setFieldValue("billing_address.city", cityValue);
          }

          const streetValue = String(locationData?.address || locationData?.formatted_address || "").trim();
          if (streetValue) {
            setFieldValue("billing_address.street", streetValue);
          }

          if (stateValue || cityValue || streetValue) {
            setLocationStatus({ state: "success", message: t("LocationDetected") });
          } else {
            setLocationStatus({ state: "error", message: t("LocationFetchFailed") });
          }
        } catch (error) {
          const apiMessage = error?.response?.data?.message;
          setLocationStatus({ state: "error", message: apiMessage || t("LocationFetchFailed") });
        }
      },
      (error) => {
        const rawMessage = String(error?.message || "").toLowerCase();
        let message = t("LocationFetchFailed");

        if (rawMessage.includes("permissions policy")) {
          message = t("LocationPermissionPolicyBlocked");
        } else if (error?.code === 1) {
          message = t("LocationPermissionDenied");
        } else if (error?.code === 2) {
          message = t("LocationUnavailable");
        } else if (error?.code === 3) {
          message = t("LocationTimedOut");
        }

        setLocationStatus({ state: "error", message });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  }, [axios, i18n?.language, resolveCountryId, resolveStateValue, selectedCountryId, setFieldValue, t]);

  useEffect(() => {
    if (autoLocationRequested || hasManualAddressInput) return;
    setAutoLocationRequested(true);
    handleUseLocation();
  }, [autoLocationRequested, handleUseLocation, hasManualAddressInput]);

  return (
    <div className="checkbox-main-box">
      <div className="checkout-title1">
        <h2>{t(`BillingDetails`)}</h2>
      </div>
      <Row className="g-md-4 g-sm-3 g-2 checkout-form">
        <Col xs={12}>
          <div className="billing-location-row">
            {locationStatus.state === "fetching" && (
              <p className="location-status text-muted">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> {t("Locating")}
              </p>
            )}
            {locationStatus.message && (
              <p
                className={`location-status ${
                  locationStatus.state === "error" ? "text-danger" : "text-success"
                }`}
              >
                {locationStatus.message}
              </p>
            )}
          </div>
        </Col>
        <SearchableSelectInput
          nameList={[
            {
              name: "billing_address.country_id",
              require: "true",
              title: "Country",
              toplabel: "Country",
              colprops: { md: 6 },
              inputprops: {
                name: "billing_address.country_id",
                id: "billing_address.country_id",
                options: countryOptions,
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
                name: "billing_address.state",
                require: "true",
                title: "State / Province / Region",
                toplabel: "State / Province / Region",
                colprops: { md: 6 },
                inputprops: {
                  name: "billing_address.state",
                  id: "billing_address.state",
                  options: stateOptions,
                  defaultOption: t("SelectState"),
                },
              },
            ]}
          />
        ) : (
          <SimpleInputField
            nameList={[
              { name: "billing_address.state", placeholder: t("EnterState"), toplabel: "State / Province / Region", colprops: { md: 6 }, require: "true" },
            ]}
          />
        )}
        <SimpleInputField
          nameList={[
            { name: "billing_address.city", placeholder: t("EnterCity"), toplabel: "Town / City", colprops: { md: 6 }, require: "true" },
            { name: "billing_address.street", placeholder: t("EnterAddress"), toplabel: "Street Address", colprops: { xs: 12 }, require: "true" },
          ]}
        />
      </Row>
    </div>
  );
};

export default BillingAddressForm;
