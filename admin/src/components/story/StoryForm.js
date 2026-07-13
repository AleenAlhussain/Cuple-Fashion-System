'use client';
import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Col, Row, CardBody, FormGroup, Label, Input, Button } from "reactstrap";
import { useRouter } from "next/navigation";
import request from "../../utils/axiosUtils";
import { toast } from "react-toastify";
import * as Yup from "yup";
import { StoryAPI, StoryProductsAPI } from "@/utils/axiosUtils/API";

const StoryForm = ({ updateId, title, buttonName }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  const [initialValues, setInitialValues] = useState({
    title: "",
    title_ar: "",
    media_type: "image",
    media: null,
    thumbnail: null,
    creator_type: "admin",
    user_id: 1, // Default admin user
    product_id: "",
    button_text: "",
    button_text_ar: "",
    custom_link: "",
    duration_seconds: 5,
    sort_order: 0,
    is_active: true,
  });

  // Fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await request({
          url: `${StoryProductsAPI}?search=${productSearch}`
        }, router);
        setProducts(res?.data?.data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, [productSearch, router]);

  // Fetch existing story data if editing
  useEffect(() => {
    if (updateId) {
      const fetchStory = async () => {
        try {
          const res = await request({ url: `${StoryAPI}/${updateId}` }, router);
          if (res?.data?.data) {
            const story = res.data.data;
            setInitialValues({
              title: story.title || "",
              title_ar: story.title_ar || "",
              media_type: story.media_type || "image",
              media: null,
              thumbnail: null,
              creator_type: story.creator_type || "admin",
              user_id: story.user_id || 1,
              product_id: story.product_id || "",
              button_text: story.button_text || "",
              button_text_ar: story.button_text_ar || "",
              custom_link: story.custom_link || "",
              duration_seconds: story.duration_seconds || 5,
              sort_order: story.sort_order || 0,
              is_active: story.is_active ?? true,
            });
            // Set preview URL
            if (story.media_url) {
              setPreviewUrl(story.media_url);
            }
          }
        } catch (err) {
          console.error("Error fetching story:", err);
        }
      };
      fetchStory();
    }
  }, [updateId, router]);

  const validationSchema = Yup.object({
    media_type: Yup.string().oneOf(["image", "video"]).required("Media type is required"),
    creator_type: Yup.string().required("Creator type is required"),
    user_id: Yup.number().required("User ID is required"),
    duration_seconds: Yup.number().min(3, "Minimum 3 seconds").max(30, "Maximum 30 seconds"),
    sort_order: Yup.number().min(0),
    custom_link: Yup.string().url("Must be a valid URL").nullable(),
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const formData = new FormData();

      if (values.title) formData.append("title", values.title);
      if (values.title_ar) formData.append("title_ar", values.title_ar);
      formData.append("media_type", values.media_type);
      formData.append("creator_type", values.creator_type);
      formData.append("user_id", values.user_id);
      if (values.product_id) formData.append("product_id", values.product_id);
      if (values.button_text) formData.append("button_text", values.button_text);
      if (values.button_text_ar) formData.append("button_text_ar", values.button_text_ar);
      if (values.custom_link) formData.append("custom_link", values.custom_link);
      formData.append("duration_seconds", values.duration_seconds);
      formData.append("sort_order", values.sort_order);
      formData.append("is_active", values.is_active ? "1" : "0");

      // Handle media file
      if (values.media) {
        formData.append("media", values.media);
      } else if (!updateId) {
        toast.error("Please upload a media file");
        setLoading(false);
        return;
      }

      // Handle thumbnail (optional, for videos)
      if (values.thumbnail) {
        formData.append("thumbnail", values.thumbnail);
      }

      if (updateId) {
        formData.append("_method", "PUT");
        await request({
          url: `${StoryAPI}/${updateId}`,
          method: "post",
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' }
        }, router);
        toast.success("Story updated successfully!");
      } else {
        await request({
          url: StoryAPI,
          method: "post",
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' }
        }, router);
        toast.success("Story created successfully!");
      }
      router.push("/story");
    } catch (err) {
      console.error("Error saving story:", err);
      toast.error(err?.response?.data?.message || "Failed to save story");
    } finally {
      setLoading(false);
    }
  };

  const handleMediaChange = (e, setFieldValue) => {
    const file = e.target.files[0];
    if (file) {
      setFieldValue("media", file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
                  {/* Media Type */}
                  <Col md="6">
                    <FormGroup>
                      <Label>Media Type *</Label>
                      <Input
                        type="select"
                        name="media_type"
                        value={values.media_type}
                        onChange={(e) => {
                          handleChange(e);
                          // Adjust default duration based on type
                          if (e.target.value === "video") {
                            setFieldValue("duration_seconds", 15);
                          } else {
                            setFieldValue("duration_seconds", 5);
                          }
                        }}
                        onBlur={handleBlur}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </Input>
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Creator Type *</Label>
                      <Input
                        type="text"
                        name="creator_type"
                        value={values.creator_type}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Admin, Brand, Influencer"
                        className={errors.creator_type && touched.creator_type ? "is-invalid" : ""}
                      />
                      {errors.creator_type && touched.creator_type && (
                        <div className="invalid-feedback">{errors.creator_type}</div>
                      )}
                    </FormGroup>
                  </Col>

                  {/* Media Upload */}
                  <Col md="12">
                    <FormGroup>
                      <Label>
                        {values.media_type === "video" ? "Video File" : "Image File"} *
                      </Label>
                      <Input
                        type="file"
                        accept={values.media_type === "video" ? "video/*" : "image/*"}
                        onChange={(e) => handleMediaChange(e, setFieldValue)}
                      />
                      <small className="text-muted">
                        {values.media_type === "video"
                          ? "Max 50MB. Supported: MP4, WebM, MOV"
                          : "Max 5MB. Supported: JPG, PNG, GIF, WebP"}
                      </small>
                    </FormGroup>
                  </Col>

                  {/* Preview */}
                  {previewUrl && (
                    <Col md="12" className="mb-3">
                      <Label>Preview</Label>
                      <div style={{ maxWidth: 300 }}>
                        {values.media_type === "video" ? (
                          <video
                            src={previewUrl}
                            controls
                            style={{ width: "100%", borderRadius: 8 }}
                          />
                        ) : (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            style={{ width: "100%", borderRadius: 8 }}
                          />
                        )}
                      </div>
                    </Col>
                  )}

                  {/* Thumbnail (for videos) */}
                  {values.media_type === "video" && (
                    <Col md="12">
                      <FormGroup>
                        <Label>Video Thumbnail (optional)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setFieldValue("thumbnail", file);
                            }
                          }}
                        />
                        <small className="text-muted">
                          Recommended: Square image for story thumbnails
                        </small>
                      </FormGroup>
                    </Col>
                  )}

                  {/* Title */}
                  <Col md="6">
                    <FormGroup>
                      <Label>Title (English)</Label>
                      <Input
                        type="text"
                        name="title"
                        value={values.title}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Optional story title"
                      />
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
                        placeholder="Arabic title"
                        dir="rtl"
                      />
                    </FormGroup>
                  </Col>

                  {/* Product Link */}
                  <Col md="6">
                    <FormGroup>
                      <Label>Link to Product</Label>
                      <Input
                        type="select"
                        name="product_id"
                        value={values.product_id}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      >
                        <option value="">No product link</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.price} AED
                          </option>
                        ))}
                      </Input>
                      <small className="text-muted">Select a product to show Shop Now button</small>
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Or Custom Link</Label>
                      <Input
                        type="url"
                        name="custom_link"
                        value={values.custom_link}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="https://..."
                        className={errors.custom_link && touched.custom_link ? "is-invalid" : ""}
                      />
                      {errors.custom_link && touched.custom_link && (
                        <div className="invalid-feedback">{errors.custom_link}</div>
                      )}
                    </FormGroup>
                  </Col>

                  {/* Button Text */}
                  <Col md="6">
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

                  <Col md="6">
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

                  {/* Duration & Sort */}
                  <Col md="4">
                    <FormGroup>
                      <Label>Duration (seconds)</Label>
                      <Input
                        type="number"
                        name="duration_seconds"
                        value={values.duration_seconds}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min="3"
                        max="30"
                        className={errors.duration_seconds && touched.duration_seconds ? "is-invalid" : ""}
                      />
                      {errors.duration_seconds && touched.duration_seconds && (
                        <div className="invalid-feedback">{errors.duration_seconds}</div>
                      )}
                      <small className="text-muted">How long story displays (3-30 sec)</small>
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        name="sort_order"
                        value={values.sort_order}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min="0"
                      />
                      <small className="text-muted">Lower numbers appear first</small>
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup className="mt-4">
                      <Label check>
                        <Input
                          type="checkbox"
                          name="is_active"
                          checked={values.is_active}
                          onChange={(e) => setFieldValue("is_active", e.target.checked)}
                        />
                        {" "}Active
                      </Label>
                      <small className="text-muted d-block">Story expires in 24 hours</small>
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
                      onClick={() => router.push("/story")}
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

export default StoryForm;
