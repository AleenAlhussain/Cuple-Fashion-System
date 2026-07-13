import { Row, Col, FormGroup, Label, Input, Button, Table } from "reactstrap";
import { RiDeleteBin6Line, RiAddLine } from "react-icons/ri";

const CONDITION_TYPES = [
  { value: 'cart_total', label: 'Cart Total' },
  { value: 'cart_qty', label: 'Cart Quantity' },
  { value: 'item_qty', label: 'Item Quantity' },
  { value: 'customer_group', label: 'Customer Group' },
  { value: 'first_order', label: 'First Order Only' },
  { value: 'payment_method', label: 'Payment Method' },
  { value: 'shipping_country', label: 'Shipping Country' },
  { value: 'coupon_applied', label: 'Coupon Applied' },
];

const OPERATORS = [
  { value: '>=', label: '>= (Greater or Equal)' },
  { value: '<=', label: '<= (Less or Equal)' },
  { value: '=', label: '= (Equal)' },
  { value: '!=', label: '!= (Not Equal)' },
  { value: '>', label: '> (Greater Than)' },
  { value: '<', label: '< (Less Than)' },
  { value: 'in', label: 'In (Any of)' },
  { value: 'not_in', label: 'Not In' },
];

const ConditionSection = ({ conditions = [], setConditions }) => {
  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        type: 'cart_total',
        operator: '>=',
        value: '',
      }
    ]);
  };

  const updateCondition = (index, field, value) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const getValueInput = (condition, index) => {
    switch (condition.type) {
      case 'first_order':
        return (
          <Input
            type="select"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            bsSize="sm"
          >
            <option value="true">Yes (First order only)</option>
            <option value="false">No (Not first order)</option>
          </Input>
        );

      case 'customer_group':
        return (
          <Input
            type="select"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            bsSize="sm"
          >
            <option value="">Select group...</option>
            <option value="guest">Guest</option>
            <option value="customer">Customer</option>
            <option value="vip">VIP</option>
            <option value="wholesale">Wholesale</option>
          </Input>
        );

      case 'payment_method':
        return (
          <Input
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            placeholder="e.g., cod, stripe, card"
            bsSize="sm"
          />
        );

      case 'shipping_country':
        return (
          <Input
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            placeholder="e.g., AE, SA (comma-separated)"
            bsSize="sm"
          />
        );

      case 'coupon_applied':
        return (
          <Input
            type="select"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            bsSize="sm"
          >
            <option value="true">Coupon is applied</option>
            <option value="false">No coupon applied</option>
          </Input>
        );

      default:
        return (
          <Input
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            placeholder={
              condition.type === 'cart_total' ? "e.g., 100" :
              condition.type === 'cart_qty' ? "e.g., 3" :
              "Enter value"
            }
            min={0}
            step={condition.type === 'cart_total' ? "0.01" : "1"}
            bsSize="sm"
          />
        );
    }
  };

  return (
    <div className="discount-rule-conditions-section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6>Conditions</h6>
          <small className="text-muted">Set requirements that must be met for this discount to apply.</small>
        </div>
        <Button color="primary" size="sm" className="discount-rule-primary" onClick={addCondition}>
          <RiAddLine className="me-1" /> Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-center text-muted py-4 border rounded">
          No conditions added. This rule will apply without additional requirements.
        </div>
      ) : (
        <Table responsive bordered className="discount-rule-table">
          <thead className="discount-rule-table-head">
            <tr>
              <th style={{ width: '30%' }}>Condition Type</th>
              <th style={{ width: '25%' }}>Operator</th>
              <th>Value</th>
              <th style={{ width: '10%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {conditions.map((condition, index) => (
              <tr key={index}>
                <td>
                  <Input
                    type="select"
                    value={condition.type}
                    onChange={(e) => updateCondition(index, 'type', e.target.value)}
                    bsSize="sm"
                  >
                    {CONDITION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Input>
                </td>
                <td>
                  <Input
                    type="select"
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                    bsSize="sm"
                    disabled={['first_order', 'coupon_applied'].includes(condition.type)}
                  >
                    {OPERATORS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Input>
                </td>
                <td>
                  {getValueInput(condition, index)}
                </td>
                <td className="text-center">
                  <Button
                    color="danger"
                    size="sm"
                    className="discount-rule-icon-btn"
                    onClick={() => removeCondition(index)}
                  >
                    <RiDeleteBin6Line />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {conditions.length > 0 && (
        <small className="text-muted">
          All conditions must be met for the discount to apply (AND logic).
        </small>
      )}
    </div>
  );
};

export default ConditionSection;
