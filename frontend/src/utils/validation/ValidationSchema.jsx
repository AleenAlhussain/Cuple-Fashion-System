import * as Yup from "yup";

export const YupObject = (schemaObject) => Yup.object().shape(schemaObject);

export const emailSchema = Yup.string().email("Enter Valid Email").required("Email is required");
export const passwordSchema = Yup.string().min(8, "Too Short!").max(20, "Too Long!").required();
export const nameSchema = Yup.string().required();
export const optionalNameSchema = Yup.string();
export const recaptchaSchema = Yup.string().required();
export const descriptionSchema = Yup.string().required().min(10, "The description must be at least 10 characters.");
export const roleIdSchema = Yup.string().required();
export const permissionsSchema = Yup.array().min(1).required();
export const dropDownScheme = Yup.array().min(1).required();
export const passwordConfirmationSchema = Yup.string()
  .when("password", {
    is: (val) => (val && val.length > 0 ? true : false),
    then: () => Yup.string().oneOf([Yup.ref("password")], "Confirm Password Does Not Matched"), 
  }).required('Confirm Password Is Required');

export const visibleTimeSchema = Yup.date().when("stock_status", {
  is: (val) => val === "coming_soon",
  then: () => Yup.date().required(),
});

export const ifTypeSimpleSchema = Yup.string().when("type", {
  is: (val) => val == "simple",
  then: () => Yup.string().required(),
  otherwise: () => Yup.string().notRequired()
});

export const ifTypeSimpleArraySchema = Yup.array().when("type", {
  is: (val) => val === "simple",
  then: () => Yup.array().min(1).required(),
  otherwise: () => Yup.string().notRequired()
});
export const ifIsUnlimited = Yup.number().when("is_unlimited", {
  is: (val) => !val,
  then: () => Yup.number().positive().required(),
});
export const ifIsExpirable = Yup.date().when("is_expired", {
  is: (val) => val,
  then: () => Yup.date().required(),
});
export const idCreateAccount = Yup.string().when("create_account", {
  is: true,
  then: () => Yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
  otherwise: () => Yup.string().notRequired()
});

export const idCreateAccountConfirm = Yup.string().when("create_account", {
  is: true,
  then: () => Yup.string().oneOf([Yup.ref("password")], "Passwords must match").required("Confirm password is required"),
  otherwise: () => Yup.string().notRequired()
});

export const ifTypeIsfree_shipping = Yup.number().when("type", {
  is: (val) => val !== "free_shipping",
  then: () => Yup.number().positive().required(),
});

export const ifShippingTypeIsFree = Yup.number().when("shipping_type", {
  is: (val) => val !== "free",
  then: () => Yup.number().positive().required(),
});

export const discountSchema = Yup.number().min(0).max(100);
export const requiredSchema = Yup.mixed().required();
export const StatusSchema = Yup.boolean().required();

export const phoneSchema = Yup.string()
  .required("Phone number is required")
  .test("phone-validation", function (value) {
    const countryCode =
      this.parent.phone_code ||
      this.parent.country_code ||
      this.parent.shipping_address?.country_code ||
      this.parent.billing_address?.country_code;
    // For UAE (+971), phone must be 9 digits starting with 5
    if (countryCode === "971" || countryCode === "+971") {
      if (!value) return this.createError({ message: "Phone number is required" });
      const cleanPhone = value.replace(/\s/g, "");
      if (!/^5\d{8}$/.test(cleanPhone)) {
        return this.createError({ message: "UAE phone must be 9 digits starting with 5 (e.g., 501234567)" });
      }
      return true;
    }
    // For other countries, just require a valid phone number (7-15 digits)
    if (!value || value.length < 7) {
      return this.createError({ message: "Phone number must be at least 7 digits" });
    }
    return true;
  })

export const ifIsApplyAll = Yup.array().when("is_apply_all", {
  is: (val) => !val,
  then: () => Yup.array().min(1).required(),
});

export const videoLinkSchema = Yup.string().when('video_provider', {
  is: (val) => val,
  then: () => Yup.string().required(),
  // otherwise: Yup.string().nullable(),
})

export const attributeValues = Yup.array().of(
  Yup.object().shape({
    value: () => Yup.string().required()
  })
)

export const variationSchema = Yup.array().of(Yup.object().shape({
  name: nameSchema,
  price: nameSchema,
  sku: nameSchema,
  quantity: nameSchema,
  status: nameSchema
}))
