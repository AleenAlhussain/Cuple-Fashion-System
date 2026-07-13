import SearchableSelectInput from "@/components/widgets/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/widgets/inputFields/SimpleInputField";
import { AllCountryCode } from "@/data/CountryCode";
import Btn from "@/elements/buttons/Btn";
import { Form } from "formik";
import { useTranslation } from "react-i18next";
import { Col, ModalFooter, Row } from "reactstrap";

const SelectForm = ({ values, setFieldValue, isLoading, data, setModal, isFooterDisplay = true }) => {
  const { t } = useTranslation("common");

  // Get states for selected country
  const selectedCountry = data?.find((country) => Number(country.id) === Number(values?.["country_id"]));
  const stateOptions = selectedCountry?.state || [];

  // Handler to reset state when country changes
  const handleCountryChange = (name, value) => {
    setFieldValue(name, value);
    setFieldValue("state_id", ""); // Reset state when country changes
  };

  return (
    <Form>
      <Row>
        <SimpleInputField
          nameList={[
            { name: "title", placeholder: t("EnterTitle"), toplabel: "Title", colprops: { xs: 12 }, require: "true" },
            { name: "street", placeholder: t("EnterAddress"), toplabel: "Address", colprops: { xs: 12 }, require: "true" },
          ]}
        />
        <Col xs="12" className="phone-field">
          <div className="country-input position-relative">
            <SimpleInputField nameList={[{ name: "phone", type: "number", placeholder: t("EnterPhoneNumber"), require: "true", toplabel: "Phone", colclass: "country-input-box" }]} />
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
        </Col>
        <SearchableSelectInput
          nameList={[
            {
              name: "country_id",
              require: "true",
              title: "Country",
              toplabel: "Country",
              colprops: { xxl: 6, lg: 12, sm: 6 },
              inputprops: {
                name: "country_id",
                id: "country_id",
                options: data,
                defaultOption: t("SelectCountry"),
              },
              setvalue: handleCountryChange,
            },
            {
              name: "state_id",
              require: "true",
              title: "State",
              toplabel: "State",
              colprops: { xxl: 6, lg: 12, sm: 6 },
              inputprops: {
                name: "state_id",
                id: "state_id",
                options: stateOptions,
                defaultOption: t("SelectState"),
              },
              disabled: !values?.["country_id"],
            },
          ]}
        />
        <SimpleInputField
          nameList={[
            { name: "city", placeholder: t("EnterCity"), toplabel: "City", colprops: { xs: 12 }, require: "true" },
          ]}
        />

        <Col xs="12">
          {isFooterDisplay && (
            <ModalFooter className="ms-auto justify-content-end save-back-button mt-0">
              <Btn className="btn-md btn-outline fw-bold" color="transparent" onClick={() => setModal(false)}>
                {t("Cancel")}
              </Btn>
              <Btn className="btn-solid" type="submit" loading={Number(isLoading)}>
                {t("Submit")}
              </Btn>
            </ModalFooter>
          )}
        </Col>
      </Row>
    </Form>
  );
};

export default SelectForm;
