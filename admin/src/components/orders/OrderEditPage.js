
import { useContext, useEffect, useMemo, useState } from "react";
import { Card, CardBody, Col, FormGroup, Input, Label, Row, Table } from "reactstrap";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiDeleteBin6Line } from "react-icons/ri";
import request from "@/utils/axiosUtils";
import { OrderAPI, product as ProductAPI } from "@/utils/axiosUtils/API";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";
import Loader from "@/components/commonComponent/Loader";
import Btn from "@/elements/buttons/Btn";
import ShowModal from "@/elements/alerts&Modals/Modal";
import SettingContext from "@/helper/settingContext";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "out-for-delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

const paymentMethodOptions = ["cod", "stripe", "tabby", "tamara"];

const normalizeStatus = (value) => {
  if (!value) return "pending";
  return value === "out_for_delivery" ? "out-for-delivery" : value;
};

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const OrderEditPage = ({ orderId }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { convertCurrency } = useContext(SettingContext);
  const [editPermission] = usePermissionCheck(["edit"], "order");
  const [items, setItems] = useState([]);
  const [initialValues, setInitialValues] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const { data, isLoading } = useCustomQuery(
    ["order-edit", orderId],
    () => request({ url: `${OrderAPI}/${orderId}` }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data,
    }
  );

  useEffect(() => {
    if (data) {
      const shipping = data?.shipping_address || {};
      const billing = data?.billing_address || {};
      setInitialValues({
        status: normalizeStatus(data?.status),
        payment_status: data?.payment_status || "pending",
        payment_method: data?.payment_method || "",
        tracking_number: data?.tracking_number || "",
        carrier: data?.carrier || "",
        shipping_method: data?.shipping_method || "",
        shipping_amount: data?.shipping_total ?? data?.shipping_amount ?? 0,
        tax_amount: data?.tax_total ?? data?.tax_amount ?? 0,
        discount_amount: data?.discount_amount ?? data?.coupon_total_discount ?? 0,
        shipping_first_name: shipping?.first_name || "",
        shipping_last_name: shipping?.last_name || "",
        shipping_email: shipping?.email || data?.consumer?.email || "",
        shipping_phone: shipping?.phone || data?.consumer?.phone || "",
        shipping_street: shipping?.street || "",
        shipping_apartment: shipping?.apartment || "",
        shipping_city: shipping?.city || "",
        shipping_state: shipping?.state?.name || "",
        shipping_postal_code: shipping?.pincode || "",
        shipping_country: shipping?.country?.name || "",
        billing_first_name: billing?.first_name || "",
        billing_last_name: billing?.last_name || "",
        billing_email: billing?.email || "",
        billing_phone: billing?.phone || "",
        billing_street: billing?.street || "",
        billing_apartment: billing?.apartment || "",
        billing_city: billing?.city || "",
        billing_state: billing?.state?.name || "",
        billing_postal_code: billing?.pincode || "",
        billing_country: billing?.country?.name || "",
        customer_notes: data?.customer_notes || "",
      });

      const mappedItems = (data?.products || []).map((item, index) => ({
        key: item?.order_item_id || `${item?.id}-${item?.pivot?.variation?.id || "base"}-${index}`,
        product_id: item?.id,
        variant_id: item?.pivot?.variation?.id || null,
        product_name: item?.name,
        variant_name: item?.pivot?.variation?.name || null,
        sku: item?.pivot?.variation?.sku || item?.sku || "",
        quantity: item?.pivot?.quantity || 1,
        price: item?.pivot?.single_price || 0,
      }));
      setItems(mappedItems);
    }
  }, [data]);

  useEffect(() => {
    if (!isLoading && !data) {
      router.push("/404");
    }
  }, [isLoading, data, router]);

  useEffect(() => {
    if (!productSearch || productSearch.trim().length < 2) {
      setProductOptions([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setProductLoading(true);
        const response = await request(
          { url: ProductAPI, params: { search: productSearch, paginate: 20 } },
          router
        );
        if (active) {
          setProductOptions(response?.data?.data || []);
        }
      } catch (error) {
        if (active) {
          setProductOptions([]);
        }
      } finally {
        if (active) {
          setProductLoading(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [productSearch, router]);

  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0);
  }, [items]);

  const resetNewItem = () => {
    setSelectedProduct(null);
    setSelectedVariantId("");
    setNewItemQty(1);
    setNewItemPrice("");
  };

  const handleProductSelect = async (productId) => {
    if (!productId) {
      resetNewItem();
      return;
    }
    try {
      const response = await request({ url: `${ProductAPI}/${productId}` }, router);
      const product = response?.data?.data;
      setSelectedProduct(product);
      setSelectedVariantId("");
      const basePrice = product?.sale_price > 0 ? product?.sale_price : product?.price;
      setNewItemPrice(basePrice ?? "");
    } catch (error) {
      resetNewItem();
    }
  };

  const handleVariantSelect = (variantId) => {
    setSelectedVariantId(variantId);
    const variant = selectedProduct?.variants?.find((v) => String(v.id) === String(variantId));
    if (variant) {
      const variantPrice = variant?.sale_price > 0 ? variant?.sale_price : variant?.price;
      setNewItemPrice(variantPrice ?? "");
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      ToastNotification("error", "Select a product first.");
      return;
    }

    const variant = selectedVariantId
      ? selectedProduct?.variants?.find((v) => String(v.id) === String(selectedVariantId))
      : null;

    const qtyValue = Math.max(1, parseInt(newItemQty, 10) || 1);
    const priceValue = Math.max(0, toNumber(newItemPrice));

    setItems((prev) => [
      ...prev,
      {
        key: `${selectedProduct?.id}-${variant?.id || "base"}-${Date.now()}`,
        product_id: selectedProduct?.id,
        variant_id: variant?.id || null,
        product_name: selectedProduct?.name,
        variant_name: variant?.name || null,
        sku: variant?.sku || selectedProduct?.sku || "",
        quantity: qtyValue,
        price: priceValue,
      },
    ]);

    resetNewItem();
  };

  const handleRemoveItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleItemChange = (key, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const handleSubmit = (values) => {
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingValues) return;
    setSaving(true);
    try {
      const payload = {
        status: normalizeStatus(pendingValues.status),
        payment_status: pendingValues.payment_status,
        payment_method: pendingValues.payment_method,
        tracking_number: pendingValues.tracking_number,
        carrier: pendingValues.carrier,
        shipping_method: pendingValues.shipping_method,
        shipping_amount: toNumber(pendingValues.shipping_amount),
        tax_amount: toNumber(pendingValues.tax_amount),
        discount_amount: toNumber(pendingValues.discount_amount),
        shipping_first_name: pendingValues.shipping_first_name,
        shipping_last_name: pendingValues.shipping_last_name,
        shipping_email: pendingValues.shipping_email,
        shipping_phone: pendingValues.shipping_phone,
        shipping_street: pendingValues.shipping_street,
        shipping_apartment: pendingValues.shipping_apartment,
        shipping_city: pendingValues.shipping_city,
        shipping_state: pendingValues.shipping_state,
        shipping_postal_code: pendingValues.shipping_postal_code,
        shipping_country: pendingValues.shipping_country,
        billing_first_name: pendingValues.billing_first_name,
        billing_last_name: pendingValues.billing_last_name,
        billing_email: pendingValues.billing_email,
        billing_phone: pendingValues.billing_phone,
        billing_street: pendingValues.billing_street,
        billing_apartment: pendingValues.billing_apartment,
        billing_city: pendingValues.billing_city,
        billing_state: pendingValues.billing_state,
        billing_postal_code: pendingValues.billing_postal_code,
        billing_country: pendingValues.billing_country,
        customer_notes: pendingValues.customer_notes,
        items: items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
          price: Math.max(0, toNumber(item.price)),
        })),
      };

      await request(
        {
          url: `${OrderAPI}/${orderId}`,
          method: "PUT",
          data: payload,
        },
        router
      );

      ToastNotification("success", t("Order updated successfully") || "Order updated successfully");
      setConfirmOpen(false);
      router.push(`/order/details/${data?.order_number || data?.id || orderId}`);
    } catch (error) {
      ToastNotification("error", error?.response?.data?.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !initialValues) return <Loader />;

  return (
    <>
      <Formik initialValues={initialValues} enableReinitialize onSubmit={handleSubmit}>{({ values, handleChange }) => {
          const discountValue = toNumber(values.discount_amount);
          const shippingValue = toNumber(values.shipping_amount);
          const taxValue = toNumber(values.tax_amount);
          const totalValue = Math.max(0, itemsSubtotal - discountValue + shippingValue + taxValue);

          return (
            <Form>
              <Row className="pb-4">
                <Col xxl="6">
                  <Card className="mb-4">
                    <CardBody>
                      <div className="title-header">
                        <div className="d-flex align-items-center">
                          <h5>{t("Order Status") || "Order Status"}</h5>
                        </div>
                      </div>
                      <Row className="g-3">
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Status") || "Status"}</Label>
                            <Input type="select" name="status" value={values.status} disabled={!editPermission} onChange={handleChange}>
                              {statusOptions.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </Input>
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Payment Status") || "Payment Status"}</Label>
                            <Input type="select" name="payment_status" value={values.payment_status} disabled={!editPermission} onChange={handleChange}>
                              {paymentStatusOptions.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </Input>
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Payment Method") || "Payment Method"}</Label>
                            <Input
                              type="text"
                              name="payment_method"
                              list="payment-methods"
                              value={values.payment_method}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                            <datalist id="payment-methods">
                              {paymentMethodOptions.map((method) => (
                                <option key={method} value={method} />
                              ))}
                            </datalist>
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Tracking Number") || "Tracking Number"}</Label>
                            <Input
                              type="text"
                              name="tracking_number"
                              value={values.tracking_number}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Courier") || "Courier"}</Label>
                            <Input
                              type="text"
                              name="carrier"
                              value={values.carrier}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Shipping Method") || "Shipping Method"}</Label>
                            <Input
                              type="text"
                              name="shipping_method"
                              value={values.shipping_method}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>

                  <Card className="mb-4">
                    <CardBody>
                      <div className="title-header">
                        <div className="d-flex align-items-center">
                          <h5>{t("Customer Details") || "Customer Details"}</h5>
                        </div>
                      </div>
                      <Row className="g-3">
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("First Name") || "First Name"}</Label>
                            <Input
                              type="text"
                              name="shipping_first_name"
                              value={values.shipping_first_name}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Last Name") || "Last Name"}</Label>
                            <Input
                              type="text"
                              name="shipping_last_name"
                              value={values.shipping_last_name}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Email") || "Email"}</Label>
                            <Input
                              type="email"
                              name="shipping_email"
                              value={values.shipping_email}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Phone") || "Phone"}</Label>
                            <Input
                              type="text"
                              name="shipping_phone"
                              value={values.shipping_phone}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>

                  <Card className="mb-4">
                    <CardBody>
                      <div className="title-header">
                        <div className="d-flex align-items-center">
                          <h5>{t("Billing Address") || "Billing Address"}</h5>
                        </div>
                      </div>
                      <Row className="g-3">
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("First Name") || "First Name"}</Label>
                            <Input
                              type="text"
                              name="billing_first_name"
                              value={values.billing_first_name}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Last Name") || "Last Name"}</Label>
                            <Input
                              type="text"
                              name="billing_last_name"
                              value={values.billing_last_name}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Email") || "Email"}</Label>
                            <Input
                              type="email"
                              name="billing_email"
                              value={values.billing_email}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Phone") || "Phone"}</Label>
                            <Input
                              type="text"
                              name="billing_phone"
                              value={values.billing_phone}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="12">
                          <FormGroup>
                            <Label className="form-label">{t("Street") || "Street"}</Label>
                            <Input
                              type="text"
                              name="billing_street"
                              value={values.billing_street}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Apartment") || "Apartment"}</Label>
                            <Input
                              type="text"
                              name="billing_apartment"
                              value={values.billing_apartment}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("City") || "City"}</Label>
                            <Input
                              type="text"
                              name="billing_city"
                              value={values.billing_city}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("State") || "State"}</Label>
                            <Input
                              type="text"
                              name="billing_state"
                              value={values.billing_state}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Postal Code") || "Postal Code"}</Label>
                            <Input
                              type="text"
                              name="billing_postal_code"
                              value={values.billing_postal_code}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Country") || "Country"}</Label>
                            <Input
                              type="text"
                              name="billing_country"
                              value={values.billing_country}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>

                  <Card className="mb-4">
                    <CardBody>
                      <div className="title-header">
                        <div className="d-flex align-items-center">
                          <h5>{t("Shipping Address") || "Shipping Address"}</h5>
                        </div>
                      </div>
                      <Row className="g-3">
                        <Col md="12">
                          <FormGroup>
                            <Label className="form-label">{t("Street") || "Street"}</Label>
                            <Input
                              type="text"
                              name="shipping_street"
                              value={values.shipping_street}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Apartment") || "Apartment"}</Label>
                            <Input
                              type="text"
                              name="shipping_apartment"
                              value={values.shipping_apartment}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("City") || "City"}</Label>
                            <Input
                              type="text"
                              name="shipping_city"
                              value={values.shipping_city}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("State") || "State"}</Label>
                            <Input
                              type="text"
                              name="shipping_state"
                              value={values.shipping_state}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Postal Code") || "Postal Code"}</Label>
                            <Input
                              type="text"
                              name="shipping_postal_code"
                              value={values.shipping_postal_code}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Country") || "Country"}</Label>
                            <Input
                              type="text"
                              name="shipping_country"
                              value={values.shipping_country}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody>
                      <div className="title-header">
                        <div className="d-flex align-items-center">
                          <h5>{t("Delivery Notes") || "Delivery Notes"}</h5>
                        </div>
                      </div>
                      <FormGroup>
                        <Input
                          type="textarea"
                          rows="3"
                          name="customer_notes"
                          value={values.customer_notes}
                          disabled={!editPermission}
                          onChange={handleChange}
                        />
                      </FormGroup>
                    </CardBody>
                  </Card>
                </Col>
                <Col xxl="6">
                  <Card className="mb-4">
                    <CardBody>
                      <div className="title-header">
                        <div className="d-flex align-items-center">
                          <h5>{t("Order Items") || "Order Items"}</h5>
                        </div>
                      </div>
                      <div className="table-responsive">
                        <Table className="product-table">
                          <thead>
                            <tr>
                              <th>{t("Item") || "Item"}</th>
                              <th>{t("Price") || "Price"}</th>
                              <th>{t("Qty") || "Qty"}</th>
                              <th>{t("Total") || "Total"}</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => {
                              const lineTotal = toNumber(item.price) * toNumber(item.quantity);
                              return (
                                <tr key={item.key}>
                                  <td>
                                    <div className="fw-semibold">{item.variant_name || item.product_name}</div>
                                    <div className="small text-muted">SKU: {item.sku || "-"}</div>
                                  </td>
                                  <td style={{ minWidth: 120 }}>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.price}
                                      disabled={!editPermission}
                                      onChange={(e) => handleItemChange(item.key, "price", e.target.value)}
                                    />
                                  </td>
                                  <td style={{ width: 90 }}>
                                    <Input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={item.quantity}
                                      disabled={!editPermission}
                                      onChange={(e) => handleItemChange(item.key, "quantity", e.target.value)}
                                    />
                                  </td>
                                  <td>{convertCurrency ? convertCurrency(lineTotal) : lineTotal.toFixed(2)}</td>
                                  <td>
                                    <Btn
                                      className="btn-light-bg btn-sm"
                                      onClick={() => handleRemoveItem(item.key)}
                                      disabled={!editPermission}
                                    >
                                      <RiDeleteBin6Line />
                                    </Btn>
                                  </td>
                                </tr>
                              );
                            })}
                            {!items.length && (
                              <tr>
                                <td colSpan="5" className="text-center text-muted">
                                  {t("No items added") || "No items added"}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>

                      <div className="border-top pt-3 mt-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <strong>{t("Add Item") || "Add Item"}</strong>
                        </div>
                        <Row className="g-3 align-items-end">
                          <Col md="6">
                            <Label className="form-label">{t("Search Product") || "Search Product"}</Label>
                            <Input
                              type="text"
                              placeholder={t("Type to search") || "Type to search"}
                              value={productSearch}
                              disabled={!editPermission}
                              onChange={(e) => setProductSearch(e.target.value)}
                            />
                            {productLoading && <div className="small text-muted mt-1">{t("Searching...") || "Searching..."}</div>}
                          </Col>
                          <Col md="6">
                            <Label className="form-label">{t("Select Product") || "Select Product"}</Label>
                            <Input
                              type="select"
                              value={selectedProduct?.id || ""}
                              disabled={!editPermission}
                              onChange={(e) => handleProductSelect(e.target.value)}
                            >
                              <option value="">{t("Select") || "Select"}</option>
                              {productOptions.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} {product.sku ? `(${product.sku})` : ""}
                                </option>
                              ))}
                            </Input>
                          </Col>
                          <Col md="6">
                            <Label className="form-label">{t("Variant") || "Variant"}</Label>
                            <Input
                              type="select"
                              value={selectedVariantId}
                              disabled={!editPermission || !selectedProduct?.variants?.length}
                              onChange={(e) => handleVariantSelect(e.target.value)}
                            >
                              <option value="">{t("No Variant") || "No Variant"}</option>
                              {(selectedProduct?.variants || []).map((variant) => (
                                <option key={variant.id} value={variant.id}>
                                  {variant.name || variant.sku || `Variant ${variant.id}`}
                                </option>
                              ))}
                            </Input>
                          </Col>
                          <Col md="3">
                            <Label className="form-label">{t("Qty") || "Qty"}</Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={newItemQty}
                              disabled={!editPermission}
                              onChange={(e) => setNewItemQty(e.target.value)}
                            />
                          </Col>
                          <Col md="3">
                            <Label className="form-label">{t("Price") || "Price"}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={newItemPrice}
                              disabled={!editPermission}
                              onChange={(e) => setNewItemPrice(e.target.value)}
                            />
                          </Col>
                          <Col md="12">
                            <Btn className="btn-theme btn-sm d-inline-flex align-items-center gap-1" onClick={handleAddItem} disabled={!editPermission}>
                              <RiAddLine />
                              {t("Add Item") || "Add Item"}
                            </Btn>
                          </Col>
                        </Row>
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="mb-4">
                    <CardBody>
                      <div className="title-header">
                        <div className="d-flex align-items-center">
                          <h5>{t("Totals") || "Totals"}</h5>
                        </div>
                      </div>
                      <Row className="g-3">
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Subtotal") || "Subtotal"}</Label>
                            <Input type="text" value={convertCurrency ? convertCurrency(itemsSubtotal) : itemsSubtotal.toFixed(2)} readOnly />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Discount") || "Discount"}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              name="discount_amount"
                              value={values.discount_amount}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Shipping") || "Shipping"}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              name="shipping_amount"
                              value={values.shipping_amount}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label className="form-label">{t("Tax") || "Tax"}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              name="tax_amount"
                              value={values.tax_amount}
                              disabled={!editPermission}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="12">
                          <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-2">
                            <strong>{t("Total") || "Total"}</strong>
                            <strong>{convertCurrency ? convertCurrency(totalValue) : totalValue.toFixed(2)}</strong>
                          </div>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>

                  <div className="d-flex gap-2 flex-wrap">
                    <Btn className="btn-theme" type="submit" disabled={!editPermission || saving}>
                      {t("Save Changes") || "Save Changes"}
                    </Btn>
                    <Btn
                      className="btn-light-bg"
                      type="button"
                      onClick={() => router.push(`/order/details/${data?.order_number || data?.id || orderId}`)}
                    >
                      {t("Cancel") || "Cancel"}
                    </Btn>
                  </div>
                </Col>
              </Row>
            </Form>
          );
        }}</Formik>

      <ShowModal
        open={confirmOpen}
        setModal={setConfirmOpen}
        title={t("Confirm Update") || "Confirm Update"}
        buttons={
          <>
            <Btn className="btn-outline fw-bold" onClick={() => setConfirmOpen(false)} disabled={saving}>
              {t("Cancel") || "Cancel"}
            </Btn>
            <Btn className="btn-theme fw-bold" onClick={handleConfirmSave} disabled={saving}>
              {saving ? t("Saving...") || "Saving..." : t("Save Changes") || "Save Changes"}
            </Btn>
          </>
        }
      >
        <p>{t("This will update the order and totals.") || "This will update the order and totals."}</p>
      </ShowModal>
    </>
  );
};

export default OrderEditPage;


