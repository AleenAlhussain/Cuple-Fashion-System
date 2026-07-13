import CheckBoxField from "../inputFields/CheckBoxField";
import SimpleInputField from "../inputFields/SimpleInputField";

const GoogleReCaptcha = () => {
  return (
    <>
      <SimpleInputField
        nameList={[
          { name: "[values][google_reCaptcha][secret]", title: "secret" },
          { name: "[values][google_reCaptcha][site_key]", title: "site_key" },
        ]}
      />
      <CheckBoxField name="[values][google_reCaptcha][status]" title="status" />
    </>
  );
};

export default GoogleReCaptcha;
