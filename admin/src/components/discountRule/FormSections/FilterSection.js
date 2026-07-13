import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Row, Col, FormGroup, Label, Input, Button, Table, Alert, Badge, Spinner, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import { RiDeleteBin6Line, RiAddLine, RiSearchLine, RiCloseLine } from "react-icons/ri";
import request from "../../../utils/axiosUtils";
import { DiscountRuleFilterOptionsAPI, PromoGroupAPI } from "../../../utils/axiosUtils/API";

const FILTER_TYPES = [
  { value: 'all', label: 'All Products', description: 'Applies to all products' },
  { value: 'category', label: 'Categories', description: 'Products in selected categories' },
  { value: 'product', label: 'Specific Products', description: 'Select specific products' },
  { value: 'sku', label: 'SKU', description: 'Products with specific SKUs' },
  { value: 'tag', label: 'Tags', description: 'Products with selected tags' },
  { value: 'brand', label: 'Brands', description: 'Products from selected brands' },
  { value: 'promo_group', label: 'Promo Group', description: 'SKUs belonging to a promo group' },
  { value: 'sku_category', label: 'SKU + Category', description: 'Specific SKUs within selected categories', isCombined: true },
  { value: 'sku_tag', label: 'SKU + Tag', description: 'Specific SKUs with selected tags', isCombined: true },
];

const OPERATORS = [
  { value: 'in', label: 'Include' },
  { value: 'not_in', label: 'Exclude' },
];

// Get description based on rule type
const getDescription = (ruleType) => {
  switch (ruleType) {
    case 'product':
      return 'Specify which products, categories, or tags get this discount. Leave empty to apply to ALL products.';
    case 'cart':
      return 'Optional: Limit discount to carts containing specific products/categories.';
    case 'bogo':
      return 'Define which products count as "Buy" items and which can be the "Get" (free) items.';
    case 'bxgx':
      return 'Specify which products qualify for the Buy X Get X offer. All filters apply to the same pool.';
    case 'bulk':
      return 'Specify which products qualify for quantity-based discounts.';
    case 'bundle':
      return 'Select the products that must be bought together for the bundle price.';
    default:
      return 'Define product filters for this discount rule.';
  }
};

