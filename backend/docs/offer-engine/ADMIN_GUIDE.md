# Offer Engine Admin Guide

A practical guide for creating and managing discount rules in the cuple.shop admin panel.

## Table of Contents

- [Getting Started](#getting-started)
- [Creating Your First Rule](#creating-your-first-rule)
- [Rule Types Explained](#rule-types-explained)
- [Targeting Products](#targeting-products)
- [Setting Conditions](#setting-conditions)
- [Scheduling Rules](#scheduling-rules)
- [Usage Limits](#usage-limits)
- [Priority and Stacking](#priority-and-stacking)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing Discount Rules

1. Log into the Admin Panel
2. Navigate to **Marketing** > **Discount Rules** in the sidebar
3. You'll see a list of all discount rules

### Dashboard Overview

The Discount Rules page shows:
- **Status indicators**: Active (green) / Inactive (gray)
- **Rule type badges**: Product, Cart, Bulk, Bundle, BOGO
- **Usage stats**: Current uses vs. limit
- **Quick actions**: Edit, Duplicate, Toggle status, Delete

---

## Creating Your First Rule

### Step 1: Click "Add New Rule"

Navigate to **Marketing** > **Discount Rules** > **Add New**.

### Step 2: Basic Information

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Display name (shown to customers) | "Summer Sale" |
| **Internal Code** | Unique identifier for tracking | "SUMMER2026" |
| **Description** | Admin notes (not shown to customers) | "20% off summer items" |
| **Offer Message** | Message shown on product pages | "Save 20% on this item!" |

### Step 3: Select Rule Type

Choose the type that matches your promotion:

- **Product Discount**: Apply to specific products/categories
- **Cart Discount**: Apply to entire cart when conditions are met
- **Bulk Discount**: Tiered discounts based on quantity
- **Bundle Discount**: Fixed price for buying X items together
- **Buy X Get Y**: Classic BOGO promotions

### Step 4: Set Discount Value

| Discount Type | Description | Example |
|--------------|-------------|---------|
| **Percentage** | % off the price | 20% off |
| **Fixed Amount** | Fixed AED off | 50 AED off |
| **Fixed Price** | Set the final price | Set to 99 AED |

**Max Discount Amount**: Optional cap for percentage discounts. E.g., "50% off, max 100 AED".

### Step 5: Add Filters (Optional)

Target specific products. See [Targeting Products](#targeting-products).

### Step 6: Add Conditions (Optional)

Require conditions to be met. See [Setting Conditions](#setting-conditions).

### Step 7: Set Schedule (Optional)

Control when the rule is active. See [Scheduling Rules](#scheduling-rules).

### Step 8: Configure Advanced Settings

- **Priority**: Order of evaluation (higher = first)
- **Usage Limits**: Maximum uses
- **Stacking**: How rules combine

### Step 9: Save and Activate

1. Click **Save** to create the rule
2. Toggle **Active** status to enable

---

## Rule Types Explained

### Product Discount

**Use Case**: Apply discounts to specific products or categories.

**Example**: 20% off all items in "Bags" category.

**Configuration**:
1. Rule Type: **Product**
2. Discount Type: **Percentage**
3. Discount Value: **20**
4. Add Filter:
   - Filter Type: **Category**
   - Values: Select "Bags"
   - Target: **Apply To**

### Cart Discount

**Use Case**: Discount the entire cart when conditions are met.

**Example**: 50 AED off when cart total exceeds 500 AED.

**Configuration**:
1. Rule Type: **Cart**
2. Discount Type: **Fixed Amount**
3. Discount Value: **50**
4. Add Condition:
   - Type: **Cart Total**
   - Operator: **Greater than or equal**
   - Value: **500**

### Bulk Discount

**Use Case**: Tiered quantity discounts.

**Example**: Buy 3-4 items get 10% off, buy 5+ get 20% off.

**Configuration**:
1. Rule Type: **Bulk**
2. Add Ranges:
   - Range 1: Min Qty: 3, Max Qty: 4, Discount: 10%
   - Range 2: Min Qty: 5, Max Qty: (empty), Discount: 20%

**Note**: Leave Max Qty empty for "and above".

### Bundle Discount

**Use Case**: Fixed price for buying a set quantity.

**Example**: Any 3 scarves for 200 AED.

**Configuration**:
1. Rule Type: **Bundle**
2. Bundle Quantity: **3**
3. Bundle Price: **200**
4. Add Filter:
   - Filter Type: **Category**
   - Values: Select "Scarves"

### Buy X Get Y (BOGO)

**Use Case**: Buy certain items, get others discounted/free.

**Example**: Buy 2 dresses, get 1 accessory free.

**Configuration**:
1. Rule Type: **BOGO**
2. Buy Qty: **2**
3. Get Qty: **1**
4. Discount Type: **Percentage**
5. Discount Value: **100** (100% = free)
6. Add Filters:
   - Filter 1: Category "Dresses", Target: **Buy**
   - Filter 2: Category "Accessories", Target: **Get**

**Selection Strategy** (which "get" items receive discount):
- **Cheapest First**: Discount applied to lowest-priced eligible items
- **Most Expensive First**: Discount applied to highest-priced items
- **First Added**: Discount applied to first items added to cart

---

## Targeting Products

### Filter Types

| Type | Description | Example |
|------|-------------|---------|
| **Category** | Target by category ID | All items in "Summer Collection" |
| **Product** | Target specific products | Product IDs: 123, 456, 789 |
| **Tag** | Target by product tags | Items tagged "Bestseller" |
| **SKU** | Target by variant SKU | SKUs: ABC-001, ABC-002 |

### Filter Targets

For most rules, use **Apply To**. For BOGO rules:

| Target | Use |
|--------|-----|
| **Apply To** | Standard target for non-BOGO rules |
| **Buy** | Products customer must buy (BOGO) |
| **Get** | Products that receive the discount (BOGO) |

### Include vs. Exclude

- **Include (default)**: Only these items are eligible
- **Exclude**: Everything EXCEPT these items

**Example**: 20% off everything except "Sale" category:
1. Add filter with "Sale" category
2. Check **Exclude** option

### No Filters = All Products

If you don't add any filters, the rule applies to ALL products in the store.

---

## Setting Conditions

Conditions must be met for the rule to apply.

### Condition Types

| Type | Operators | Example |
|------|-----------|---------|
| **Cart Total** | =, >, >=, <, <= | Cart >= 500 AED |
| **Item Quantity** | =, >, >=, <, <= | 3+ items in cart |
| **User Role** | =, in | User is "VIP" |
| **Country** | =, in | Country is "AE" |
| **First Order** | = | Customer's first order |

### Match Type

When multiple conditions exist:

- **Match All (AND)**: ALL conditions must be true
- **Match Any (OR)**: At least ONE condition must be true

**Example** (Match All):
- Cart Total >= 300 AED **AND**
- Country = AE

---

## Scheduling Rules

### Basic Date Range

Set when the rule should be active:

- **Starts At**: Rule becomes active
- **Ends At**: Rule expires

Leave empty for no date restrictions.

### Advanced Schedules

Add schedules for complex timing:

#### Date Range Schedule
Active during a specific period.

**Example**: Black Friday Week (Nov 25-30)
- Type: **Date Range**
- Start Date: 2026-11-25
- End Date: 2026-11-30

#### Weekly Window Schedule
Active on specific days/times each week.

**Example**: Happy Hour Fridays (6 PM - midnight)
- Type: **Weekly Window**
- Day of Week: **Friday**
- Start Time: **18:00**
- End Time: **23:59**

#### Blackout Schedule
Rule is INACTIVE during this period.

**Example**: No discounts during Eid holiday
- Type: **Blackout**
- Start Date: 2026-04-10
- End Date: 2026-04-12

### Multiple Schedules

You can combine schedules:
- Weekly windows for regular timing
- Date ranges for special periods
- Blackouts to pause during specific dates

---

## Usage Limits

### Total Usage Limit

Maximum times the rule can be used across all customers.

**Example**: First 100 customers get the discount.
- Usage Limit Total: **100**

### Per-User Limit

Maximum times a single customer can use the rule.

**Example**: Each customer can use this once.
- Usage Limit Per User: **1**

### Tracking Usage

View current usage on:
- Rule list page (usage column)
- Edit page (Statistics section)
- Reports page (detailed breakdown)

---

## Priority and Stacking

### Priority

Rules are evaluated in priority order (highest first).

| Priority | Effect |
|----------|--------|
| Higher number | Evaluated first |
| Lower number | Evaluated later |
| Same priority | Order not guaranteed |

**Example**:
- VIP Discount (Priority: 100) - checked first
- Summer Sale (Priority: 50) - checked second
- Generic Discount (Priority: 10) - checked last

### Stop Other Rules

If enabled, no further rules are processed after this one applies.

**Use Case**: VIP members should only get VIP discount, not additional promotions.

### Stacking Groups

Rules in the same stacking group compete - only one can apply.

**Example**: "seasonal" stacking group
- Summer Sale (Priority: 50)
- Winter Sale (Priority: 40)
- Spring Sale (Priority: 30)

If Summer Sale applies, Winter and Spring are skipped.

### Stackable Flag

- **Stackable = Yes**: Rule can combine with others
- **Stackable = No**: Rule blocks others in same group

---

## Best Practices

### 1. Use Descriptive Names

**Good**: "Summer 2026 - 20% Off Dresses"
**Bad**: "Rule 1"

### 2. Set Internal Codes

Use codes for tracking in reports:
- `SUMMER2026`, `VIP50`, `NEWCUST`

### 3. Start with Higher Priority for Important Rules

VIP discounts, membership perks, etc. should have higher priority.

### 4. Test Before Activating

1. Create rule with **Active = No**
2. Use Preview API to test calculations
3. Activate when confirmed working

### 5. Use Stacking Groups for Competing Promotions

Don't let customers stack Sale + Clearance + Seasonal discounts.

### 6. Set Reasonable Limits

- **Total limits** for budget control
- **Per-user limits** to prevent abuse

### 7. Monitor Usage

Check the Statistics tab regularly:
- Which rules are most used
- Which products are most discounted
- Revenue impact

### 8. Archive Old Rules

Instead of deleting, deactivate old rules to preserve history.

---

## Troubleshooting

### Rule Not Applying

**Check these in order**:

1. **Is it active?** Toggle status to green
2. **Is it within schedule?** Check dates and times
3. **Are conditions met?** Verify cart meets requirements
4. **Are filters correct?** Check product/category targeting
5. **Usage limit reached?** Check current usage
6. **Priority issue?** Higher priority rule with `stop_other_rules` may be blocking

### Discount Amount Wrong

1. **Max discount cap**: Check if max_discount_amount is set
2. **Percentage vs Fixed**: Verify discount type
3. **Multiple rules**: Multiple rules may be applying

### BOGO Not Working

1. **Buy items in cart?** Customer needs qualifying "buy" items
2. **Get items in cart?** Customer needs eligible "get" items
3. **Quantities correct?** Must have enough buy qty to trigger
4. **Filter targets correct?** Verify "Buy" and "Get" filters

### Performance Issues

If discount calculation is slow:
1. Limit active rules (deactivate unused)
2. Use specific filters (not "all products")
3. Simplify conditions where possible

### Viewing Calculation Details

Use the Statistics page to see:
- Which orders used the rule
- Discount amounts given
- Products most frequently discounted

---

## Quick Reference

### Rule Type Decision Tree

```
Need to discount specific products?
  └─ Yes → Product Discount

Need discount when cart reaches X amount?
  └─ Yes → Cart Discount

Different discounts for different quantities?
  └─ Yes → Bulk Discount

Fixed price for buying X items?
  └─ Yes → Bundle Discount

Buy something, get something else discounted?
  └─ Yes → BOGO
```

### Common Configurations

| Scenario | Rule Type | Config |
|----------|-----------|--------|
| 20% off category | Product | Filter: Category, Discount: 20% |
| 50 AED off 500+ cart | Cart | Condition: Cart Total >= 500 |
| Buy 3+ get 15% off | Bulk | Range: Min 3, Discount 15% |
| 3 for 200 AED | Bundle | Bundle Qty: 3, Price: 200 |
| Buy 2 Get 1 Free | BOGO | Buy: 2, Get: 1, Discount: 100% |
| Buy A, Get B 50% off | BOGO | Buy filter: A, Get filter: B, Discount: 50% |

---

## Getting Help

- **Technical Issues**: Contact development team
- **Business Questions**: Marketing team
- **Documentation Updates**: Submit feedback through admin panel
