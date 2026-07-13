'use client';
import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { Card, CardBody, Col, Row, FormGroup, Label, Input, Button, Nav, NavItem, NavLink, TabContent, TabPane, Alert } from "reactstrap";
import { useRouter } from "next/navigation";
import request from "../../utils/axiosUtils";
import { DiscountRuleAPI, DiscountRuleEnumsAPI, Category, product } from "../../utils/axiosUtils/API";
import { toast } from "react-toastify";
import * as Yup from "yup";
import classnames from "classnames";
import useCustomQuery from "../../utils/hooks/useCustomQuery";
import ScheduleSection from "./FormSections/ScheduleSection";
import UnifiedDiscountSettings from "./FormSections/UnifiedDiscountSettings";

// Rule types with descriptions, organized by group
const RULE_TYPE_GROUPS = [
  {
    group: 'Simple Discount',
    types: [
      { value: 'product', label: 'Product Adjustment', description: 'Apply discount to specific products, categories, or tags' },
      { value: 'cart', label: 'Cart Adjustment', description: 'Discount on entire cart when minimum total is reached' },
    ]
  },
  {
    group: 'Bulk Discount',
    types: [
      { value: 'bulk', label: 'Bulk Discount', description: 'Discount based on quantity purchased (Buy 3+ get 15% off)' },
      { value: 'bundle', label: 'Bundle (Set) Discount', description: 'Special price when buying specific products together' },
    ]
  },
  {
    group: 'Bogo Discount',
    types: [
      { value: 'bxgx', label: 'Buy X Get X', description: 'Buy X of same products, get additional units free' },
      { value: 'bogo', label: 'Buy X Get Y', description: 'Buy X items from one group, get Y items from another group free/discounted' },
    ]
  },
];

// Flat list for lookups
const RULE_TYPES = RULE_TYPE_GROUPS.flatMap(g => g.types);

// Helper to get rule type info
const getRuleTypeInfo = (ruleType) => {
  return RULE_TYPES.find(r => r.value === ruleType) || RULE_TYPES[0];
};

