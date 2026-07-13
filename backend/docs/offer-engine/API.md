# Offer Engine API Reference

Complete API reference for the Offer Engine endpoints.

## Table of Contents

- [Website API](#website-api)
  - [Calculate Discounts](#calculate-discounts)
  - [Preview Discounts](#preview-discounts)
  - [Get Variant Offers](#get-variant-offers)
- [Admin API](#admin-api)
  - [List Rules](#list-rules)
  - [Get Rule](#get-rule)
  - [Create Rule](#create-rule)
  - [Update Rule](#update-rule)
  - [Delete Rule](#delete-rule)
  - [Toggle Status](#toggle-status)
  - [Duplicate Rule](#duplicate-rule)
  - [Get Enums](#get-enums)
  - [Get Stacking Groups](#get-stacking-groups)
  - [Get Rule Statistics](#get-rule-statistics)
- [Reports API](#reports-api)
  - [Overview](#overview)
  - [By Rule](#by-rule)
  - [By Date](#by-date)
  - [By Rule Type](#by-rule-type)
  - [Export](#export)

---

## Website API

Base URL: `/api/website`

### Calculate Discounts

Calculate discounts for cart items.

**Endpoint**: `POST /api/website/cart/calculate-discounts`

**Request Body**:
```json
{
  "items": [
    {
      "variant_id": 123,
      "variant_sku": "SKU-001",
      "price": 150.00,
      "qty": 2,
      "product_id": 45,
      "category_ids": [1, 5],
      "tag_ids": [2, 3],
      "attributes": {
        "color": "red",
        "size": "M"
      },
      "line_id": "cart_line_1"
    }
  ],
  "country": "AE",
  "timezone": "Asia/Dubai"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "adjusted_items": [
      {
        "variant_id": 123,
        "original_price": 150.00,
        "adjusted_price": 120.00,
        "discount_amount": 60.00,
        "discount_per_unit": 30.00,
        "qty": 2,
        "rule_id": 1,
        "rule_name": "Summer Sale"
      }
    ],
    "cart_discount_total": 0,
    "free_items": [],
    "applied_rules": [
      {
        "id": 1,
        "name": "Summer Sale",
        "type": "product",
        "discount_amount": 60.00,
        "affected_variants": [123]
      }
    ],
    "messages": ["20% off Summer Collection!"],
    "total_discount": 60.00
  }
}
```

### Preview Discounts

Same as Calculate Discounts but doesn't increment usage counters.

**Endpoint**: `POST /api/website/cart/preview-discounts`

**Request/Response**: Same as Calculate Discounts.

### Get Variant Offers

Get active offer messages for a product variant (displayed on PDP).

**Endpoint**: `GET /api/website/products/{variantId}/offers`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "variant_id": 123,
    "offers": [
      "Buy 2+ and save 10%!",
      "Part of Summer Sale - 20% off!"
    ]
  }
}
```

---

## Admin API

Base URL: `/api/admin`

### List Rules

List all discount rules with filtering and pagination.

**Endpoint**: `GET /api/admin/discount-rule`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `is_active` | boolean | Filter by active status |
| `rule_type` | string | Filter by rule type |
| `stacking_group` | string | Filter by stacking group |
| `search` | string | Search by name or internal_code |
| `sort_by` | string | Sort field (default: `priority`) |
| `sort_dir` | string | Sort direction: `asc` or `desc` |
| `per_page` | int | Items per page (max: 100, default: 15) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Summer Sale",
      "internal_code": "SUMMER2026",
      "rule_type": "product",
      "discount_type": "percentage",
      "discount_value": "20.00",
      "discount_display": "20%",
      "is_active": true,
      "priority": 10,
      "usages_count": 45,
      "current_usage": "45/100",
      "conditions": [],
      "filters": [...],
      "ranges": [],
      "schedules": []
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42
  }
}
```

### Get Rule

Get a single discount rule with all relations.

**Endpoint**: `GET /api/admin/discount-rule/{id}`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Summer Sale",
    "internal_code": "SUMMER2026",
    "description": "20% off all summer items",
    "rule_type": "product",
    "discount_type": "percentage",
    "discount_value": "20.00",
    "max_discount_amount": null,
    "is_active": true,
    "priority": 10,
    "stop_other_rules": false,
    "is_stackable": true,
    "stacking_group": null,
    "usage_limit_total": 100,
    "usage_limit_per_user": 2,
    "offer_message": "20% off Summer Collection!",
    "starts_at": "2026-06-01T00:00:00Z",
    "ends_at": "2026-08-31T23:59:59Z",
    "conditions": [],
    "filters": [
      {
        "id": 1,
        "filter_type": "category",
        "filter_values": [5],
        "target": "apply",
        "is_exclude": false
      }
    ],
    "ranges": [],
    "schedules": [],
    "usages_count": 45,
    "discount_display": "20%",
    "current_usage": "45/100"
  }
}
```

### Create Rule

Create a new discount rule.

**Endpoint**: `POST /api/admin/discount-rule`

**Request Body**:
```json
{
  "name": "Summer Sale",
  "internal_code": "SUMMER2026",
  "description": "20% off summer collection",
  "rule_type": "product",
  "discount_type": "percentage",
  "discount_value": 20,
  "max_discount_amount": null,
  "is_active": true,
  "priority": 10,
  "stop_other_rules": false,
  "is_stackable": true,
  "stacking_group": null,
  "usage_limit_total": 100,
  "usage_limit_per_user": 2,
  "offer_message": "20% off Summer Collection!",
  "starts_at": "2026-06-01",
  "ends_at": "2026-08-31",
  "conditions": [
    {
      "condition_type": "cart_total",
      "operator": "gte",
      "value": 100
    }
  ],
  "filters": [
    {
      "filter_type": "category",
      "filter_values": [5],
      "target": "apply",
      "is_exclude": false
    }
  ],
  "ranges": [],
  "schedules": [
    {
      "schedule_type": "weekly_window",
      "day_of_week": 5,
      "start_time": "18:00",
      "end_time": "23:59"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Discount rule created successfully.",
  "data": { ... }
}
```

### Update Rule

Update an existing discount rule.

**Endpoint**: `PUT /api/admin/discount-rule/{id}`

**Request Body**: Same as Create Rule.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Discount rule updated successfully.",
  "data": { ... }
}
```

### Delete Rule

Soft delete a discount rule.

**Endpoint**: `DELETE /api/admin/discount-rule/{id}`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Discount rule deleted successfully."
}
```

### Bulk Delete

Delete multiple rules at once.

**Endpoint**: `DELETE /api/admin/discount-rule/bulk-destroy`

**Request Body**:
```json
{
  "ids": [1, 2, 3]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "3 discount rules deleted successfully."
}
```

### Toggle Status

Toggle rule active/inactive status.

**Endpoint**: `PUT /api/admin/discount-rule/{id}/toggle-status`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Rule activated.",
  "data": {
    "id": 1,
    "is_active": true
  }
}
```

### Duplicate Rule

Create a copy of an existing rule.

**Endpoint**: `POST /api/admin/discount-rule/{id}/duplicate`

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Discount rule duplicated successfully.",
  "data": {
    "id": 2,
    "name": "Summer Sale (Copy)",
    "is_active": false,
    ...
  }
}
```

### Get Enums

Get all enum values for form dropdowns.

**Endpoint**: `GET /api/admin/discount-rule/enums`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "rule_types": [
      { "value": "product", "label": "Product Discount" },
      { "value": "cart", "label": "Cart Discount" },
      { "value": "bulk", "label": "Bulk Discount" },
      { "value": "bundle", "label": "Bundle/Set Discount" },
      { "value": "bogo", "label": "Buy X Get Y" }
    ],
    "discount_types": [
      { "value": "percentage", "label": "Percentage (%)" },
      { "value": "fixed_amount", "label": "Fixed Amount" },
      { "value": "fixed_price", "label": "Fixed Price" }
    ],
    "condition_types": [
      { "value": "cart_total", "label": "Cart Total" },
      { "value": "item_qty", "label": "Item Quantity" },
      { "value": "user_role", "label": "User Role" },
      { "value": "country", "label": "Country" },
      { "value": "first_order", "label": "First Order" }
    ],
    "filter_types": [
      { "value": "product", "label": "Product" },
      { "value": "category", "label": "Category" },
      { "value": "tag", "label": "Tag" },
      { "value": "sku", "label": "SKU" }
    ],
    "filter_targets": [
      { "value": "apply", "label": "Apply To" },
      { "value": "buy", "label": "Buy Items" },
      { "value": "get", "label": "Get Items" }
    ],
    "schedule_types": [
      { "value": "date_range", "label": "Date Range" },
      { "value": "weekly_window", "label": "Weekly Window" },
      { "value": "blackout", "label": "Blackout Period" }
    ],
    "selection_strategies": [
      { "value": "cheapest", "label": "Cheapest First" },
      { "value": "most_expensive", "label": "Most Expensive First" },
      { "value": "first", "label": "First Added" }
    ]
  }
}
```

### Get Stacking Groups

Get existing stacking group names.

**Endpoint**: `GET /api/admin/discount-rule/stacking-groups`

**Response** (200 OK):
```json
{
  "success": true,
  "data": ["seasonal", "clearance", "vip"]
}
```

### Get Rule Statistics

Get detailed statistics for a specific rule.

**Endpoint**: `GET /api/admin/discount-rule/{id}/statistics`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "rule_id": 1,
    "rule_name": "Summer Sale",
    "total_uses": 45,
    "total_discount_given": 1350.00,
    "usage_limit": 100,
    "remaining_uses": 55,
    "uses_by_day": [
      { "date": "2026-01-20", "count": 5, "total_discount": 150.00 },
      { "date": "2026-01-21", "count": 8, "total_discount": 240.00 }
    ],
    "top_users": [
      {
        "user_id": 12,
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "uses": 3,
        "total_discount": 90.00
      }
    ],
    "top_products": [
      {
        "variant_id": 123,
        "product_name": "Summer Dress",
        "variant_name": "Red / M",
        "times_discounted": 15
      }
    ],
    "recent_orders": [
      {
        "order_id": 456,
        "order_number": "00456",
        "order_total": 350.00,
        "discount_amount": 30.00,
        "user_name": "Jane Smith",
        "created_at": "2026-01-21T14:30:00Z"
      }
    ]
  }
}
```

---

## Reports API

Base URL: `/api/admin/discount-reports`

### Overview

Get dashboard overview statistics.

**Endpoint**: `GET /api/admin/discount-reports/overview`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_rules": 42,
    "total_active_rules": 15,
    "total_discounts_today": 250.00,
    "orders_with_discounts_today": 8,
    "total_discounts_this_month": 5400.00,
    "orders_with_discounts_this_month": 145,
    "most_used_rule": {
      "id": 1,
      "name": "Summer Sale",
      "uses": 45
    },
    "top_discount_by_amount": {
      "id": 3,
      "name": "VIP Discount",
      "total_discount": 2100.00
    },
    "weekly_trend": [
      { "date": "2026-01-19", "uses": 12, "total_discount": 360.00 },
      { "date": "2026-01-20", "uses": 15, "total_discount": 450.00 }
    ]
  }
}
```

### By Rule

Get statistics grouped by rule.

**Endpoint**: `GET /api/admin/discount-reports/by-rule`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `sort_by` | string | `uses`, `discount_amount`, `name`, `created_at` |
| `sort_dir` | string | `asc` or `desc` |
| `per_page` | int | Items per page (max: 100) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Summer Sale",
      "rule_type": "product",
      "is_active": true,
      "uses": 45,
      "total_discount": 1350.00,
      "orders_count": 38,
      "usage_limit": 100,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

### By Date

Get statistics grouped by date/week/month.

**Endpoint**: `GET /api/admin/discount-reports/by-date`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | date | Start date (default: 30 days ago) |
| `end_date` | date | End date (default: today) |
| `group_by` | string | `day`, `week`, or `month` |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "period": "2026-01-20",
      "period_type": "day",
      "uses": 15,
      "total_discount": 450.00,
      "orders_count": 12,
      "unique_users": 10
    }
  ],
  "totals": {
    "total_uses": 145,
    "total_discount": 4350.00,
    "total_orders": 120,
    "unique_users": 85
  },
  "filters": {
    "start_date": "2025-12-26",
    "end_date": "2026-01-25",
    "group_by": "day"
  }
}
```

### By Rule Type

Get statistics grouped by rule type.

**Endpoint**: `GET /api/admin/discount-reports/by-rule-type`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | date | Start date |
| `end_date` | date | End date |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "rule_type": "product",
      "label": "Product",
      "uses": 85,
      "total_discount": 2550.00
    },
    {
      "rule_type": "cart",
      "label": "Cart",
      "uses": 45,
      "total_discount": 1350.00
    }
  ]
}
```

### Export

Export discount report to CSV.

**Endpoint**: `GET /api/admin/discount-reports/export`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | date | Start date |
| `end_date` | date | End date |
| `format` | string | `csv` (default) |

**Response**: CSV file download with columns:
- Date
- Order Number
- Rule Name
- Rule Type
- Discount Amount
- Customer Name
- Customer Email

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field_name": ["Validation error message"]
  }
}
```

**Common HTTP Status Codes**:
- `400` Bad Request - Invalid input
- `404` Not Found - Resource doesn't exist
- `422` Unprocessable Entity - Validation failed
- `500` Internal Server Error

---

## Data Types

### CartItemDTO

```typescript
interface CartItemDTO {
  variant_id: number;      // Required: Product variant ID
  variant_sku: string;     // Required: Variant SKU
  price: number;           // Required: Unit price
  qty: number;             // Required: Quantity
  product_id: number;      // Required: Parent product ID
  category_ids?: number[]; // Optional: Category IDs
  tag_ids?: number[];      // Optional: Tag IDs
  attributes?: object;     // Optional: Custom attributes
  line_id?: string;        // Optional: Unique line identifier
}
```

### DiscountResultDTO

```typescript
interface DiscountResultDTO {
  adjusted_items: AdjustedItem[];
  cart_discount_total: number;
  free_items: FreeItem[];
  applied_rules: AppliedRule[];
  messages: string[];
  total_discount: number;
}

interface AdjustedItem {
  variant_id: number;
  original_price: number;
  adjusted_price: number;
  discount_amount: number;
  discount_per_unit: number;
  qty: number;
  rule_id: number;
  rule_name: string;
}

interface FreeItem {
  variant_id: number;
  unit_price: number;
  free_qty: number;
  discount_amount: number;
  rule_id: number;
  rule_name: string;
}

interface AppliedRule {
  id: number;
  name: string;
  type: string;
  discount_amount: number;
  affected_variants: number[];
}
```
