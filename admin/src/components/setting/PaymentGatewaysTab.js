import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Badge,
  Col,
  FormGroup,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import request from "../../utils/axiosUtils";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";
import { RiCheckLine, RiCloseLine, RiTestTubeLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";

const PaymentGatewaysTab = ({ gatewayNames = null, showIntro = true, allowStatusEdit = true }) => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});
  const [openAccordion, setOpenAccordion] = useState("");
  const [forms, setForms] = useState({});

  const gatewayFilter = useMemo(
    () => (Array.isArray(gatewayNames) ? gatewayNames.map((name) => String(name)) : []),
    [gatewayNames]
  );

  const gatewayFilterKey = useMemo(
    () => gatewayFilter.slice().sort().join(","),
    [gatewayFilter]
  );

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const res = await request({ url: "/payment-gateway" }, router);
      const data = res?.data?.data || [];
      const filtered = gatewayFilter.length
        ? data.filter((gateway) => gatewayFilter.includes(gateway.name))
        : data;

      setGateways(filtered);

      const initialForms = {};
      filtered.forEach((gw) => {
        initialForms[gw.name] = {
          display_name: gw.display_name || "",
          description: gw.description || "",
          is_active: !!gw.is_active,
          is_sandbox: gw.is_sandbox !== false,
          public_key: gw.public_key || "",
          secret_key: "",
          merchant_code: gw.merchant_code || "",
          min_amount: gw.min_amount || 50,
          max_amount: gw.max_amount || 5000,
          installments_count: gw.installments_count || 4,
        };
      });
      setForms(initialForms);
    } catch (error) {
      ToastNotification("error", error?.response?.data?.message || "Failed to load payment gateways.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, [gatewayFilterKey]);

  const handleChange = (gatewayName, field) => (event) => {
    const value = event?.target?.type === "checkbox" ? event.target.checked : event.target.value;
    setForms((prev) => ({
      ...prev,
      [gatewayName]: { ...prev[gatewayName], [field]: value },
    }));
  };

  const handleSave = async (gateway) => {
    setSaving((prev) => ({ ...prev, [gateway.name]: true }));
    try {
      const form = forms[gateway.name];
      const payload = {
        display_name: form.display_name,
        description: form.description,
        is_sandbox: !!form.is_sandbox,
        public_key: form.public_key || null,
        merchant_code: form.merchant_code || null,
        min_amount: parseFloat(form.min_amount) || 50,
        max_amount: parseFloat(form.max_amount) || 5000,
        installments_count: parseInt(form.installments_count) || 4,
      };

      if (allowStatusEdit) {
        payload.is_active = !!form.is_active;
      }

      if (form.secret_key && form.secret_key.trim()) {
        payload.secret_key = form.secret_key;
      }

      await request({ url: `/payment-gateway/${gateway.id}`, method: "put", data: payload }, router);
      ToastNotification("success", `${gateway.display_name} settings saved successfully.`);
      fetchGateways();
    } catch (error) {
      ToastNotification("error", error?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving((prev) => ({ ...prev, [gateway.name]: false }));
    }
  };

  const handleTestConnection = async (gateway) => {
    setTesting((prev) => ({ ...prev, [gateway.name]: true }));
    try {
      await request({ url: `/payment-gateway/${gateway.id}/test`, method: "post" }, router);
      ToastNotification("success", `${gateway.display_name} connection test successful!`);
    } catch (error) {
      ToastNotification("error", error?.response?.data?.message || "Connection test failed.");
    } finally {
      setTesting((prev) => ({ ...prev, [gateway.name]: false }));
    }
  };

  const toggleAccordion = (id) => {
    setOpenAccordion(openAccordion === id ? "" : id);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Spinner size="sm" /> {t("Loading")}...
      </div>
    );
  }

  return (
    <>
      {showIntro && (
        <Row className="gy-3">
          <Col xs="12">
            <div className="small text-muted mb-3">
              Configure Buy Now Pay Later (BNPL) payment gateways like Tabby and Tamara.
              These allow customers to split their purchases into interest-free installments.
            </div>
          </Col>
        </Row>
      )}

      <Accordion open={openAccordion} toggle={toggleAccordion}>
        {gateways.map((gateway) => {
          const form = forms[gateway.name] || {};
          const isSaving = saving[gateway.name];
          const isTesting = testing[gateway.name];

          return (
            <AccordionItem key={gateway.id}>
              <AccordionHeader targetId={gateway.name}>
                <div className="d-flex align-items-center gap-2 w-100">
                  <span className="fw-semibold">{gateway.display_name}</span>
                  {gateway.is_active ? (
                    <Badge color="success" className="ms-2">
                      <RiCheckLine className="me-1" /> Active
                    </Badge>
                  ) : (
                    <Badge color="secondary" className="ms-2">
                      <RiCloseLine className="me-1" /> Inactive
                    </Badge>
                  )}
                  {gateway.is_sandbox && (
                    <Badge color="warning" className="ms-2">
                      Sandbox
                    </Badge>
                  )}
                  {gateway.is_configured && (
                    <Badge color="info" className="ms-2">
                      Configured
                    </Badge>
                  )}
                </div>
              </AccordionHeader>
              <AccordionBody accordionId={gateway.name}>
                <Row className="gy-3">
                  {allowStatusEdit && (
                    <Col md="6">
                      <FormGroup check className="d-flex align-items-center gap-2">
                        <Input
                          type="checkbox"
                          checked={!!form.is_active}
                          onChange={handleChange(gateway.name, "is_active")}
                        />
                        <Label check>Enable {gateway.display_name}</Label>
                      </FormGroup>
                    </Col>
                  )}

                  <Col md="6">
                    <FormGroup check className="d-flex align-items-center gap-2">
                      <Input
                        type="checkbox"
                        checked={!!form.is_sandbox}
                        onChange={handleChange(gateway.name, "is_sandbox")}
                      />
                      <Label check>Sandbox Mode (Testing)</Label>
                    </FormGroup>
                  </Col>

                  <Col xs="12">
                    <hr className="my-2" />
                    <h6 className="text-muted mb-3">API Credentials</h6>
                  </Col>

                  <Col md="6">
                    <Label className="form-label">Public Key / API Key</Label>
                    <Input
                      type="text"
                      placeholder="pk_..."
                      value={form.public_key || ""}
                      onChange={handleChange(gateway.name, "public_key")}
                    />
                  </Col>

                  <Col md="6">
                    <Label className="form-label">
                      Secret Key {gateway.has_secret_key && <small className="text-success">(configured - leave blank to keep)</small>}
                    </Label>
                    <Input
                      type="password"
                      placeholder={gateway.has_secret_key ? "Leave blank to keep existing" : "sk_..."}
                      value={form.secret_key || ""}
                      onChange={handleChange(gateway.name, "secret_key")}
                    />
                  </Col>

                  <Col md="6">
                    <Label className="form-label">Merchant Code</Label>
                    <Input
                      type="text"
                      placeholder="merchant_code"
                      value={form.merchant_code || ""}
                      onChange={handleChange(gateway.name, "merchant_code")}
                    />
                  </Col>

                  <Col xs="12">
                    <hr className="my-2" />
                    <h6 className="text-muted mb-3">Amount Limits (AED)</h6>
                  </Col>

                  <Col md="4">
                    <Label className="form-label">Minimum Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.min_amount}
                      onChange={handleChange(gateway.name, "min_amount")}
                    />
                  </Col>

                  <Col md="4">
                    <Label className="form-label">Maximum Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.max_amount}
                      onChange={handleChange(gateway.name, "max_amount")}
                    />
                  </Col>

                  <Col md="4">
                    <Label className="form-label">Installments Count</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={form.installments_count}
                      onChange={handleChange(gateway.name, "installments_count")}
                    />
                  </Col>

                  <Col xs="12">
                    <Label className="form-label">Description (shown to customers)</Label>
                    <Input
                      type="textarea"
                      rows="2"
                      placeholder="Pay in installments..."
                      value={form.description || ""}
                      onChange={handleChange(gateway.name, "description")}
                    />
                  </Col>

                  <Col xs="12" className="d-flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleSave(gateway)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Spinner size="sm" className="me-1" /> Saving...
                        </>
                      ) : (
                        t("SaveChanges")
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => handleTestConnection(gateway)}
                      disabled={isTesting || !gateway.is_configured}
                      title={!gateway.is_configured ? "Configure API credentials first" : "Test connection"}
                    >
                      {isTesting ? (
                        <>
                          <Spinner size="sm" className="me-1" /> Testing...
                        </>
                      ) : (
                        <>
                          <RiTestTubeLine className="me-1" /> Test Connection
                        </>
                      )}
                    </button>
                  </Col>
                </Row>
              </AccordionBody>
            </AccordionItem>
          );
        })}
      </Accordion>

      {gateways.length === 0 && (
        <div className="text-center text-muted py-4">
          {gatewayFilter.length
            ? "No payment gateways found for this section."
            : "No payment gateways found. Run the seeder to create default gateways."}
        </div>
      )}
    </>
  );
};

export default PaymentGatewaysTab;
