"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Row, Col, FormGroup, Label, Input, Button, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import request from "@/utils/axiosUtils";
import { Category } from "@/utils/axiosUtils/API";
import MediaPickerField from "@/components/inputFields/MediaPickerField";

const SimpleCategoryForm = ({ updateId }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    parent_id: "",
    sort_order: 0,
    is_active: true,
    meta_title: "",
    meta_description: "",
  });

  // Fetch all categories for parent dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await request({ url: Category }, router);
        const data = res?.data?.data?.data || res?.data?.data || [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch category data if editing
  useEffect(() => {
    if (updateId) {
      setLoading(true);
      const fetchCategory = async () => {
        try {
          const res = await request({ url: `${Category}/${updateId}` }, router);
          const cat = res?.data?.data;
          if (cat) {
            setFormData({
              name: cat.name || "",
              name_ar: cat.name_ar || "",
              description: cat.description || "",
              description_ar: cat.description_ar || "",
              parent_id: cat.parent_id || "",
              sort_order: Number(cat.sort_order ?? 0),
              is_active: cat.is_active !== false,
              meta_title: cat.meta_title || "",
              meta_description: cat.meta_description || "",
            });
            if (cat.image_url) {
              setImagePreview(cat.image_url);
            }
            if (cat.banner_image_url) {
              setBannerPreview(cat.banner_image_url);
            }
          }
        } catch (err) {
          console.error("Failed to fetch category", err);
        } finally {
          setLoading(false);
        }
      };
      fetchCategory();
    }
  }, [updateId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = new FormData();

      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== "" && formData[key] !== null) {
          if (key === "is_active") {
            submitData.append(key, formData[key] ? "1" : "0");
          } else if (key === "sort_order") {
            submitData.append(key, String(Number(formData[key] || 0)));
          } else {
            submitData.append(key, formData[key]);
          }
        }
      });

      // Handle images - either file upload or URL from media library
      if (imageFile) {
        // New file uploaded directly
        submitData.append("image", imageFile);
      } else if (imagePreview && !imagePreview.startsWith("data:")) {
        // URL from media library (not a data URL from local preview)
        submitData.append("image_url", imagePreview);
      }

      if (bannerFile) {
        // New file uploaded directly
        submitData.append("banner_image", bannerFile);
      } else if (bannerPreview && !bannerPreview.startsWith("data:")) {
        // URL from media library
        submitData.append("banner_image_url", bannerPreview);
      }

      const url = updateId ? `${Category}/${updateId}` : Category;
      const method = updateId ? "post" : "post"; // Use POST for both, add _method for update

      if (updateId) {
        submitData.append("_method", "PUT");
      }

      await request({
        url,
        method,
        data: submitData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }, router);

      router.push("/category");
    } catch (err) {
      console.error("Failed to save category", err);
      alert("Failed to save category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <FormGroup>
            <Label for="name">{t("Name")} (English) *</Label>
            <Input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter category name"
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="name_ar">{t("Name")} (Arabic)</Label>
            <Input
              type="text"
              name="name_ar"
              id="name_ar"
              value={formData.name_ar}
              onChange={handleChange}
              placeholder="أدخل اسم الفئة"
              dir="rtl"
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="description">{t("Description")} (English)</Label>
            <Input
              type="textarea"
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Enter category description"
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="description_ar">{t("Description")} (Arabic)</Label>
            <Input
              type="textarea"
              name="description_ar"
              id="description_ar"
              value={formData.description_ar}
              onChange={handleChange}
              rows={3}
              placeholder="أدخل وصف الفئة"
              dir="rtl"
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="parent_id">{t("ParentCategory")}</Label>
            <Input
              type="select"
              name="parent_id"
              id="parent_id"
              value={formData.parent_id}
              onChange={handleChange}
            >
              <option value="">-- No Parent (Top Level) --</option>
              {categories
                .filter(cat => cat.id !== parseInt(updateId))
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </Input>
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="sort_order">{t("Priority")}</Label>
            <Input
              type="number"
              min="0"
              name="sort_order"
              id="sort_order"
              value={formData.sort_order}
              onChange={handleChange}
              placeholder="0"
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="is_active">{t("Status")}</Label>
            <div className="form-check form-switch mt-2">
              <Input
                type="checkbox"
                className="form-check-input"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <Label className="form-check-label" for="is_active">
                {formData.is_active ? "Active" : "Inactive"}
              </Label>
            </div>
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <MediaPickerField
              label={t("CategoryImage")}
              value={imagePreview}
              onChange={(file, previewUrl) => {
                setImageFile(file);
                setImagePreview(previewUrl);
              }}
              helperText="Category thumbnail image (recommended: 300x300px)"
              previewWidth={200}
              previewHeight={200}
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <MediaPickerField
              label={t("BannerImage") || "Banner Image"}
              value={bannerPreview}
              onChange={(file, previewUrl) => {
                setBannerFile(file);
                setBannerPreview(previewUrl);
              }}
              helperText={
                <>
                  <strong>Recommended sizes (Desktop):</strong><br />
                  - Full width layout: <strong>1376x690px</strong><br />
                  - Half width layout: <strong>676x339px</strong><br />
                  This image is used as the category page header background and on the homepage category section.
                </>
              }
              previewWidth={400}
              previewHeight={200}
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="meta_title">{t("MetaTitle")}</Label>
            <Input
              type="text"
              name="meta_title"
              id="meta_title"
              value={formData.meta_title}
              onChange={handleChange}
              placeholder="Enter meta title for SEO"
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <Label for="meta_description">{t("MetaDescription")}</Label>
            <Input
              type="textarea"
              name="meta_description"
              id="meta_description"
              value={formData.meta_description}
              onChange={handleChange}
              rows={2}
              placeholder="Enter meta description for SEO"
            />
          </FormGroup>
        </Col>
        <Col md={12}>
          <div className="d-flex gap-2 mt-3">
            <Button color="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                updateId ? t("Update") : t("Create")
              )}
            </Button>
            <Button color="secondary" type="button" onClick={() => router.push("/category")}>
              {t("Cancel")}
            </Button>
          </div>
        </Col>
      </Row>
    </form>
  );
};

export default SimpleCategoryForm;