// Multi-select dropdown component with portal rendering
const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on scroll (optional, for better UX)
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const removeValue = (value, e) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== value));
  };

  const getLabel = (value) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center p-2 border rounded">
        <Spinner size="sm" className="me-2" />
        <span className="text-muted">Loading options...</span>
      </div>
    );
  }

  // Dropdown menu rendered via portal
  const dropdownMenu = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      className="border rounded shadow-sm"
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999,
        maxHeight: '300px',
        backgroundColor: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {/* Search input */}
      <div className="p-2 border-bottom" style={{ backgroundColor: '#fff' }}>
        <div className="input-group input-group-sm">
          <span className="input-group-text" style={{ backgroundColor: '#e9ecef', color: '#333' }}>
            <RiSearchLine />
          </span>
          <Input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            bsSize="sm"
            autoFocus
            style={{ color: '#333', backgroundColor: '#fff' }}
          />
        </div>
      </div>

      {/* Options list */}
      <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
        {filteredOptions.length === 0 ? (
          <div className="p-3 text-center" style={{ color: '#6c757d' }}>No options found</div>
        ) : (
          filteredOptions.map(option => (
            <div
              key={option.value}
              className={`px-3 py-2 ${selectedValues.includes(option.value) ? 'bg-light' : ''}`}
              style={{ cursor: 'pointer', color: '#333' }}
              onClick={() => toggleOption(option.value)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedValues.includes(option.value) ? '#f8f9fa' : '#fff'}
            >
              <div className="form-check mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
                <label className="form-check-label" style={{ cursor: 'pointer', color: '#333' }}>
                  {option.label}
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with count and clear */}
      {selectedValues.length > 0 && (
        <div className="p-2 border-top d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
          <small style={{ color: '#6c757d' }}>{selectedValues.length} selected</small>
          <Button
            color="link"
            size="sm"
            className="p-0"
            style={{ color: '#dc3545' }}
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="position-relative">
      {/* Selected values display (trigger) */}
      <div
        ref={triggerRef}
        className="form-control d-flex flex-wrap gap-1 align-items-center"
        style={{ minHeight: '38px', cursor: 'pointer', backgroundColor: '#fff' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedValues.length === 0 ? (
          <span style={{ color: '#6c757d' }}>{placeholder}</span>
        ) : (
          <>
            {selectedValues.slice(0, 3).map(value => (
              <Badge key={value} color="secondary" className="d-flex align-items-center gap-1 py-1 px-2" style={{ color: '#fff' }}>
                {getLabel(value).length > 20 ? getLabel(value).substring(0, 20) + '...' : getLabel(value)}
                <RiCloseLine
                  style={{ cursor: 'pointer', marginLeft: '4px', color: '#fff' }}
                  onClick={(e) => removeValue(value, e)}
                />
              </Badge>
            ))}
            {selectedValues.length > 3 && (
              <Badge color="info" className="py-1 px-2" style={{ color: '#fff' }}>
                +{selectedValues.length - 3} more
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Dropdown menu via portal */}
      {dropdownMenu}
    </div>
  );
};

const FilterSection = ({ filters = [], setFilters, categories = [], ruleType }) => {
  const [filterOptions, setFilterOptions] = useState({
    products: [],
    categories: [],
    tags: [],
    skus: [],
    brands: [],
    promo_groups: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      // Fetch filter options and promo groups in parallel
      const [optionsRes, promoGroupsRes] = await Promise.all([
        request({ url: DiscountRuleFilterOptionsAPI }),
        request({ url: PromoGroupAPI }),
      ]);

      const options = optionsRes?.data?.success ? optionsRes.data.data : {};
      const promoGroups = promoGroupsRes?.data?.success
        ? (promoGroupsRes.data.data || []).map(g => ({
            value: g.id,
            label: `${g.name} (${g.variants_count || 0} SKUs)`,
          }))
        : [];

      setFilterOptions({
        ...options,
        promo_groups: promoGroups,
      });
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
      // Fallback to categories prop if API fails
      if (categories.length > 0) {
        setFilterOptions(prev => ({
          ...prev,
          categories: categories.map(c => ({ value: c.id, label: c.name }))
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const getOptionsForType = (type) => {
    switch (type) {
      case 'product':
        return filterOptions.products || [];
      case 'category':
        return filterOptions.categories || [];
      case 'tag':
        return filterOptions.tags || [];
      case 'sku':
      case 'sku_category':
      case 'sku_tag':
        return filterOptions.skus || [];
      case 'brand':
        return filterOptions.brands || [];
      case 'promo_group':
        return filterOptions.promo_groups || [];
      case 'all':
        return [];
      default:
        return [];
    }
  };

  const getSecondaryOptionsForType = (type) => {
    switch (type) {
      case 'sku_category':
        return filterOptions.categories || [];
      case 'sku_tag':
        return filterOptions.tags || [];
      default:
        return [];
    }
  };

  const isCombinedFilter = (type) => {
    return ['sku_category', 'sku_tag'].includes(type);
  };

  const addFilter = (isBuyFilter = true) => {
    setFilters([
      ...filters,
      {
        type: 'category',
        operator: 'in',
        values: [],
        secondary_values: [],
        is_buy_filter: isBuyFilter,
      }
    ]);
  };

  const updateFilter = (index, field, value) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], [field]: value };

    // Reset values when type changes
    if (field === 'type') {
      updated[index].values = value === 'all' ? ['all'] : [];
      updated[index].secondary_values = [];
    }

    setFilters(updated);
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const renderFilterRow = (filter, actualIndex) => {
    const isAllProducts = filter.type === 'all';
    const isCombined = isCombinedFilter(filter.type);
    const options = getOptionsForType(filter.type);
    const secondaryOptions = getSecondaryOptionsForType(filter.type);

    return (
      <tr key={actualIndex}>
        <td>
          <Input
            type="select"
            value={filter.type}
            onChange={(e) => updateFilter(actualIndex, 'type', e.target.value)}
            bsSize="sm"
          >
            {FILTER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Input>
          <small className="text-muted d-block mt-1">
            {FILTER_TYPES.find(t => t.value === filter.type)?.description}
          </small>
        </td>
        <td>
          <Input
            type="select"
            value={filter.operator}
            onChange={(e) => updateFilter(actualIndex, 'operator', e.target.value)}
            bsSize="sm"
            disabled={isAllProducts}
          >
            {OPERATORS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Input>
        </td>
        <td>
          {isAllProducts ? (
            <Badge color="success" className="py-2 px-3">
              All Products Selected
            </Badge>
          ) : isCombined ? (
            <div className="d-flex flex-column gap-2">
              {/* Primary: SKU selection */}
              <div>
                <small className="text-muted d-block mb-1">SKUs:</small>
                <MultiSelectDropdown
                  options={options}
                  selectedValues={filter.values || []}
                  onChange={(values) => updateFilter(actualIndex, 'values', values)}
                  placeholder="Select SKUs..."
                  loading={loading}
                />
              </div>
              {/* Secondary: Category/Tag selection */}
              <div>
                <small className="text-muted d-block mb-1">
                  {filter.type === 'sku_category' ? 'In Categories:' : 'With Tags:'}
                </small>
                <MultiSelectDropdown
                  options={secondaryOptions}
                  selectedValues={filter.secondary_values || []}
                  onChange={(values) => updateFilter(actualIndex, 'secondary_values', values)}
                  placeholder={filter.type === 'sku_category' ? 'Select categories...' : 'Select tags...'}
                  loading={loading}
                />
              </div>
            </div>
          ) : (
            <MultiSelectDropdown
              options={options}
              selectedValues={filter.values || []}
              onChange={(values) => updateFilter(actualIndex, 'values', values)}
              placeholder={`Select ${filter.type}s...`}
              loading={loading}
            />
          )}
        </td>
        <td className="text-center">
          <Button color="danger" size="sm" className="discount-rule-icon-btn" onClick={() => removeFilter(actualIndex)}>
            <RiDeleteBin6Line />
          </Button>
        </td>
      </tr>
    );
  };

  const renderFilterTable = (filterList, isBuySection = true) => (
    <Table responsive bordered size="sm" className="discount-rule-table">
      <thead className="discount-rule-table-head">
        <tr>
          <th className="col-filter-type">Filter Type</th>
          <th className="col-filter-mode">Mode</th>
          <th className="col-filter-values">Values</th>
          <th className="col-filter-action text-center">Action</th>
        </tr>
      </thead>
      <tbody>
        {filterList.map((filter, idx) => {
          // Find actual index in main filters array
          const actualIndex = filters.findIndex(f => f === filter);
          return renderFilterRow(filter, actualIndex);
        })}
      </tbody>
    </Table>
  );

  // BOGO specific layout with separate Buy/Get sections
  if (ruleType === 'bogo') {
    const buyFilters = filters.filter(f => f.is_buy_filter !== false);
    const getFilters = filters.filter(f => f.is_buy_filter === false);

    return (
      <div className="discount-rule-filter-section">
        <Alert color="info" className="discount-rule-alert discount-rule-alert-info">
          <strong>BOGO Filter Setup:</strong> {getDescription(ruleType)}
        </Alert>

        {/* Buy Products Section */}
        <div className="discount-rule-section-card mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-1">Buy Products Filter</h6>
              <small className="text-muted">Which products count toward the "Buy X" requirement</small>
            </div>
            <Button color="success" size="sm" className="discount-rule-primary" onClick={() => addFilter(true)}>
              <RiAddLine className="me-1" /> Add Buy Filter
            </Button>
          </div>
          {buyFilters.length === 0 ? (
            <div className="text-center text-muted py-3 border rounded bg-white">
              No buy filters. All products will count as "Buy" items.
            </div>
          ) : renderFilterTable(buyFilters, true)}
        </div>

        {/* Get Products Section */}
        <div className="discount-rule-section-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-1">Get Products Filter (Free Items)</h6>
              <small className="text-muted">Which products can be the free/discounted "Get" items</small>
            </div>
            <Button color="warning" size="sm" className="discount-rule-primary" onClick={() => addFilter(false)}>
              <RiAddLine className="me-1" /> Add Get Filter
            </Button>
          </div>
          {getFilters.length === 0 ? (
            <div className="text-center text-muted py-3 border rounded bg-white">
              No get filters. Same products as "Buy" will be eligible for free items.
            </div>
          ) : renderFilterTable(getFilters, false)}
        </div>

        {/* Filter Logic Info */}
        <div className="discount-rule-info-card">
          <strong>Filter Logic:</strong>
          <ul className="mb-0 ps-3 mt-2">
            <li>Multiple filters use AND logic (all must match)</li>
            <li>"Include" means product must be in the selected list</li>
            <li>"Exclude" means product must NOT be in the selected list</li>
            <li>"All Products" applies to every product in the store</li>
            <li><strong>SKU + Category/Tag:</strong> Both SKU AND category/tag must match</li>
          </ul>
        </div>
      </div>
    );
  }

  // Standard layout for other rule types
  return (
    <div className="discount-rule-filter-section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6>Product Filters</h6>
          <small className="text-muted">{getDescription(ruleType)}</small>
        </div>
        <Button color="primary" size="sm" className="discount-rule-primary" onClick={() => addFilter(true)}>
          <RiAddLine className="me-1" /> Add Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <Alert color="warning" className="discount-rule-alert">
          No filters added. This rule will apply to <strong>ALL products</strong>.
        </Alert>
      ) : renderFilterTable(filters)}

      {/* Filter Logic Info */}
      {filters.length > 0 && (
        <div className="discount-rule-info-card">
          <strong>Filter Logic:</strong>
          <ul className="mb-0 ps-3 mt-2">
            <li>Multiple filters use AND logic (all must match)</li>
            <li>"Include" means product must be in the selected list</li>
            <li>"Exclude" means product must NOT be in the selected list</li>
            <li>"All Products" applies to every product in the store</li>
            <li><strong>SKU + Category/Tag:</strong> Both SKU AND category/tag must match</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilterSection;
