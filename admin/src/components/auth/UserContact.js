import React from "react";
import { Col } from "reactstrap";
import SimpleInputField from "../inputFields/SimpleInputField";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import { AllCountryCode } from "../../data/AllCountryCode";

const UserContact = () => {
  return (
    <Col sm="6">
      <div className="country-input form-floating">
        <SimpleInputField nameList={[{ name: "phone", type: "number", placeholder: "EnterPhoneNumber", require: "true", nolabel: "true" , }]} />
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
  );
};

export default UserContact;