const DiscountRuleForm = ({ updateId, title, buttonName }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [initialValues, setInitialValues] = useState({
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    rule_type: "product",
    is_active: true,
    discount_type: "percentage",
    discount_value: "",
    max_discount_amount: "",
    min_cart_total: "",
    max_cart_total: "",
    offer_message: "",
    offer_message_ar: "",
    starts_at: "",
    ends_at: "",
    usage_limit_total: "",
    usage_limit_per_user: "",
    is_stackable: true,
    stacking_group: "",
    // BOGO specific
    buy_qty: "",
    get_qty: "",
    selection_strategy: "cheapest_first",
    max_applications: "",
    is_recursive: false,
    // BXGX specific
    recursive_step: "",
    max_free_qty_per_order: "",
    max_applications_per_order: "",
    // Bundle specific
    bundle_qty: "",
    bundle_price: "",
    // Promo Code
    requires_promo_code: false,
    promo_code: "",
    show_as_coupon: false,
    quantity_count_method: "filter_products",
    filter_conditions: [],
    // Promotion Message
    promotion_subtotal_from: "",
    promotion_subtotal_source: "entire_cart_subtotal",
    promotion_message_template: "",
    promotion_message_template_ar: "",
    show_rule_preview: true,
    // Discount Bar settings
    show_discount_bar: false,
    bar_background_color: "#ef0101",
    bar_text_color: "#ffffff",
    bar_title: "",
    bar_title_ar: "",
    bar_content: "",
    bar_content_ar: "",
    bar_position: "below_price",
    bar_style: "inline",
    // Nested data
    filters: [],
    conditions: [],
    schedules: [],
    ranges: [],
  });

  // Fetch enums for dropdowns
  const { data: enumsData } = useCustomQuery(
    ["discount-rule-enums"],
    () => request({ url: DiscountRuleEnumsAPI }, router),
    { refetchOnWindowFocus: false }
  );

  // Fetch categories for filter selection
  const { data: categoriesData } = useCustomQuery(
    ["categories-for-filter"],
    () => request({ url: Category }, router),
    { refetchOnWindowFocus: false }
  );

  // Fetch existing rule if editing
  useEffect(() => {
    if (updateId) {
      const fetchRule = async () => {
        try {
          const res = await request({ url: `${DiscountRuleAPI}/${updateId}` }, router);
          if (res?.data?.data) {
            const rule = res.data.data;

            // Map backend filter_type to frontend type
            const filterTypeReverseMap = {
              'product_id': 'product',
              'category': 'category',
              'variant_sku': 'sku',
              'tag': 'tag',
              'variant_id': 'variant',
              'attribute': 'attribute',
              'brand': 'brand',
              'sku_category': 'sku_category',
              'sku_tag': 'sku_tag',
            };

            // Map backend operator to frontend format
            const operatorReverseMap = {
              'gte': '>=',
              'lte': '<=',
              'eq': '=',
              'neq': '!=',
              'gt': '>',
              'lt': '<',
              'in': 'in',
              'not_in': 'not_in',
            };

            // Transform filters from backend to frontend format
            const transformedFilters = (rule.filters || []).map(filter => ({
              type: filterTypeReverseMap[filter.filter_type] || filter.filter_type,
              operator: filter.is_exclude ? 'not_in' : 'in',
              values: filter.filter_values || [],
              secondary_values: filter.secondary_values || [],
              is_buy_filter: filter.target === 'buy', // For BOGO rules: true = buy items, false = get items
            }));

            // Transform conditions from backend to frontend format
            const transformedConditions = (rule.conditions || []).map(cond => ({
              type: cond.condition_type,
              operator: operatorReverseMap[cond.operator] || cond.operator,
              value: cond.value,
            }));

            // Transform ranges from backend to frontend format
            const transformedRanges = (rule.ranges || []).map(range => ({
              from: range.min_qty,
              to: range.max_qty,
              discount_type: range.discount_type,
              discount_value: range.discount_value,
            }));

            // Transform schedules from backend to frontend format
            const transformedSchedules = (rule.schedules || []).map(sched => ({
              day_of_week: sched.day_of_week,
              start_time: sched.start_time || '',
              end_time: sched.end_time || '',
              specific_date: sched.start_date || null,
              schedule_type: sched.schedule_type, // Preserve for save
            }));

            setInitialValues({
              name: rule.name || "",
              name_ar: rule.name_ar || rule.description_ar || "",
              description: rule.description || "",
              description_ar: rule.description_ar || "",
              rule_type: rule.rule_type || "product",
              is_active: rule.is_active ?? true,
              discount_type: rule.discount_type || "percentage",
              discount_value: rule.discount_value ?? "",
              max_discount_amount: rule.max_discount_amount ?? "",
              min_cart_total: rule.min_cart_total ?? "",
              max_cart_total: rule.max_cart_total ?? "",
              offer_message: rule.offer_message || "",
              offer_message_ar: rule.offer_message_ar || "",
              starts_at: rule.starts_at ? rule.starts_at.split('T')[0] : "",
              ends_at: rule.ends_at ? rule.ends_at.split('T')[0] : "",
              usage_limit_total: rule.usage_limit_total ?? "",
              usage_limit_per_user: rule.usage_limit_per_user ?? "",
              is_stackable: rule.is_stackable ?? true,
              stacking_group: rule.stacking_group || "",
              buy_qty: rule.buy_qty ?? "",
              get_qty: rule.get_qty ?? "",
              selection_strategy: rule.selection_strategy || "cheapest_first",
              max_applications: rule.max_applications ?? "",
              is_recursive: rule.is_recursive ?? false,
              // BXGX fields
              recursive_step: rule.recursive_step ?? "",
              max_free_qty_per_order: rule.max_free_qty_per_order ?? "",
              max_applications_per_order: rule.max_applications_per_order ?? "",
              // Bundle fields
              bundle_qty: rule.bundle_qty ?? "",
              bundle_price: rule.bundle_price ?? "",
              // Promo code fields
              requires_promo_code: rule.requires_promo_code ?? false,
              promo_code: rule.promo_code || "",
              show_as_coupon: rule.show_as_coupon ?? false,
              quantity_count_method: rule.quantity_count_method || "filter_products",
              filter_conditions: rule.filter_conditions || [],
              // Promotion Message fields
              promotion_subtotal_from: rule.promotion_subtotal_from ?? "",
              promotion_subtotal_source: rule.promotion_subtotal_source || "entire_cart_subtotal",
              promotion_message_template: rule.promotion_message_template || "",
              promotion_message_template_ar: rule.promotion_message_template_ar || "",
              show_rule_preview:
                typeof rule.show_rule_preview === "boolean" ? rule.show_rule_preview : true,
              // Discount Bar fields
              show_discount_bar: rule.show_discount_bar ?? false,
              bar_background_color: rule.bar_background_color || "#ef0101",
              bar_text_color: rule.bar_text_color || "#ffffff",
              bar_title: rule.bar_title || "",
              bar_title_ar: rule.bar_title_ar || "",
              bar_content: rule.bar_content || "",
              bar_content_ar: rule.bar_content_ar || "",
              bar_position: rule.bar_position || "below_price",
              bar_style: "inline",
              filters: transformedFilters,
              conditions: transformedConditions,
              schedules: transformedSchedules,
              ranges: transformedRanges,
            });
          }
        } catch (err) {
          console.error("Error fetching discount rule:", err);
          toast.error("Failed to load discount rule");
        }
      };
      fetchRule();
    }
  }, [updateId, router]);

  // Dynamic validation based on rule type
  const getValidationSchema = (ruleType) => {
    const baseSchema = {
      name: Yup.string().required("Name is required").max(255),
      name_ar: Yup.string().required("Arabic name is required").max(255),
      offer_message_ar: Yup.string().required("Arabic customer message is required").max(500),
      rule_type: Yup.string().oneOf(['product', 'cart', 'bulk', 'bogo', 'bxgx', 'bundle']).required("Type is required"),
      usage_limit_total: Yup.number().integer().min(0).nullable(),
      usage_limit_per_user: Yup.number().integer().min(0).nullable(),
      show_rule_preview: Yup.boolean().nullable(),
    };

    // Add type-specific validation
    switch (ruleType) {
      case 'product':
      case 'bulk':
        return Yup.object({
          ...baseSchema,
          discount_type: Yup.string().oneOf(['percentage', 'fixed_amount', 'fixed_price']).required(),
          discount_value: Yup.number().min(0).required("Discount value is required"),
        });
      case 'cart':
        return Yup.object({
          ...baseSchema,
          min_cart_total: Yup.number()
            .nullable()
            .transform((value, originalValue) => (originalValue === "" ? null : value))
            .min(0),
          discount_type: Yup.string().oneOf(['percentage', 'fixed_amount']).required(),
          discount_value: Yup.number().min(0).required("Discount value is required"),
        });
      case 'bogo':
      case 'bxgx':
        return Yup.object({
          ...baseSchema,
          buy_qty: Yup.number().integer().min(1).required("Buy quantity is required"),
          get_qty: Yup.number().integer().min(1).required("Get quantity is required"),
          discount_value: Yup.number().min(0).max(100).required("Discount percentage is required"),
        });
      case 'bundle':
        return Yup.object({
          ...baseSchema,
          discount_type: Yup.string().oneOf(['percentage', 'fixed_amount', 'fixed_price']).required(),
          discount_value: Yup.number().min(0).required("Value is required"),
        });
      default:
        return Yup.object({
          ...baseSchema,
          discount_type: Yup.string().oneOf(['percentage', 'fixed_amount', 'fixed_price']).required(),
          discount_value: Yup.number().min(0).required("Discount value is required"),
        });
    }
  };

  const validationSchema = Yup.lazy(values => getValidationSchema(values.rule_type));

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Map filter types from frontend to backend values
      const filterTypeMap = {
        'product': 'product_id',
        'category': 'category',
        'sku_prefix': 'variant_sku',
        'sku': 'variant_sku',
        'tag': 'tag',
        'variant': 'variant_id',
        'attribute': 'attribute',
        'brand': 'brand',
        'price_range': 'variant_sku', // Price range needs special handling
        'sku_category': 'sku_category',
        'sku_tag': 'sku_tag',
      };

      // Map operator from frontend to backend format
      const operatorMap = {
        '>=': 'gte',
        '<=': 'lte',
        '=': 'eq',
        '==': 'eq',
        '!=': 'neq',
        '>': 'gt',
        '<': 'lt',
        'in': 'in',
        'not_in': 'not_in',
      };

      // Transform filters to backend format
      // Skip 'all' type filters (they mean all products - no filter needed)
      const transformedFilters = (values.filters || [])
        .filter(filter => filter.type !== 'all')
        .map(filter => {
          // For BOGO rules: derive target from is_buy_filter (user can toggle in UI)
          // For BXGX rules: always use 'both' since buy and get are from same pool
          // For non-BOGO/BXGX rules: default to 'both'
          let target = 'both';
          if (values.rule_type === 'bogo') {
            target = filter.is_buy_filter === true ? 'buy' : 'get';
          } else if (values.rule_type === 'bxgx') {
            target = 'both'; // BXGX always uses same pool for buy and get
          }

          // Determine secondary_type for combined filters
          let secondaryType = null;
          if (filter.type === 'sku_category') {
            secondaryType = 'category';
          } else if (filter.type === 'sku_tag') {
            secondaryType = 'tag';
          }

          return {
            filter_type: filterTypeMap[filter.type] || filter.filter_type || filter.type,
            filter_values: filter.values || filter.filter_values || [],
            target: target,
            is_exclude: filter.operator === 'not_in' || filter.is_exclude || false,
            secondary_type: secondaryType,
            secondary_values: filter.secondary_values || null,
          };
        }).filter(f => f.filter_values && f.filter_values.length > 0);

      // Transform conditions to backend format
      const transformedConditions = (values.conditions || []).map(cond => ({
        condition_type: cond.type || cond.condition_type,
        operator: operatorMap[cond.operator] || cond.operator,
        value: cond.value,
      })).filter(c => c.value !== '' && c.value !== undefined);

      // Transform ranges to backend format
      // Map frontend discount types to backend values
      const rangeDiscountTypeMap = {
        'fixed': 'fixed_amount',
        'fixed_per_item': 'fixed_amount',
        'percentage': 'percentage',
        'fixed_amount': 'fixed_amount',
        'fixed_price': 'fixed_price',
      };
      const transformedRanges = (values.ranges || []).map(range => ({
        min_qty: parseInt(range.from || range.min_qty) || 1,
        max_qty: range.to || range.max_qty || null,
        discount_type: rangeDiscountTypeMap[range.discount_type] || range.discount_type || 'percentage',
        discount_value: parseFloat(range.discount_value) || 0,
      })).filter(r => r.discount_value > 0);

      // Transform schedules to backend format
      // Valid schedule_type values: 'date_range', 'weekly_window', 'blackout'
      const transformedSchedules = (values.schedules || []).map(sched => {
        let scheduleType = 'weekly_window'; // Default for day_of_week + time
        if (sched.specific_date) {
          scheduleType = 'date_range';
        } else if (sched.schedule_type) {
          scheduleType = sched.schedule_type; // Preserve existing type
        }
        return {
          schedule_type: scheduleType,
          start_date: sched.specific_date || sched.start_date || null,
          end_date: sched.specific_date || sched.end_date || null,
          day_of_week: sched.day_of_week !== undefined && sched.day_of_week !== '' ? sched.day_of_week : null,
          start_time: sched.start_time || null,
          end_time: sched.end_time || null,
        };
      }).filter(s => s.day_of_week !== null || s.start_date || s.start_time);

      const payload = {
        name: values.name,
        name_ar: values.name_ar,
        description: values.description || null,
        description_ar: values.description_ar || null,
        rule_type: values.rule_type,
        is_active: values.is_active,
        priority: 0,
        discount_type: values.discount_type,
        discount_value: parseFloat(values.discount_value) || 0,
        max_discount_amount: values.max_discount_amount ? parseFloat(values.max_discount_amount) : null,
        min_cart_total: values.min_cart_total ? parseFloat(values.min_cart_total) : null,
        max_cart_total: values.max_cart_total ? parseFloat(values.max_cart_total) : null,
        offer_message: values.offer_message || null,
        offer_message_ar: values.offer_message_ar,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
        usage_limit_total: values.usage_limit_total ? parseInt(values.usage_limit_total) : null,
        usage_limit_per_user: values.usage_limit_per_user ? parseInt(values.usage_limit_per_user) : null,
        is_stackable: values.is_stackable,
        stacking_group: values.stacking_group || null,
        buy_qty: values.buy_qty ? parseInt(values.buy_qty) : null,
        get_qty: values.get_qty ? parseInt(values.get_qty) : null,
        selection_strategy: values.selection_strategy || null,
        max_applications: values.max_applications ? parseInt(values.max_applications) : null,
        is_recursive: values.is_recursive ?? false,
        // Bundle fields
        bundle_qty: values.bundle_qty ? parseInt(values.bundle_qty) : null,
        bundle_price: values.bundle_price ? parseFloat(values.bundle_price) : null,
        // BXGX fields
        recursive_step: values.recursive_step ? parseInt(values.recursive_step) : null,
        max_free_qty_per_order: values.max_free_qty_per_order ? parseInt(values.max_free_qty_per_order) : null,
        max_applications_per_order: values.max_applications_per_order ? parseInt(values.max_applications_per_order) : null,
        // Promotion Message fields
        promotion_subtotal_from: values.promotion_subtotal_from ? parseFloat(values.promotion_subtotal_from) : null,
        promotion_subtotal_source: values.promotion_subtotal_source || null,
        promotion_message_template: values.promotion_message_template || null,
        promotion_message_template_ar: values.promotion_message_template_ar || null,
        show_rule_preview:
          typeof values.show_rule_preview === "boolean" ? values.show_rule_preview : true,
        // Promo code fields
        requires_promo_code: values.requires_promo_code ?? false,
        promo_code: values.requires_promo_code ? (values.promo_code || null) : null,
        show_as_coupon: values.show_as_coupon ?? false,
        quantity_count_method: values.quantity_count_method || "filter_products",
        filter_conditions: (values.filter_conditions || []).filter(fc => fc.value !== '' && fc.value !== undefined),
        // Discount Bar fields
        show_discount_bar: values.show_discount_bar ?? false,
        bar_background_color: values.bar_background_color || "#ef0101",
        bar_text_color: values.bar_text_color || "#ffffff",
        bar_title: values.bar_title || null,
        bar_title_ar: values.bar_title_ar || null,
        bar_content: values.bar_content || null,
        bar_content_ar: values.bar_content_ar || null,
        bar_position: values.bar_position || "below_price",
        bar_style: "inline",
        filters: transformedFilters,
        conditions: transformedConditions,
        ranges: transformedRanges,
        schedules: transformedSchedules,
      };

      // Keep null values in payload so the backend can clear fields on update.
      // Only remove undefined values (not null) to avoid stale data.

      if (updateId) {
        await request({ url: `${DiscountRuleAPI}/${updateId}`, method: "put", data: payload }, router);
        toast.success("Discount rule updated successfully!");
      } else {
        await request({ url: DiscountRuleAPI, method: "post", data: payload }, router);
        toast.success("Discount rule created successfully!");
      }
      router.push("/offers/discount-rules/all");
    } catch (err) {
      console.error("Error saving discount rule:", err);
      const errors = err?.response?.data?.errors;
      if (errors) {
        // Show first validation error
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        const message = err?.response?.data?.message || "Failed to save discount rule";
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const categories = categoriesData?.data?.data || [];

  return (
    <Col sm="12" className="discount-rule-form">
      <Card className="discount-rule-card">
        <div className="title-header option-title discount-rule-header">
          <h5>{title}</h5>
        </div>
        <CardBody className="discount-rule-body">
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, handleChange, handleBlur, errors, touched, setFieldValue }) => (
              <Form className="theme-form theme-form-2 mega-form discount-rule-form-inner">
                {/* Tab Navigation - 3 tabs */}
                <Nav tabs className="discount-rule-tabs">
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === 'basic' })}
                      onClick={() => toggleTab('basic')}
                      style={{ cursor: 'pointer' }}
                    >
                      Basic Info
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === 'settings' })}
                      onClick={() => toggleTab('settings')}
                      style={{ cursor: 'pointer' }}
                    >
                      Discount Settings
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === 'schedule' })}
                      onClick={() => toggleTab('schedule')}
                      style={{ cursor: 'pointer' }}
                    >
                      Schedule & Limits
                    </NavLink>
                  </NavItem>
                </Nav>

                <TabContent activeTab={activeTab} className="discount-rule-tab-content">
                  {/* Tab: Basic Info */}
                  <TabPane tabId="basic">
                    <Row className="discount-rule-basic-grid">
                      <Col lg="6">
                        <FormGroup>
                          <Label><strong>Choose a discount type</strong> <span className="text-danger">*</span></Label>
                          <Input
                            type="select"
                            name="rule_type"
                            value={values.rule_type}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFieldValue('rule_type', val);
                              if (val !== 'bogo' && val !== 'bxgx') {
                                setFieldValue('buy_qty', '');
                                setFieldValue('get_qty', '');
                              }
                              if (val !== 'cart') {
                                setFieldValue('min_cart_total', '');
                              }
                            }}
                          >
                            <option value="" disabled>Select Discount Type</option>
                            {RULE_TYPE_GROUPS.map(group => (
                              <optgroup key={group.group} label={group.group}>
                                {group.types.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </Input>
                          {touched.rule_type && errors.rule_type && (
                            <small className="text-danger">{errors.rule_type}</small>
                          )}
                          {values.rule_type && (
                            <small className="text-muted d-block mt-1">
                              {getRuleTypeInfo(values.rule_type)?.description}
                            </small>
                          )}
                        </FormGroup>

                        <FormGroup className="discount-rule-checkbox">
                          <Label check>
                            <Input
                              type="checkbox"
                              name="is_active"
                              checked={values.is_active}
                              onChange={handleChange}
                            />
                            <strong>Active</strong>
                          </Label>
                        </FormGroup>

                        <FormGroup className="discount-rule-checkbox">
                          <Label check>
                            <Input
                              type="checkbox"
                              name="is_stackable"
                              checked={values.is_stackable}
                              onChange={handleChange}
                            />
                            Stackable with other discounts
                          </Label>
                        </FormGroup>
                      </Col>

                      <Col lg="6">
                        <FormGroup>
                          <Label>Rule Name <span className="text-danger">*</span></Label>
                          <Input
                            type="text"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={
                              values.rule_type === 'product' ? "e.g., Summer Sale 20% Off" :
                              values.rule_type === 'cart' ? "e.g., 10% Off Orders Over 500 AED" :
                              values.rule_type === 'bogo' ? "e.g., Buy 2 Get 1 Free" :
                              values.rule_type === 'bxgx' ? "e.g., Buy 2 Get 1 Free (Same Product)" :
                              values.rule_type === 'bulk' ? "e.g., Buy 3+ Get 15% Off" :
                              "e.g., Summer Bundle Deal"
                            }
                            invalid={touched.name && !!errors.name}
                          />
                          {touched.name && errors.name && (
                            <div className="invalid-feedback">{errors.name}</div>
                          )}
                        </FormGroup>

                        <FormGroup>
                          <Label>Rule Name (Arabic) <span className="text-danger">*</span></Label>
                          <Input
                            type="text"
                            name="name_ar"
                            value={values.name_ar}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="مثال: عرض خاص"
                            invalid={touched.name_ar && !!errors.name_ar}
                            dir="rtl"
                          />
                          {touched.name_ar && errors.name_ar && (
                            <div className="invalid-feedback">{errors.name_ar}</div>
                          )}
                        </FormGroup>

                        <FormGroup>
                          <Label>Description (Internal)</Label>
                          <Input
                            type="textarea"
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Internal notes about this rule"
                            rows={2}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>Description (Arabic)</Label>
                          <Input
                            type="textarea"
                            name="description_ar"
                            value={values.description_ar}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Arabic description"
                            rows={2}
                            dir="rtl"
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>Customer Message (English)</Label>
                          <Input
                            type="text"
                            name="offer_message"
                            value={values.offer_message}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={
                              values.rule_type === 'bogo' ? "Buy 2, Get 1 FREE!" :
                              values.rule_type === 'cart' ? "10% off your order!" :
                              "Save on selected items!"
                            }
                          />
                          <small className="text-muted">Shown to customers when discount applies</small>
                        </FormGroup>

                        <FormGroup>
                          <Label>Customer Message (Arabic) <span className="text-danger">*</span></Label>
                          <Input
                            type="text"
                            name="offer_message_ar"
                            value={values.offer_message_ar}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="رسالة العرض للعملاء"
                            invalid={touched.offer_message_ar && !!errors.offer_message_ar}
                            dir="rtl"
                          />
                          {touched.offer_message_ar && errors.offer_message_ar && (
                            <div className="invalid-feedback">{errors.offer_message_ar}</div>
                          )}
                          <small className="text-muted">Shown to customers in Arabic storefront</small>
                        </FormGroup>
                      </Col>
                    </Row>
                  </TabPane>

                  {/* Tab: Unified Discount Settings */}
                  <TabPane tabId="settings" className="discount-rule-tab-pane">
                    <Alert color="info" className="discount-rule-info-badge">
                      <strong>{getRuleTypeInfo(values.rule_type).label}</strong>
                      <span className="ms-2">{getRuleTypeInfo(values.rule_type).description}</span>
                    </Alert>
                    <UnifiedDiscountSettings
                      values={values}
                      handleChange={handleChange}
                      handleBlur={handleBlur}
                      errors={errors}
                      touched={touched}
                      setFieldValue={setFieldValue}
                      categories={categories}
                    />
                  </TabPane>

                  {/* Tab: Schedule & Limits */}
                  <TabPane tabId="schedule" className="discount-rule-tab-pane">
                    {/* Validity Period */}
                    <div className="discount-rule-section-card">
                      <div className="discount-rule-section-header">
                        <h6>Validity Period</h6>
                      </div>
                      <Row>
                        <Col md="6">
                          <FormGroup>
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              name="starts_at"
                              value={values.starts_at}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              name="ends_at"
                              value={values.ends_at}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </div>

                    {/* Advanced Schedules */}
                    <div className="discount-rule-section-card">
                      <ScheduleSection
                        schedules={values.schedules}
                        setSchedules={(schedules) => setFieldValue('schedules', schedules)}
                      />
                    </div>

                    {/* Usage Limits */}
                    <div className="discount-rule-section-card">
                      <div className="discount-rule-section-header">
                        <h6>Usage Limits</h6>
                      </div>
                      <Row>
                        <Col md="4">
                          <FormGroup>
                            <Label>Total Usage Limit</Label>
                            <Input
                              type="number"
                              name="usage_limit_total"
                              value={values.usage_limit_total}
                              onChange={handleChange}
                              placeholder="Unlimited"
                              min={0}
                            />
                            <small className="text-muted">Max times this rule can be used</small>
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>Per Customer Limit</Label>
                            <Input
                              type="number"
                              name="usage_limit_per_user"
                              value={values.usage_limit_per_user}
                              onChange={handleChange}
                              placeholder="Unlimited"
                              min={0}
                            />
                            <small className="text-muted">Max uses per customer</small>
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>Stacking Group</Label>
                            <Input
                              type="text"
                              name="stacking_group"
                              value={values.stacking_group}
                              onChange={handleChange}
                              placeholder="e.g., summer-sale"
                            />
                            <small className="text-muted">Only one rule per group applies</small>
                          </FormGroup>
                        </Col>
                      </Row>
                    </div>

                    {/* Promotion Messages - for cart rules */}
                    {values.rule_type === 'cart' && (
                      <div className="discount-rule-section-card">
                        <div className="discount-rule-section-header">
                          <h6>Promotion Message</h6>
                          <small className="text-muted d-block">
                            Show "spend more to unlock discount" messages to customers who haven't yet qualified.
                          </small>
                        </div>
                        <Row>
                          <Col md="3">
                            <FormGroup>
                              <Label>Show When Subtotal From</Label>
                              <Input
                                type="number"
                                name="promotion_subtotal_from"
                                value={values.promotion_subtotal_from}
                                onChange={handleChange}
                                placeholder="e.g., 100"
                                min={0}
                              />
                              <small className="text-muted">Start showing at this amount</small>
                            </FormGroup>
                          </Col>
                          <Col md="3">
                            <FormGroup>
                              <Label>Subtotal Source</Label>
                              <Input
                                type="select"
                                name="promotion_subtotal_source"
                                value={values.promotion_subtotal_source}
                                onChange={handleChange}
                              >
                                <option value="entire_cart_subtotal">Entire Cart</option>
                                <option value="eligible_items_subtotal">Eligible Items Only</option>
                              </Input>
                            </FormGroup>
                          </Col>
                          <Col md="6">
                            <FormGroup>
                              <Label>Message Template (English)</Label>
                              <Input
                                type="text"
                                name="promotion_message_template"
                                value={values.promotion_message_template}
                                onChange={handleChange}
                                placeholder="Spend {difference_amount} more to get {discount}!"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="6">
                            <FormGroup>
                              <Label>Message Template (Arabic)</Label>
                              <Input
                                type="text"
                                name="promotion_message_template_ar"
                                value={values.promotion_message_template_ar}
                                onChange={handleChange}
                                placeholder="Arabic message"
                                dir="rtl"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                      </div>
                    )}

                    {/* Product Page Discount Bar Section */}
                    <div className="discount-rule-section-card">
                      <div className="discount-rule-section-header">
                        <h6>Product Page Discount Bar</h6>
                        <small className="text-muted d-block">This badge/banner will be shown on product pages that match this discount rule's filters</small>
                      </div>
                      <Row>
                        <Col md="4">
                          <p className="text-muted mb-2">
                            It helps to display discount information in product pages.
                          </p>
                          <p className="fw-semibold mb-2">Preview</p>
                          <div className="discount-rule-preview-card">
                            <div
                              style={{
                                fontSize: '14px',
                                lineHeight: '1.6',
                                padding: '10px 15px',
                                borderRadius: '6px',
                                backgroundColor: values.bar_background_color || '#ef0101',
                                color: values.bar_text_color || '#ffffff',
                              }}
                              dangerouslySetInnerHTML={{
                                __html: (values.show_discount_bar
                                  ? (values.bar_content_ar || values.bar_content || 'Auto-generated discount content...')
                                  : 'Discount bar is disabled.').replace(/\n/g, '<br />'),
                              }}
                            />
                          </div>
                          <small className="text-muted d-block mt-2">
                            Note: Preview contains sample result for original result see product page.
                          </small>
                        </Col>

                        <Col md="8">
                          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                            <div>
                              <Label className="mb-1 d-block">Show Discount Bar?</Label>
                              <small className="text-muted d-block">Show/hide discount bar on product pages</small>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <FormGroup check className="mb-0">
                                <Label check className="mb-0">
                                  <Input
                                    type="radio"
                                    name="show_discount_bar"
                                    checked={values.show_discount_bar === true}
                                    onChange={() => setFieldValue('show_discount_bar', true)}
                                  />
                                  Yes
                                </Label>
                              </FormGroup>
                              <FormGroup check className="mb-0">
                                <Label check className="mb-0">
                                  <Input
                                    type="radio"
                                    name="show_discount_bar"
                                    checked={values.show_discount_bar === false}
                                    onChange={() => setFieldValue('show_discount_bar', false)}
                                  />
                                  No
                                </Label>
                              </FormGroup>
                            </div>
                          </div>

                          {values.show_discount_bar && (
                            <>
                              <Row>
                                <Col md="6">
                                  <FormGroup>
                                    <Label>Badge Background Color</Label>
                                    <small className="text-muted d-block">Choose background color to be shown in product pages.</small>
                                    <div className="d-flex align-items-center gap-2 mt-2">
                                      <Input
                                        type="color"
                                        name="bar_background_color"
                                        value={values.bar_background_color}
                                        onChange={handleChange}
                                        style={{ width: 50, height: 34, padding: 2 }}
                                      />
                                      <Input
                                        type="text"
                                        name="bar_background_color"
                                        value={values.bar_background_color}
                                        onChange={handleChange}
                                        placeholder="#ef0101"
                                        style={{ width: 120 }}
                                      />
                                    </div>
                                  </FormGroup>
                                </Col>

                                <Col md="6">
                                  <FormGroup>
                                    <Label>Badge Text Color</Label>
                                    <small className="text-muted d-block">Choose text color to be shown in product pages.</small>
                                    <div className="d-flex align-items-center gap-2 mt-2">
                                      <Input
                                        type="color"
                                        name="bar_text_color"
                                        value={values.bar_text_color}
                                        onChange={handleChange}
                                        style={{ width: 50, height: 34, padding: 2 }}
                                      />
                                      <Input
                                        type="text"
                                        name="bar_text_color"
                                        value={values.bar_text_color}
                                        onChange={handleChange}
                                        placeholder="#ffffff"
                                        style={{ width: 120 }}
                                      />
                                    </div>
                                  </FormGroup>
                                </Col>
                              </Row>

                              <FormGroup>
                                <Label>Badge Text (English)</Label>
                                <small className="text-muted d-block">HTML is allowed. Use line breaks with &lt;br&gt;.</small>
                                <Input
                                  type="textarea"
                                  name="bar_content"
                                  value={values.bar_content}
                                  onChange={handleChange}
                                  placeholder={"e.g., Flat {{discount_value}}{{discount_type}} Off on Selected Items<br><br>Limited time offer"}
                                  rows={4}
                                />
                              </FormGroup>

                              <FormGroup>
                                <Label>Badge Text (Arabic)</Label>
                                <small className="text-muted d-block">HTML is allowed. استخدم &lt;br&gt; لفصل الأسطر.</small>
                                <Input
                                  type="textarea"
                                  name="bar_content_ar"
                                  value={values.bar_content_ar}
                                  onChange={handleChange}
                                  placeholder={"مثال: خصم {{discount_value}}{{discount_type}} على تشكيلة مختارة<br><br>عرض لفترة محدودة"}
                                  rows={4}
                                  dir="rtl"
                                />
                              </FormGroup>

                              <small className="text-muted d-block">
                                <strong>Shortcodes:</strong> {"{{title}}"}, {"{{discount_value}}"}, {"{{discount_type}}"}, {"{{min_qty}}"}, {"{{buy_qty}}"}, {"{{get_qty}}"}, {"{{min_cart_total}}"}
                              </small>
                            </>
                          )}
                        </Col>
                      </Row>
                    </div>
                  </TabPane>
                </TabContent>

                {/* Action Buttons */}
                <Row className="discount-rule-actions">
                  <Col md="12">
                    <Button type="submit" color="primary" className="discount-rule-primary" disabled={loading}>
                      {loading ? "Saving..." : buttonName || "Save"}
                    </Button>
                    <Button
                      type="button"
                      color="secondary"
                      className="ms-2 discount-rule-secondary"
                      onClick={() => router.push("/offers/discount-rules/all")}
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

export default DiscountRuleForm;
