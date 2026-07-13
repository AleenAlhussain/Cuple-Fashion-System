import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Col, FormGroup, Input, Label, Row, Spinner } from "reactstrap";
import request from "../../utils/axiosUtils";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";

const DEFAULT_FORM = {
  enabled: false,
  zapierLoginWebhookUrl: "",
  zapierOrderWebhookUrl: "",
};

const WhatsAppConfigurationTab = () => {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await request({ url: "/settings/whatsapp" }, router);
      const data = res?.data?.data || {};
      const legacyWebhookUrl = data.zapier_webhook_url || "";
      setForm({
        enabled: !!data.enabled,
        zapierLoginWebhookUrl: data.zapier_login_webhook_url || legacyWebhookUrl,
        zapierOrderWebhookUrl: data.zapier_order_webhook_url || legacyWebhookUrl,
      });
    } catch (error) {
      ToastNotification("error", error?.response?.data?.message || "Failed to load WhatsApp settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field) => (event) => {
    const value = event?.target?.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: !!form.enabled,
        zapier_login_webhook_url: form.zapierLoginWebhookUrl || null,
        zapier_order_webhook_url: form.zapierOrderWebhookUrl || null,
        zapier_webhook_url: form.zapierOrderWebhookUrl || null, // keep legacy key in sync for backward compatibility
      };

      await request({ url: "/settings/whatsapp", method: "put", data: payload }, router);
      ToastNotification("success", "Saved successfully.");
      fetchSettings();
    } catch (error) {
      const status = error?.response?.status;
      if (status === 422) {
        ToastNotification("error", error?.response?.data?.message || "Please check the form fields.");
      } else {
        ToastNotification("error", error?.response?.data?.message || "Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Spinner size="sm" /> Loading...
      </div>
    );
  }

  return (
    <>
      <Row className="gy-3">
        <Col xs="12">
          <div className="small text-muted">Use separate Zapier Catch Hooks for login OTP and order confirmation.</div>
        </Col>
      </Row>

      <Row className="gy-3 mt-2">
        <Col xs="12">
          <FormGroup check className="d-flex align-items-center gap-2">
            <Input type="checkbox" checked={form.enabled} onChange={handleChange("enabled")} />
            <Label check>Enable WhatsApp (Zapier)</Label>
          </FormGroup>
        </Col>
        <Col xs="12">
          <Label className="form-label">Login OTP Webhook URL</Label>
          <Input
            type="url"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={form.zapierLoginWebhookUrl}
            onChange={handleChange("zapierLoginWebhookUrl")}
          />
        </Col>
        <Col xs="12">
          <Label className="form-label">Order Confirmation Webhook URL</Label>
          <Input
            type="url"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={form.zapierOrderWebhookUrl}
            onChange={handleChange("zapierOrderWebhookUrl")}
          />
        </Col>
        <Col xs="12" className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </Col>
      </Row>
    </>
  );
};

export default WhatsAppConfigurationTab;
