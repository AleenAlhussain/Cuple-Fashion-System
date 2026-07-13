# Offer Engine Documentation

A powerful, rule-based promotion engine for cuple.shop e-commerce platform.

## Table of Contents

- [Overview](#overview)
- [Rule Types](#rule-types)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)

## Overview

The Offer Engine enables dynamic discount calculation based on configurable rules. It supports:

- **5 Rule Types**: Product, Cart, Bulk, Bundle, and Buy X Get Y (BOGO)
- **3 Discount Types**: Percentage, Fixed Amount, Fixed Price
- **Advanced Targeting**: Filter by products, categories, tags, SKUs
- **Conditions**: Cart total, quantity, user role, first order, country
- **Scheduling**: Date ranges, weekly windows, blackout periods
- **Usage Limits**: Per-rule and per-user limits
- **Priority & Stacking**: Control rule execution order and combinations

## Rule Types

### 1. Product Discount (`product`)
Apply discounts to individual products based on filters.

**Example**: 20% off all items in "Summer Collection" category.

```json
{
  "name": "Summer Sale",
  "rule_type": "product",
  "discount_type": "percentage",
  "discount_value": 20,
  "filters": [
    { "filter_type": "category", "filter_values": [5], "target": "apply" }
  ]
}
```

### 2. Cart Discount (`cart`)
Apply discount to the entire cart when conditions are met.

**Example**: 50 AED off when cart total exceeds 500 AED.

```json
{
  "name": "Spend & Save",
  "rule_type": "cart",
  "discount_type": "fixed_amount",
  "discount_value": 50,
  "conditions": [
    { "condition_type": "cart_total", "operator": "gte", "value": 500 }
  ]
}
```

### 3. Bulk Discount (`bulk`)
Tiered discounts based on quantity purchased.

**Example**: Buy 3+ get 10% off, Buy 5+ get 20% off.

```json
{
  "name": "Bulk Buy",
  "rule_type": "bulk",
  "discount_type": "percentage",
  "discount_value": 0,
  "ranges": [
    { "min_qty": 3, "max_qty": 4, "discount_type": "percentage", "discount_value": 10 },
    { "min_qty": 5, "max_qty": null, "discount_type": "percentage", "discount_value": 20 }
  ]
}
```

### 4. Bundle Discount (`bundle`)
Fixed price for a set quantity of items.

**Example**: Any 3 scarves for 200 AED.

```json
{
  "name": "Scarf Bundle",
  "rule_type": "bundle",
  "bundle_qty": 3,
  "bundle_price": 200,
  "filters": [
    { "filter_type": "category", "filter_values": [8], "target": "apply" }
  ]
}
```

### 5. Buy X Get Y (`bogo`)
Classic BOGO promotions with flexible targeting.

**Example**: Buy 2 bags, get 1 accessory free.

```json
{
  "name": "Bag + Accessory Deal",
  "rule_type": "bogo",
  "buy_qty": 2,
  "get_qty": 1,
  "discount_type": "percentage",
  "discount_value": 100,
  "filters": [
    { "filter_type": "category", "filter_values": [3], "target": "buy" },
    { "filter_type": "category", "filter_values": [9], "target": "get" }
  ]
}
```

## Architecture

```
app/Services/OfferEngine/
├── OfferEngineService.php       # Main orchestrator
├── DTOs/
│   ├── CartItemDTO.php          # Cart item data structure
│   ├── ContextDTO.php           # User/request context
│   └── DiscountResultDTO.php    # Calculation results
├── Calculators/
│   ├── BaseCalculator.php       # Abstract base class
│   ├── ProductDiscountCalculator.php
│   ├── CartDiscountCalculator.php
│   ├── BulkDiscountCalculator.php
│   ├── BundleDiscountCalculator.php
│   └── BogoDiscountCalculator.php
├── Filters/
│   ├── FilterMatcher.php        # Product filter matching
│   └── EligibilityFilter.php    # Item eligibility check
├── Validators/
│   └── ConditionValidator.php   # Condition evaluation
└── Checkers/
    ├── RuleActivationChecker.php # Rule active status
    └── ScheduleChecker.php       # Schedule validation
```

### Data Flow

1. **Input**: Cart items + user context
2. **Rule Loading**: Fetch active rules ordered by priority
3. **Activation Check**: Verify rule is active, within schedule, within usage limits
4. **Eligibility Filter**: Determine which items match rule filters
5. **Condition Validation**: Check if conditions (cart total, qty, etc.) are met
6. **Calculation**: Apply discount using appropriate calculator
7. **Result Aggregation**: Combine all rule results
8. **Output**: DiscountResultDTO with per-item and cart discounts

### Models

```
DiscountRule (main rule configuration)
├── DiscountRuleCondition (cart_total, item_qty, user conditions)
├── DiscountRuleFilter (product, category, tag, SKU filters)
├── DiscountRuleRange (bulk/BOGO tiers)
├── DiscountRuleSchedule (date ranges, weekly windows)
└── DiscountRuleUsage (tracking per order/user)
```

## Quick Start

### Calculate Discounts (Frontend)

```javascript
// POST /api/website/cart/calculate-discounts
const response = await fetch('/api/website/cart/calculate-discounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      {
        variant_id: 123,
        variant_sku: 'SKU-001',
        price: 150.00,
        qty: 2,
        product_id: 45,
        category_ids: [1, 5]
      }
    ],
    country: 'AE',
    timezone: 'Asia/Dubai'
  })
});

const result = await response.json();
// result.data.total_discount = 30.00 (e.g., 20% off 150)
```

### Create Rule (Admin)

```javascript
// POST /api/admin/discount-rule
const rule = await fetch('/api/admin/discount-rule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Summer Sale',
    rule_type: 'product',
    discount_type: 'percentage',
    discount_value: 20,
    is_active: true,
    priority: 10,
    filters: [
      { filter_type: 'category', filter_values: [5], target: 'apply', is_exclude: false }
    ]
  })
});
```

### Using the Service (Backend)

```php
use App\Services\OfferEngine\OfferEngineService;

$offerEngine = app(OfferEngineService::class);

$result = $offerEngine->calculate(
    cartItems: [
        ['variant_id' => 1, 'variant_sku' => 'SKU-001', 'price' => 100, 'qty' => 2, 'product_id' => 1, 'category_ids' => [1, 5]],
    ],
    contextData: [
        'user_id' => 123,
        'country' => 'AE',
        'is_first_order' => true,
    ]
);

echo $result->getTotalDiscount(); // 20.00
```

## Configuration

### Enums

| Enum | Values |
|------|--------|
| DiscountRuleType | `product`, `cart`, `bulk`, `bundle`, `bogo` |
| DiscountType | `percentage`, `fixed_amount`, `fixed_price` |
| FilterType | `product`, `category`, `tag`, `sku` |
| FilterTarget | `apply`, `buy`, `get` |
| ConditionType | `cart_total`, `item_qty`, `user_role`, `country`, `first_order` |
| ScheduleType | `date_range`, `weekly_window`, `blackout` |
| SelectionStrategy | `cheapest`, `most_expensive`, `first` |

### Priority & Stacking

- **Priority**: Higher values = evaluated first (default: 0)
- **stop_other_rules**: If `true`, no further rules are processed after this one
- **is_stackable**: If `false`, only one rule from this group applies
- **stacking_group**: Rules in same group compete; only highest priority wins

### Usage Limits

- **usage_limit_total**: Maximum total uses across all users
- **usage_limit_per_user**: Maximum uses per individual user

---

See also:
- [API Reference](./API.md)
- [Admin Guide](./ADMIN_GUIDE.md)
