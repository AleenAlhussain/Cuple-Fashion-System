'use client';
import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Col, Row, CardBody, FormGroup, Label, Input, Button } from "reactstrap";
import { useRouter } from "next/navigation";
import request from "../../utils/axiosUtils";
import { toast } from "react-toastify";
import * as Yup from "yup";
import FileUploadField from "../inputFields/FileUploadField";
import { mediaConfig } from "@/data/MediaConfig";

const PopupForm = ({ updateId, title, buttonName }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    title: "",
    title_ar: "",
    description: "",
    description_ar: "",
    type: "collection",
    popup_image_id: "",
    popup_image: "",
    button_text: "",
    button_text_ar: "",
    button_link: "",
    coupon_code: "",
    discount_value: "",
    discount_type: "percentage",
    display_frequency: "once_per_session",
    delay_seconds: 3,
    show_on_exit_intent: false,
    show_on_pages: [],
    start_date: "",
    end_date: "",
    priority: 1,
    is_active: true,
  });

  const popupTypes = [
    { value: "collection", label: "New Collection" },
    { value: "offer", label: "Special Offer" },
    { value: "coupon", label: "Coupon" },
    { value: "newsletter", label: "Newsletter" },
  ];

  const displayFrequencies = [
    { value: "once", label: "Once" },
    { value: "every_visit", label: "Every Visit" },
    { value: "once_per_session", label: "Once Per Session" },
    { value: "once_per_day", label: "Once Per Day" },
  ];

  const pageOptions = [
    { value: "all", label: "All Pages" },
    { value: "home", label: "Home Page" },
    { value: "shop", label: "Shop Page" },
    { value: "product", label: "Product Pages" },
    { value: "cart", label: "Cart Page" },
    { value: "checkout", label: "Checkout Page" },
  ];

  // Fetch existing popup data if editing
  useEffect(() => {
    if (updateId) {
      const fetchPopup = async () => {
        try {
          const res = await request({ url: `/popup/${updateId}` }, router);
          if (res?.data?.data) {
            const popup = res.data.data;
            setInitialValues({
              title: popup.title || "",
              title_ar: popup.title_ar || "",
              description: popup.description || "",
              description_ar: popup.description_ar || "",
              type: popup.type || "collection",
              popup_image_id: popup.image ? popup.id : "",
              popup_image: popup.image ? { id: popup.id, original_url: popup.image_url } : "",
              button_text: popup.button_text || "",
              button_text_ar: popup.button_text_ar || "",
              button_link: popup.button_link || "",
              coupon_code: popup.coupon_code || "",
              discount_value: popup.discount_value || "",
              discount_type: popup.discount_type || "percentage",
              display_frequency: popup.display_frequency || "once_per_session",
              delay_seconds: popup.delay_seconds ?? 3,
              show_on_exit_intent: popup.show_on_exit_intent ?? false,
              show_on_pages: popup.show_on_pages || [],
              start_date: popup.start_date ? popup.start_date.split("T")[0] : "",
              end_date: popup.end_date ? popup.end_date.split("T")[0] : "",
              priority: popup.priority ?? 1,
              is_active: popup.is_active ?? true,
            });
          }
        } catch (err) {
          console.error("Error fetching popup:", err);
        }
      };
      fetchPopup();
    }
  }, [updateId, router]);

  const validationSchema = Yup.object({
    title: Yup.string().required("Title is required"),
    type: Yup.string().oneOf(["collection", "offer", "coupon", "newsletter"]).required("Type is required"),
    display_frequency: Yup.string().required("Display frequency is required"),
    delay_seconds: Yup.number().min(0, "Delay must be positive"),
    priority: Yup.number().min(1, "Priority must be at least 1"),
    discount_value: Yup.number().min(0).nullable(),
    start_date: Yup.date().nullable(),
    end_date: Yup.date().nullable(),
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Prepare FormData for image upload
      const formData = new FormData();

      formData.append("title", values.title);
      if (values.title_ar) formData.append("title_ar", values.title_ar);
      if (values.description) formData.append("description", values.description);
      if (values.description_ar) formData.append("description_ar", values.description_ar);
      formData.append("type", values.type);
      if (values.button_text) formData.append("button_text", values.button_text);
      if (values.button_text_ar) formData.append("button_text_ar", values.button_text_ar);
      if (values.button_link) formData.append("button_link", values.button_link);
      if (values.coupon_code) formData.append("coupon_code", values.coupon_code);
      if (values.discount_value) formData.append("discount_value", values.discount_value);
      if (values.discount_type) formData.append("discount_type", values.discount_type);
      formData.append("display_frequency", values.display_frequency);
      formData.append("delay_seconds", values.delay_seconds);
      formData.append("show_on_exit_intent", values.show_on_exit_intent ? "1" : "0");
      if (values.show_on_pages?.length > 0) {
        formData.append("show_on_pages", JSON.stringify(values.show_on_pages));
      }
      if (values.start_date) formData.append("start_date", values.start_date);
      if (values.end_date) formData.append("end_date", values.end_date);
      formData.append("priority", values.priority);
      formData.append("is_active", values.is_active ? "1" : "0");

      // Handle image - check if we have a file from FileUploadField
      if (values.popup_image_id && typeof values.popup_image_id === 'object') {
        // It's a file object from media library
        formData.append("image_id", values.popup_image_id);
      } else if (values.popup_image?.original_url) {
        // Keep existing image
        formData.append("image", values.popup_image.original_url.replace(/^.*\/storage\//, ''));
      }

      if (updateId) {
        formData.append("_method", "PUT");
        await request({
          url: `/popup/${updateId}`,
          method: "post",
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' }
        }, router);
        toast.success("Popup updated successfully!");
      } else {
        await request({
          url: "/popup",
          method: "post",
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' }
        }, router);
        toast.success("Popup created successfully!");
      }
      router.push("/popup");
    } catch (err) {
      console.error("Error saving popup:", err);
      toast.error(err?.response?.data?.message || "Failed to save popup");
    } finally {
      setLoading(false);
    }
  };

  const handlePageSelection = (value, checked, values, setFieldValue) => {
    let updatedPages = [...(values.show_on_pages || [])];
    if (checked) {
      if (value === "all") {
        updatedPages = ["all"];
      } else {
        updatedPages = updatedPages.filter(p => p !== "all");
        if (!updatedPages.includes(value)) {
          updatedPages.push(value);
        }
      }
    } else {
      updatedPages = updatedPages.filter(p => p !== value);
    }
    setFieldValue("show_on_pages", updatedPages);
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
                  {/* Basic Information */}
                  <Col md="12">
                    <h6 className="mb-3 text-muted">Basic Information</h6>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Title (English) *</Label>
                      <Input
                        type="text"
                        name="title"
                        value={values.title}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter popup title"
                        className={errors.title && touched.title ? "is-invalid" : ""}
                      />
                      {errors.title && touched.title && (
                        <div className="invalid-feedback">{errors.title}</div>
                      )}
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Title (Arabic)</Label>
                      <Input
                        type="text"
                        name="title_ar"
                        value={values.title_ar}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter Arabic title"
                        dir="rtl"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Description (English)</Label>
                      <Input
                        type="textarea"
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter popup description"
                        rows="3"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Description (Arabic)</Label>
                      <Input
                        type="textarea"
                        name="description_ar"
                        value={values.description_ar}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter Arabic description"
                        rows="3"
                        dir="rtl"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Popup Type *</Label>
                      <Input
                        type="select"
                        name="type"
                        value={values.type}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      >
                        {popupTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Priority</Label>
                      <Input
                        type="number"
                        name="priority"
                        value={values.priority}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="1"
                        min="1"
                      />
                      <small className="text-muted">Higher priority shows first</small>
                    </FormGroup>
                  </Col>

                  {/* Image */}
                  <Col md="12">
                    <h6 className="mb-3 mt-3 text-muted">Popup Image</h6>
                  </Col>

                  <Col md="12">
                    <FileUploadField
                      paramsProps={{ mime_type: mediaConfig.image.join(",") }}
                      name="popup_image_id"
                      id="popup_image_id"
                      title="PopupImage"
                      updateId={updateId}
                      type="file"
                      values={values}
                      setFieldValue={setFieldValue}
                      loading={loading}
                    />
                  </Col>

                  {/* Button Settings */}
                  <Col md="12">
                    <h6 className="mb-3 mt-3 text-muted">Button Settings</h6>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>Button Text (English)</Label>
                      <Input
                        type="text"
                        name="button_text"
                        value={values.button_text}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Shop Now"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>Button Text (Arabic)</Label>
                      <Input
                        type="text"
                        name="button_text_ar"
                        value={values.button_text_ar}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Arabic button text"
                        dir="rtl"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>Button Link</Label>
                      <Input
                        type="text"
                        name="button_link"
                        value={values.button_link}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="/shop or https://..."
                      />
                    </FormGroup>
                  </Col>

                  {/* Coupon Settings (only show for coupon type) */}
                  {values.type === "coupon" && (
                    <>
                      <Col md="12">
                        <h6 className="mb-3 mt-3 text-muted">Coupon Settings</h6>
                      </Col>

                      <Col md="4">
                        <FormGroup>
                          <Label>Coupon Code</Label>
                          <Input
                            type="text"
                            name="coupon_code"
                            value={values.coupon_code}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="e.g. SAVE20"
                          />
                        </FormGroup>
                      </Col>

                      <Col md="4">
                        <FormGroup>
                          <Label>Discount Value</Label>
                          <Input
                            type="number"
                            name="discount_value"
                            value={values.discount_value}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="e.g. 20"
                          />
                        </FormGroup>
                      </Col>

                      <Col md="4">
                        <FormGroup>
                          <Label>Discount Type</Label>
                          <Input
                            type="select"
                            name="discount_type"
                            value={values.discount_type}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount</option>
                          </Input>
                        </FormGroup>
                      </Col>
                    </>
                  )}

                  {/* Display Settings */}
                  <Col md="12">
                    <h6 className="mb-3 mt-3 text-muted">Display Settings</h6>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>Display Frequency *</Label>
                      <Input
                        type="select"
                        name="display_frequency"
                        value={values.display_frequency}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      >
                        {displayFrequencies.map(freq => (
                          <option key={freq.value} value={freq.value}>{freq.label}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>Delay (seconds)</Label>
                      <Input
                        type="number"
                        name="delay_seconds"
                        value={values.delay_seconds}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="3"
                        min="0"
                      />
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup className="mt-4">
                      <Label check>
                        <Input
                          type="checkbox"
                          name="show_on_exit_intent"
                          checked={values.show_on_exit_intent}
                          onChange={(e) => setFieldValue("show_on_exit_intent", e.target.checked)}
                        />
                        {" "}Show on Exit Intent
                      </Label>
                      <small className="text-muted d-block">Trigger when user tries to leave</small>
                    </FormGroup>
                  </Col>

                  <Col md="12">
                    <FormGroup>
                      <Label>Show on Pages</Label>
                      <div className="d-flex flex-wrap gap-3">
                        {pageOptions.map(page => (
                          <Label check key={page.value} className="me-3">
                            <Input
                              type="checkbox"
                              checked={values.show_on_pages?.includes(page.value)}
                              onChange={(e) => handlePageSelection(page.value, e.target.checked, values, setFieldValue)}
                            />
                            {" "}{page.label}
                          </Label>
                        ))}
                      </div>
                      <small className="text-muted">Leave empty to show on all pages</small>
                    </FormGroup>
                  </Col>

                  {/* Schedule */}
                  <Col md="12">
                    <h6 className="mb-3 mt-3 text-muted">Schedule</h6>
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

                  {/* Status */}
                  <Col md="12">
                    <FormGroup check className="mt-3">
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
                      onClick={() => router.push("/popup")}
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

export default PopupForm;
