import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { Row } from "reactstrap";
import Btn from "../../elements/buttons/Btn";
import { shippingRule } from "../../utils/axiosUtils/API";
import useDelete from "../../utils/hooks/useDelete";
import * as Yup from "yup";
import { YupObject } from "../../utils/validation/ValidationSchemas";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import SimpleInputField from "../inputFields/SimpleInputField";
import DeleteButton from "../table/DeleteButton";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";

const deriveFeeMethod = (rule) => {
  if (rule?.fee_method) return rule.fee_method;
  if (rule?.rule_type === "base_on_quantity") return "fixed_by_quantity";
  if (rule?.shipping_type === "fixed" && Number(rule?.min || 0) <= 0 && !rule?.max) return "fixed_per_order";
  return "legacy";
};

const resolveZoneId = (rules, shipping_id) => {
  if (rules?.shipping_id) return Number(rules.shipping_id);
  if (rules && shipping_id) return Number(shipping_id);
  if (shipping_id?.create) return Number(shipping_id.create);
  return "";
};

const toPositiveInt = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return Math.max(1, Math.trunc(num));
};

const hasValue = (value) => !(value === "" || value === null || typeof value === "undefined");

const FormsShippingRuleCreation = ({ rules, mutate, shipping_id, shippingOptions = [], template = null, loading, refetch, setActive }) => {
  const { t } = useTranslation("common");
  const { mutate: deleteMutate, isLoading } = useDelete(shippingRule, false, () => refetch && refetch());
  const numericField = Yup.number().transform((value, originalValue) => {
    if (originalValue === "" || originalValue === null || typeof originalValue === "undefined") {
      return null;
    }
    return value;
  });
  const initialFeeMethod = deriveFeeMethod(rules);
  const templateData = !rules && template && typeof template === "object" ? template : {};
  const zoneOptions = Array.isArray(shippingOptions) && shippingOptions.length
    ? shippingOptions
    : [
        {
          id: resolveZoneId(rules, shipping_id),
          name: t("Country"),
        },
      ];

  return (
    <Formik
      enableReinitialize
      initialValues={{
        name: rules?.name || templateData?.name || "",
        fee_method: rules ? initialFeeMethod : (templateData?.fee_method || "fixed_per_order"),
        rule_type: rules?.rule_type || templateData?.rule_type || "base_on_price",
        min: rules?.min || templateData?.min || "",
        max: rules?.max || templateData?.max || "",
        min_item_qty: rules?.min_item_qty || templateData?.min_item_qty || "",
        max_item_qty: rules?.max_item_qty || templateData?.max_item_qty || "",
        shipping_type: rules?.shipping_type || templateData?.shipping_type || "fixed",
        amount: rules?.amount || templateData?.amount || "",
        status: rules?.status ? Boolean(Number(rules?.status)) : true,
        shipping_id: rules?.shipping_id || templateData?.shipping_id || resolveZoneId(rules, shipping_id),
      }}
      validationSchema={YupObject({
        name: Yup.string().nullable(),
        shipping_id: Yup.number().required(),
        fee_method: Yup.string().required(),
        amount: numericField.when("fee_method", {
          is: (val) => val === "fixed_per_order" || val === "fixed_by_quantity",
          then: (schema) => schema.min(0).required(),
          otherwise: (schema) =>
            schema.when("shipping_type", {
              is: (shippingType) => shippingType !== "free",
              then: (inner) => inner.min(0).required(),
              otherwise: (inner) => inner.nullable(),
            }),
        }),
        min_item_qty: numericField.when("fee_method", {
          is: "fixed_by_quantity",
          then: (schema) => schema.integer().min(1).required(),
          otherwise: (schema) => schema.nullable(),
        }),
        max_item_qty: numericField.when("fee_method", {
          is: "fixed_by_quantity",
          then: (schema) =>
            schema.integer().min(1).nullable().test("gte-min", t("EnterMaxValue"), function (value) {
              if (!hasValue(value)) return true;
              const min = Number(this.parent.min_item_qty || 0);
              return Number(value || 0) >= min;
            }),
          otherwise: (schema) => schema.nullable(),
        }),
      })}
      onSubmit={(values) => {
        const zoneId = values.shipping_id || (rules ? shipping_id : shipping_id?.create);
        if (!zoneId) {
          return ToastNotification("error", t("SelectCountry"));
        }

        const payload = {
          name: values.name,
          fee_method: values.fee_method,
          status: values.status ? 1 : 0,
          shipping_id: zoneId,
        };

        if (values.fee_method === "fixed_per_order") {
          payload.amount = values.amount;
        } else if (values.fee_method === "fixed_by_quantity") {
          payload.amount = values.amount;
          payload.min_item_qty = toPositiveInt(values.min_item_qty);
          if (hasValue(values.max_item_qty)) {
            payload.max_item_qty = toPositiveInt(values.max_item_qty);
          }
        } else {
          payload.rule_type = values.rule_type;
          payload.min = values.min;
          payload.max = values.max;
          payload.shipping_type = values.shipping_type;
          if (values.shipping_type !== "free") {
            payload.amount = values.amount;
          }
        }

        mutate(payload);
      }}
    >
      {({ values, setFieldValue }) => (
        <Form className="theme-form theme-form-2 mega-form">
          <Row>
            <SimpleInputField nameList={[{ name: "name", title: "Name", placeholder: t("EnterName") }]} />
            <SearchableSelectInput
              nameList={[
                {
                  name: "shipping_id",
                  title: "Country",
                  require: "true",
                  inputprops: {
                    name: "shipping_id",
                    id: "shipping_id",
                    options: zoneOptions,
                  },
                },
              ]}
            />
            <SearchableSelectInput
              nameList={[
                {
                  name: "fee_method",
                  title: "ShippingType",
                  require: "true",
                  inputprops: {
                    name: "fee_method",
                    id: "fee_method",
                    options: [
                      { id: "fixed_per_order", name: "FixedPerOrder" },
                      { id: "fixed_by_quantity", name: "FixedByItemsRange" },
                      { id: "legacy", name: "LegacyRule" },
                    ],
                  },
                },
              ]}
            />

            {values.fee_method === "fixed_by_quantity" && (
              <SimpleInputField
                nameList={[
                  { name: "min_item_qty", type: "number", min: 1, placeholder: t("ItemsRangeFrom"), require: "true" },
                  { name: "max_item_qty", type: "number", min: 1, placeholder: t("ItemsRangeTo"), helpertext: t("LeaveEmptyForAndAbove") },
                ]}
              />
            )}

            {values.fee_method === "legacy" && (
              <>
                <SearchableSelectInput
                  nameList={[
                    {
                      name: "rule_type",
                      title: "RuleType",
                      require: "true",
                      inputprops: {
                        name: "rule_type",
                        id: "rule_type",
                        options: [
                          { id: "base_on_price", name: "Base On Price" },
                          { id: "base_on_weight", name: "Base On Weight" },
                        ],
                      },
                    },
                  ]}
                />
                <SimpleInputField
                  nameList={[
                    { name: "min", type: "number", placeholder: t("EnterMinValue"), require: "true" },
                    { name: "max", type: "number", placeholder: t("EnterMaxValue"), require: "true" },
                  ]}
                />
                <SearchableSelectInput
                  nameList={[
                    {
                      name: "shipping_type",
                      title: "ShippingType",
                      require: "true",
                      inputprops: {
                        name: "shipping_type",
                        id: "shipping_type",
                        options: [
                          { id: "free", name: "Free" },
                          { id: "fixed", name: "Fixed" },
                          { id: "percentage", name: "Percentage" },
                        ],
                      },
                    },
                  ]}
                />
              </>
            )}

            {(values.fee_method === "fixed_per_order" || values.fee_method === "fixed_by_quantity" || values.shipping_type !== "free") && (
              <SimpleInputField
                nameList={[
                  {
                    name: "amount",
                    type: "number",
                    min: 0,
                    placeholder: values.fee_method === "fixed_by_quantity" ? t("Price") : t("EnterAmount"),
                    require: "true",
                    onInput: values["shipping_type"] === "percentage" && values["amount"] > 100 ? setFieldValue("amount", 100) : "",
                  },
                ]}
              />
            )}
          </Row>
          <div className="dflex-wgap justify-content-end ms-auto mt-0 save-back-button">
            {rules?.id && <DeleteButton id={rules.id} mutate={deleteMutate} noImage={true} loading={isLoading} />}
            {values.fee_method === "fixed_by_quantity" && (
              <Btn
                type="button"
                className="btn-outline"
                title="AddAnotherRange"
                onClick={() => {
                  const zoneId = Number(values.shipping_id || resolveZoneId(rules, shipping_id) || 0);
                  if (!zoneId) {
                    return ToastNotification("error", t("SelectCountry"));
                  }

                  const nextStart = hasValue(values.max_item_qty)
                    ? Number(values.max_item_qty) + 1
                    : Number(values.min_item_qty || 0) + 1;

                  setActive({
                    create: zoneId,
                    template: {
                      name: values.name || t("ShippingFee"),
                      shipping_id: zoneId,
                      fee_method: "fixed_by_quantity",
                      min_item_qty: nextStart > 0 ? nextStart : "",
                      max_item_qty: "",
                      amount: values.amount || "",
                      shipping_type: "fixed",
                    },
                  });
                }}
              />
            )}
            <Btn className="btn-primary" type="submit" title="Submit" loading={Number(loading)} />
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default FormsShippingRuleCreation;
