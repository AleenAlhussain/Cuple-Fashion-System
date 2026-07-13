import { Row, Col, FormGroup, Label, Input, Button, Table } from "reactstrap";
import { RiDeleteBin6Line, RiAddLine } from "react-icons/ri";

const RangeSection = ({ ranges = [], setRanges, discountType = 'percentage' }) => {
  const addRange = () => {
    // Get the max "to" value from existing ranges to suggest next tier
    const maxTo = ranges.length > 0
      ? Math.max(...ranges.map(r => r.to || 0))
      : 0;

    setRanges([
      ...ranges,
      {
        from: maxTo + 1,
        to: null,
        discount_value: '',
        discount_type: discountType,
      }
    ]);
  };

  const updateRange = (index, field, value) => {
    const updated = [...ranges];
    updated[index] = { ...updated[index], [field]: value };
    setRanges(updated);
  };

  const removeRange = (index) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  return (
    <div className="discount-rule-range-section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6>Quantity Tiers</h6>
          <small className="text-muted">Define discount tiers based on quantity. Higher quantities can get better discounts.</small>
        </div>
        <Button color="primary" size="sm" className="discount-rule-primary" onClick={addRange}>
          <RiAddLine className="me-1" /> Add Tier
        </Button>
      </div>

      {ranges.length === 0 ? (
        <div className="text-center text-muted py-4 border rounded">
          No quantity tiers defined. Add tiers to create bulk pricing.
        </div>
      ) : (
        <Table responsive bordered className="discount-rule-table">
          <thead className="discount-rule-table-head">
            <tr>
              <th style={{ width: '20%' }}>From Qty</th>
              <th style={{ width: '20%' }}>To Qty</th>
              <th style={{ width: '25%' }}>Discount Type</th>
              <th style={{ width: '25%' }}>Discount Value</th>
              <th style={{ width: '10%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((range, index) => (
              <tr key={index}>
                <td>
                  <Input
                    type="number"
                    value={range.from || ''}
                    onChange={(e) => updateRange(index, 'from', parseInt(e.target.value) || 1)}
                    min={1}
                    bsSize="sm"
                    placeholder="1"
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={range.to || ''}
                    onChange={(e) => updateRange(index, 'to', e.target.value ? parseInt(e.target.value) : null)}
                    min={range.from || 1}
                    bsSize="sm"
                    placeholder="Unlimited"
                  />
                  <small className="text-muted">Leave empty for unlimited</small>
                </td>
                <td>
                  <Input
                    type="select"
                    value={range.discount_type || discountType}
                    onChange={(e) => updateRange(index, 'discount_type', e.target.value)}
                    bsSize="sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="fixed_price">Fixed Price</option>
                  </Input>
                </td>
                <td>
                  <Input
                    type="number"
                    value={range.discount_value || ''}
                    onChange={(e) => updateRange(index, 'discount_value', parseFloat(e.target.value) || 0)}
                    min={0}
                    step={range.discount_type === 'percentage' ? "1" : "0.01"}
                    bsSize="sm"
                    placeholder={range.discount_type === 'percentage' ? "e.g., 10" : "e.g., 5.00"}
                  />
                </td>
                <td className="text-center">
                  <Button
                    color="danger"
                    size="sm"
                    className="discount-rule-icon-btn"
                    onClick={() => removeRange(index)}
                  >
                    <RiDeleteBin6Line />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {ranges.length > 0 && (
        <div className="discount-rule-preview-card">
          <strong>Tier Preview:</strong>
          <ul className="mb-0 mt-2">
            {ranges.map((range, index) => {
              const valueDisplay = range.discount_type === 'percentage'
                ? `${range.discount_value}%`
                : `${range.discount_value} AED`;
              const rangeDisplay = range.to
                ? `${range.from} - ${range.to}`
                : `${range.from}+`;
              return (
                <li key={index}>
                  Buy <strong>{rangeDisplay}</strong> items: Get <strong>{valueDisplay}</strong> off
                  {range.discount_type === 'fixed_price' && ' (fixed price)'}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RangeSection;
