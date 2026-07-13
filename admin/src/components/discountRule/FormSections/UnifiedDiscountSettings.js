import { useState, useMemo } from "react";
import {
  Card, CardHeader, CardBody, Collapse, Row, Col,
  FormGroup, Label, Input, Button, Alert, Badge, Table
} from "reactstrap";
import { RiDeleteBin6Line, RiAddLine, RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import FilterSection from "./FilterSection";
import ConditionSection from "./ConditionSection";
import RangeSection from "./RangeSection";

const DISCOUNT_VALUE_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed_amount', label: 'Fixed Amount (AED)' },
  { value: 'fixed_price', label: 'Fixed Price (AED)' },
];

const FILTER_CONDITION_TYPES = [
  { value: 'eligible_qty', label: 'Eligible Quantity' },
  { value: 'eligible_subtotal', label: 'Eligible Subtotal' },
];

const FILTER_CONDITION_OPERATORS = [
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
];

const UnifiedDiscountSettings = ({
  values,
  handleChange,
  handleBlur,
  errors,
  touched,
  setFieldValue,
  categories,
}) => {
  const [promoOpen, setPromoOpen] = useState(!!values.requires_promo_code);
  const [filterConditionsOpen, setFilterConditionsOpen] = useState(
    (values.filter_conditions && values.filter_conditions.length > 0) || false
  );

  const ruleType = values.rule_type;

  // Generate rule preview summary
  const previewSummary = useMemo(() => {
    const parts = [];
    const dt = values.discount_type;
    const dv = values.discount_value;
    const suffix = dt === 'percentage' ? '%' : ' AED';

    switch (ruleType) {
      case 'product':
        if (dv) parts.push(`${dv}${suffix} off on matching products`);
        break;
      case 'cart':
        if (dv && values.min_cart_total) {
          parts.push(`${dv}${suffix} off when cart total >= ${values.min_cart_total} AED`);
        }
        break;
      case 'bogo':
        if (values.buy_qty && values.get_qty) {
          parts.push(`Buy ${values.buy_qty}, Get ${values.get_qty} at ${dv || 100}% off`);
        }
        break;
      case 'bxgx':
        if (values.buy_qty && values.get_qty) {
          parts.push(`Buy ${values.buy_qty}, Get ${values.get_qty} free (same products) at ${dv || 100}% off`);
        }
        break;
      case 'bulk':
        if (dv) {
          parts.push(`${dv}${suffix} off on bulk purchases`);
          if (values.ranges && values.ranges.length > 0) {
            parts.push(`${values.ranges.length} tier(s) configured`);
          }
        }
        break;
      case 'bundle':
        if (values.bundle_qty) {
          if (dt === 'fixed_price' && dv) parts.push(`Bundle of ${values.bundle_qty} items for ${dv} AED`);
          else if (dv) parts.push(`${dv}${suffix} off when buying ${values.bundle_qty} items together`);
          if (values.is_recursive) {
            parts.push('Recursive');
          }
        }
        break;
      default:
        break;
    }

    if (values.requires_promo_code && values.promo_code) {
      parts.push(`Requires promo code: ${values.promo_code}`);
    }

    const filterCount = (values.filters || []).length;
    if (filterCount > 0) parts.push(`${filterCount} filter(s)`);

    const fcCount = (values.filter_conditions || []).length;
    if (fcCount > 0) parts.push(`${fcCount} filter condition(s)`);

    return parts.length > 0 ? parts : ['Configure the settings below'];
  }, [ruleType, values]);

  // Filter condition helpers
  const addFilterCondition = () => {
    const current = values.filter_conditions || [];
    setFieldValue('filter_conditions', [
      ...current,
      { type: 'eligible_qty', operator: '>=', value: '' }
    ]);
  };

  const updateFilterCondition = (index, field, value) => {
    const updated = [...(values.filter_conditions || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFieldValue('filter_conditions', updated);
  };

  const removeFilterCondition = (index) => {
    const updated = (values.filter_conditions || []).filter((_, i) => i !== index);
    setFieldValue('filter_conditions', updated);
  };

  return (
    <div className="unified-discount-settings">
      {/* Section 1: Promo Code (collapsible) */}
      <Card className="mb-3">
        <CardHeader
          className="d-flex align-items-center justify-content-between py-2"
          style={{ cursor: 'pointer', backgroundColor: promoOpen ? '#f0f7ff' : '#fafafa' }}
          onClick={() => setPromoOpen(!promoOpen)}
        >
          <div className="d-flex align-items-center gap-2">
            <strong>Promo Code</strong>
            {values.requires_promo_code && values.promo_code && (
              <Badge color="info" pill>{values.promo_code}</Badge>
            )}
          </div>
          {promoOpen ? <RiArrowUpSLine size={20} /> : <RiArrowDownSLine size={20} />}
        </CardHeader>
        <Collapse isOpen={promoOpen}>
          <CardBody>
            <Row>
              <Col md="12">
                <FormGroup check>
                  <Label check>
                    <Input
                      type="checkbox"
                      name="requires_promo_code"
                      checked={values.requires_promo_code}
                      onChange={handleChange}
                    />
                    <strong>Requires Promo Code</strong>
                  </Label>
                  <small className="text-muted d-block ms-4">
                    When enabled, customers must enter a promo code to activate this discount
                  </small>
                </FormGroup>
              </Col>
              {values.requires_promo_code && (
                <>
                  <Col md="4" className="mt-3">
                    <FormGroup>
                      <Label>Promo Code</Label>
                      <Input
                        type="text"
                        name="promo_code"
                        value={values.promo_code || ''}
                        onChange={(e) => setFieldValue('promo_code', e.target.value.toUpperCase())}
                        onBlur={handleBlur}
                        placeholder="e.g., SUMMER20"
                        style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px' }}
                      />
                      <small className="text-muted">Case-insensitive</small>
                    </FormGroup>
                  </Col>
                  <Col md="4" className="mt-3">
                    <FormGroup check className="mt-4">
                      <Label check>
                        <Input
                          type="checkbox"
                          name="show_as_coupon"
                          checked={values.show_as_coupon}
                          onChange={handleChange}
                        />
                        Show as coupon in cart
                      </Label>
                      <small className="text-muted d-block ms-4">
                        Display this as a coupon code field in the checkout
                      </small>
                    </FormGroup>
                  </Col>
                </>
              )}
            </Row>
          </CardBody>
        </Collapse>
      </Card>

      {/* Section 2: Product Targeting */}
      {ruleType !== 'cart' && (
        <Card className="mb-3">
          <CardHeader className="py-2" style={{ backgroundColor: '#fafafa' }}>
            <div className="d-flex align-items-center gap-2">
              <strong>{ruleType === 'bogo' ? 'Buy/Get Product Targeting' : 'Product Targeting'}</strong>
              {(values.filters || []).length > 0 && (
                <Badge color="primary" pill>{(values.filters || []).length} filter(s)</Badge>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <FilterSection
              filters={values.filters}
              setFilters={(filters) => setFieldValue('filters', filters)}
              categories={categories}
              ruleType={ruleType}
            />
          </CardBody>
        </Card>
      )}

      {/* Section 3: Discount Configuration */}
      <Card className="mb-3">
        <CardHeader className="py-2" style={{ backgroundColor: '#fafafa' }}>
          <strong>Discount Configuration</strong>
        </CardHeader>
        <CardBody>
          {/* PRODUCT discount settings */}
          {ruleType === 'product' && (
            <Row>
              <Col md="4">
                <FormGroup>
                  <Label>Discount Type <span className="text-danger">*</span></Label>
                  <Input type="select" name="discount_type" value={values.discount_type} onChange={handleChange}>
                    {DISCOUNT_VALUE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>Discount Value <span className="text-danger">*</span> {values.discount_type === 'percentage' && '(%)'}</Label>
                  <Input
                    type="number"
                    name="discount_value"
                    value={values.discount_value}
                    onChange={handleChange}
                    placeholder={values.discount_type === 'percentage' ? "e.g., 20" : "e.g., 50"}
                    min={0}
                    max={values.discount_type === 'percentage' ? 100 : undefined}
                    invalid={touched.discount_value && !!errors.discount_value}
                  />
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>Max Discount Cap</Label>
                  <Input
                    type="number"
                    name="max_discount_amount"
                    value={values.max_discount_amount}
                    onChange={handleChange}
                    placeholder="No cap"
                    min={0}
                  />
                  <small className="text-muted">Limit maximum discount (optional)</small>
                </FormGroup>
              </Col>
            </Row>
          )}

          {/* CART discount settings */}
          {ruleType === 'cart' && (
            <Row>
              <Col md="3">
                <FormGroup>
                  <Label>Minimum Cart Total</Label>
                  <Input
                    type="number"
                    name="min_cart_total"
                    value={values.min_cart_total}
                    onChange={handleChange}
                    placeholder="No minimum"
                    min={0}
                  />
                  <small className="text-muted">Optional threshold for cart total</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Maximum Cart Total</Label>
                  <Input
                    type="number"
                    name="max_cart_total"
                    value={values.max_cart_total}
                    onChange={handleChange}
                    placeholder="No limit"
                    min={0}
                  />
                  <small className="text-muted">Optional upper limit</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Discount Type <span className="text-danger">*</span></Label>
                  <Input type="select" name="discount_type" value={values.discount_type} onChange={handleChange}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (AED)</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Discount Value <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="discount_value"
                    value={values.discount_value}
                    onChange={handleChange}
                    placeholder={values.discount_type === 'percentage' ? "e.g., 10" : "e.g., 50"}
                    min={0}
                  />
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>Max Discount Cap</Label>
                  <Input
                    type="number"
                    name="max_discount_amount"
                    value={values.max_discount_amount}
                    onChange={handleChange}
                    placeholder="No cap"
                    min={0}
                  />
                  <small className="text-muted">Limit maximum discount</small>
                </FormGroup>
              </Col>
            </Row>
          )}

          {/* BOGO settings */}
          {ruleType === 'bogo' && (
            <Row>
              <Col md="3">
                <FormGroup>
                  <Label>Buy Quantity <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="buy_qty"
                    value={values.buy_qty}
                    onChange={handleChange}
                    placeholder="e.g., 2"
                    min={1}
                  />
                  <small className="text-muted">Items to buy</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Get Quantity <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="get_qty"
                    value={values.get_qty}
                    onChange={handleChange}
                    placeholder="e.g., 1"
                    min={1}
                  />
                  <small className="text-muted">Free/discounted items</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Get Discount % <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="discount_value"
                    value={values.discount_value}
                    onChange={handleChange}
                    placeholder="100"
                    min={0}
                    max={100}
                  />
                  <small className="text-muted">100% = FREE</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Selection Strategy</Label>
                  <Input type="select" name="selection_strategy" value={values.selection_strategy} onChange={handleChange}>
                    <option value="cheapest_first">Cheapest Free</option>
                    <option value="most_expensive_first">Most Expensive Free</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>Max Applications</Label>
                  <Input
                    type="number"
                    name="max_applications"
                    value={values.max_applications}
                    onChange={handleChange}
                    placeholder="Unlimited"
                    min={1}
                  />
                  <small className="text-muted">Max times per order</small>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup className="mt-4">
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        name="is_recursive"
                        checked={values.is_recursive}
                        onChange={handleChange}
                      />
                      Recursive
                    </Label>
                  </FormGroup>
                  <small className="text-muted">Apply multiple times (e.g., Buy 6 Get 3 Free)</small>
                </FormGroup>
              </Col>
            </Row>
          )}

          {/* BXGX settings */}
          {ruleType === 'bxgx' && (
            <Row>
              <Col md="3">
                <FormGroup>
                  <Label>Buy Quantity <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="buy_qty"
                    value={values.buy_qty}
                    onChange={handleChange}
                    placeholder="e.g., 2"
                    min={1}
                  />
                  <small className="text-muted">Items to buy</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Get Free Qty <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="get_qty"
                    value={values.get_qty}
                    onChange={handleChange}
                    placeholder="e.g., 1"
                    min={1}
                  />
                  <small className="text-muted">Free items</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Get Discount % <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="discount_value"
                    value={values.discount_value}
                    onChange={handleChange}
                    placeholder="100"
                    min={0}
                    max={100}
                  />
                  <small className="text-muted">100% = FREE</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Selection Strategy</Label>
                  <Input type="select" name="selection_strategy" value={values.selection_strategy} onChange={handleChange}>
                    <option value="cheapest_first">Cheapest Free</option>
                    <option value="most_expensive_first">Most Expensive Free</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Max Free Per Order</Label>
                  <Input
                    type="number"
                    name="max_free_qty_per_order"
                    value={values.max_free_qty_per_order}
                    onChange={handleChange}
                    placeholder="Unlimited"
                    min={1}
                  />
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Max Applications</Label>
                  <Input
                    type="number"
                    name="max_applications_per_order"
                    value={values.max_applications_per_order}
                    onChange={handleChange}
                    placeholder="Unlimited"
                    min={1}
                  />
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup className="mt-4">
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        name="is_recursive"
                        checked={values.is_recursive}
                        onChange={handleChange}
                      />
                      Recursive
                    </Label>
                  </FormGroup>
                  <small className="text-muted">Apply multiple times</small>
                </FormGroup>
              </Col>
            </Row>
          )}

          {/* BULK discount settings + inline tiers */}
          {ruleType === 'bulk' && (
            <>
              <Row>
                <Col md="4">
                  <FormGroup>
                    <Label>Discount Type <span className="text-danger">*</span></Label>
                    <Input type="select" name="discount_type" value={values.discount_type} onChange={handleChange}>
                      {DISCOUNT_VALUE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <Label>Default Discount Value <span className="text-danger">*</span></Label>
                    <Input
                      type="number"
                      name="discount_value"
                      value={values.discount_value}
                      onChange={handleChange}
                      placeholder="e.g., 15"
                      min={0}
                    />
                    <small className="text-muted">Used if no tiers defined</small>
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <Label>Max Discount Cap</Label>
                    <Input
                      type="number"
                      name="max_discount_amount"
                      value={values.max_discount_amount}
                      onChange={handleChange}
                      placeholder="No cap"
                      min={0}
                    />
                  </FormGroup>
                </Col>
              </Row>
              <hr />
              <h6 className="mb-3">Quantity Tiers</h6>
              <RangeSection
                ranges={values.ranges}
                setRanges={(ranges) => setFieldValue('ranges', ranges)}
                discountType={values.discount_type}
              />
            </>
          )}

          {/* BUNDLE discount settings */}
          {ruleType === 'bundle' && (
            <Row>
              <Col md="3">
                <FormGroup>
                  <Label>Bundle Quantity</Label>
                  <Input
                    type="number"
                    name="bundle_qty"
                    value={values.bundle_qty}
                    onChange={handleChange}
                    placeholder="e.g., 3"
                    min={2}
                  />
                  <small className="text-muted">Items needed for bundle</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Bundle Price Type <span className="text-danger">*</span></Label>
                  <Input type="select" name="discount_type" value={values.discount_type} onChange={handleChange}>
                    <option value="fixed_price">Fixed Bundle Price (AED)</option>
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="fixed_amount">Fixed Amount Off (AED)</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Value <span className="text-danger">*</span></Label>
                  <Input
                    type="number"
                    name="discount_value"
                    value={values.discount_value}
                    onChange={handleChange}
                    placeholder={values.discount_type === 'fixed_price' ? "Bundle price" : "Discount value"}
                    min={0}
                  />
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Bundle Fixed Price</Label>
                  <Input
                    type="number"
                    name="bundle_price"
                    value={values.bundle_price}
                    onChange={handleChange}
                    placeholder="e.g., 199"
                    min={0}
                  />
                  <small className="text-muted">Override bundle price (AED)</small>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup className="mt-4">
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        name="is_recursive"
                        checked={values.is_recursive}
                        onChange={handleChange}
                      />
                      Recursive
                    </Label>
                  </FormGroup>
                  <small className="text-muted">Apply the bundle multiple times when cart quantity allows</small>
                </FormGroup>
              </Col>
              {values.is_recursive ? (
                <Col md="3">
                  <FormGroup>
                    <Label>Max Applications</Label>
                    <Input
                      type="number"
                      name="max_applications"
                      value={values.max_applications}
                      onChange={handleChange}
                      placeholder="Unlimited"
                      min={1}
                    />
                    <small className="text-muted">Optional limit per order</small>
                  </FormGroup>
                </Col>
              ) : null}
            </Row>
          )}
        </CardBody>
      </Card>

      {/* Section 4: Filter Conditions (collapsible) */}
      <Card className="mb-3">
        <CardHeader
          className="d-flex align-items-center justify-content-between py-2"
          style={{ cursor: 'pointer', backgroundColor: filterConditionsOpen ? '#f0f7ff' : '#fafafa' }}
          onClick={() => setFilterConditionsOpen(!filterConditionsOpen)}
        >
          <div className="d-flex align-items-center gap-2">
            <strong>Filter Conditions</strong>
            {(values.filter_conditions || []).length > 0 && (
              <Badge color="warning" pill>{(values.filter_conditions || []).length}</Badge>
            )}
            <small className="text-muted">(conditions on filtered products)</small>
          </div>
          {filterConditionsOpen ? <RiArrowUpSLine size={20} /> : <RiArrowDownSLine size={20} />}
        </CardHeader>
        <Collapse isOpen={filterConditionsOpen}>
          <CardBody>
            <small className="text-muted d-block mb-3">
              These conditions are evaluated against the products that match your filters above.
              For example, require at least 3 eligible items in cart, or eligible subtotal above 200 AED.
            </small>
            {(values.filter_conditions || []).length > 0 && (
              <Table size="sm" bordered responsive className="mb-3">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Condition Type</th>
                    <th style={{ width: '20%' }}>Operator</th>
                    <th style={{ width: '30%' }}>Value</th>
                    <th style={{ width: '20%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(values.filter_conditions || []).map((fc, index) => (
                    <tr key={index}>
                      <td>
                        <Input
                          type="select"
                          bsSize="sm"
                          value={fc.type}
                          onChange={(e) => updateFilterCondition(index, 'type', e.target.value)}
                        >
                          {FILTER_CONDITION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </Input>
                      </td>
                      <td>
                        <Input
                          type="select"
                          bsSize="sm"
                          value={fc.operator}
                          onChange={(e) => updateFilterCondition(index, 'operator', e.target.value)}
                        >
                          {FILTER_CONDITION_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </Input>
                      </td>
                      <td>
                        <Input
                          type="number"
                          bsSize="sm"
                          value={fc.value}
                          onChange={(e) => updateFilterCondition(index, 'value', e.target.value)}
                          placeholder={fc.type === 'eligible_qty' ? 'e.g., 3' : 'e.g., 200'}
                          min={0}
                        />
                      </td>
                      <td>
                        <Button
                          color="danger"
                          size="sm"
                          outline
                          onClick={() => removeFilterCondition(index)}
                        >
                          <RiDeleteBin6Line />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Button color="outline-primary" size="sm" onClick={addFilterCondition}>
              <RiAddLine className="me-1" /> Add Filter Condition
            </Button>
          </CardBody>
        </Collapse>
      </Card>

      {/* Section 5: Cart Conditions (only for cart type) */}
      {ruleType === 'cart' && (
        <Card className="mb-3">
          <CardHeader className="py-2" style={{ backgroundColor: '#fafafa' }}>
            <div className="d-flex align-items-center gap-2">
              <strong>Cart Conditions</strong>
              {(values.conditions || []).length > 0 && (
                <Badge color="info" pill>{(values.conditions || []).length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <ConditionSection
              conditions={values.conditions}
              setConditions={(conditions) => setFieldValue('conditions', conditions)}
            />
          </CardBody>
        </Card>
      )}

      {/* Section 6: Rule Preview */}
      <Card className="mb-3" style={{ borderColor: '#28a745' }}>
        <CardHeader className="py-2" style={{ backgroundColor: '#d4edda', borderColor: '#28a745' }}>
          <strong style={{ color: '#155724' }}>Rule Preview</strong>
        </CardHeader>
        <CardBody style={{ backgroundColor: '#f8fff8' }}>
          <FormGroup check className="mb-3">
            <Label check>
              <Input
                type="checkbox"
                name="show_rule_preview"
                checked={!!values.show_rule_preview}
                onChange={(event) => setFieldValue('show_rule_preview', event.target.checked)}
              />
              Show rule preview on storefront
            </Label>
          </FormGroup>
          <ul className="mb-0" style={{ color: '#155724' }}>
            {previewSummary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
};

export default UnifiedDiscountSettings;
