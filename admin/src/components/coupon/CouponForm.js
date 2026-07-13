'use client';
import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Col, Row, CardBody, FormGroup, Label, Input, Button } from "reactstrap";
import { useRouter } from "next/navigation";
import request from "../../utils/axiosUtils";
import { toast } from "react-toastify";
import * as Yup from "yup";

const CouponForm = ({ updateId, title, buttonName }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    code: "",
    description: "",
    type: "percentage",
    value: "",
    min_order_amount: "",
    max_discount: "",
    usage_limit: "",
    usage_per_user: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  // Fetch existing coupon data if editing
  useEffect(() => {
    if (updateId) {
      const fetchCoupon = async () => {
        try {
          const res = await request({ url: `/coupon/${updateId}` }, router);
          if (res?.data?.data) {
            const coupon = res.data.data;
            setInitialValues({
              code: coupon.code || "",
              description: coupon.description || "",
              type: coupon.type || "percentage",
              value: coupon.value || "",
              min_order_amount: coupon.min_order_amount || "",
              max_discount: coupon.max_discount || "",
              usage_limit: coupon.usage_limit || "",
              usage_per_user: coupon.usage_per_user || "",
              start_date: coupon.start_date ? coupon.start_date.split("T")[0] : "",
              end_date: coupon.end_date ? coupon.end_date.split("T")[0] : "",
              is_active: coupon.is_active ?? true,
            });
          }
        } catch (err) {
          console.error("Error fetching coupon:", err);
        }
      };
      fetchCoupon();
    }
  }, [updateId, router]);

  const validationSchema = Yup.object({
    code: Yup.string().required("Coupon code is required"),
    type: Yup.string().oneOf(["percentage", "fixed"]).required("Type is required"),
    value: Yup.number().min(0, "Value must be positive").required("Value is required"),
    min_order_amount: Yup.number().min(0).nullable(),
    max_discount: Yup.number().min(0).nullable(),
    usage_limit: Yup.number().min(1).nullable(),
    start_date: Yup.date().nullable(),
    end_date: Yup.date().nullable(),
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Clean up empty values
      const payload = { ...values };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "" || payload[key] === null) {
          delete payload[key];
        }
      });

      // Convert is_active to boolean
      payload.is_active = Boolean(payload.is_active);

      if (updateId) {
        await request({ url: `/coupon/${updateId}`, method: "put", data: payload }, router);
        toast.success("Coupon updated successfully!");
      } else {
        await request({ url: "/coupon", method: "post", data: payload }, router);
        toast.success("Coupon created successfully!");
      }
      router.push("/coupon");
    } catch (err) {
      console.error("Error saving coupon:", err);
      toast.error(err?.response?.data?.message || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Col sm="12">
      <Card>
        <div className="title-header option-title">
          <h5>{t(title)}</h5>
        </div>
        <CardBody>
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, handleChange, handleBlur, errors, touched, setFieldValue }) => (
              <Form className="theme-form theme-form-2 mega-form">
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Coupon Code *</Label>
                      <Input
                        type="text"
                        name="code"
                        value={values.code}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. SAVE10"
                        className={errors.code && touched.code ? "is-invalid" : ""}
                      />
                      {errors.code && touched.code && (
                        <div className="invalid-feedback">{errors.code}</div>
                      )}
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Description</Label>
                      <Input
                        type="text"
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Coupon description"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Discount Type *</Label>
                      <Input
                        type="select"
                        name="type"
                        value={values.type}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount</option>
                      </Input>
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Value * {values.type === "percentage" ? "(%)" : "(Amount)"}</Label>
                      <Input
                        type="number"
                        name="value"
                        value={values.value}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={values.type === "percentage" ? "e.g. 10" : "e.g. 50"}
                        className={errors.value && touched.value ? "is-invalid" : ""}
                      />
                      {errors.value && touched.value && (
                        <div className="invalid-feedback">{errors.value}</div>
                      )}
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Minimum Order Amount</Label>
                      <Input
                        type="number"
                        name="min_order_amount"
                        value={values.min_order_amount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Minimum cart value required"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Maximum Discount</Label>
                      <Input
                        type="number"
                        name="max_discount"
                        value={values.max_discount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Cap on discount amount"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Usage Limit (Total)</Label>
                      <Input
                        type="number"
                        name="usage_limit"
                        value={values.usage_limit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Max times coupon can be used"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Usage Per User</Label>
                      <Input
                        type="number"
                        name="usage_per_user"
                        value={values.usage_per_user}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Max times per user"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        name="start_date"
                        value={values.start_date}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        name="end_date"
                        value={values.end_date}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup check>
                      <Label check>
                        <Input
                          type="checkbox"
                          name="is_active"
                          checked={values.is_active}
                          onChange={(e) => setFieldValue("is_active", e.target.checked)}
                        />
                        {" "}Active
                      </Label>
                    </FormGroup>
                  </Col>

                  <Col md="12" className="mt-4">
                    <Button type="submit" color="primary" disabled={loading}>
                      {loading ? "Saving..." : buttonName || "Save"}
                    </Button>
                    <Button
                      type="button"
                      color="secondary"
                      className="ms-2"
                      onClick={() => router.push("/coupon")}
                    >
                      Cancel
                    </Button>
                  </Col>
                </Row>
              </Form>
            )}
          </Formik>
        </CardBody>
      </Card>
    </Col>
  );
};

export default CouponForm;
