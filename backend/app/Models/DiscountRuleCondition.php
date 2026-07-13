<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountRuleCondition extends Model
{
    use HasFactory;
    protected $fillable = [
        'discount_rule_id',
        'type',
        'operator',
        'value',
    ];

    /**
     * Get the discount rule this condition belongs to.
     */
    public function discountRule(): BelongsTo
    {
        return $this->belongsTo(DiscountRule::class);
    }

    /**
     * Evaluate this condition against given data.
     */
    public function evaluate(array $data): bool
    {
        $actual = $this->getActualValue($data);
        $expected = $this->getExpectedValue();

        // Handle null cases
        if ($actual === null || $expected === null) {
            return match($this->operator) {
                '==' => $actual === $expected,
                '!=' => $actual !== $expected,
                default => false,
            };
        }

        return match($this->operator) {
            '>=' => $actual >= $expected,
            '<=' => $actual <= $expected,
            '==' => $actual == $expected,
            '!=' => $actual != $expected,
            '>' => $actual > $expected,
            '<' => $actual < $expected,
            'in' => $this->evaluateIn($actual, $expected),
            'not_in' => !$this->evaluateIn($actual, $expected),
            default => false,
        };
    }

    /**
     * Get the actual value from data based on condition type.
     */
    private function getActualValue(array $data): mixed
    {
        return match($this->type) {
            'cart_qty' => (int) ($data['cart_qty'] ?? 0),
            'cart_subtotal' => (float) ($data['cart_subtotal'] ?? 0),
            'user_role' => $data['user_role'] ?? null,
            'country' => $data['country'] ?? null,
            'user_id' => isset($data['user_id']) ? (int) $data['user_id'] : null,
            'first_order' => (bool) ($data['is_first_order'] ?? false),
            default => null,
        };
    }

    /**
     * Get the expected value with proper type casting based on condition type.
     */
    private function getExpectedValue(): mixed
    {
        if ($this->value === null || $this->value === '') {
            return null;
        }

        return match($this->type) {
            'cart_qty' => (int) $this->value,
            'cart_subtotal' => (float) $this->value,
            'user_id' => (int) $this->value,
            'first_order' => $this->parseBoolean($this->value),
            'user_role', 'country' => $this->value, // Keep as string for 'in'/'not_in' operations
            default => $this->value,
        };
    }

    /**
     * Parse a boolean value from string.
     */
    private function parseBoolean(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Evaluate 'in' operator - check if actual value is in expected list.
     */
    private function evaluateIn(mixed $actual, mixed $expected): bool
    {
        // For 'in' operator, expected is the raw string that needs parsing
        $values = $this->parseArrayValue($this->value);

        // Type-cast values based on condition type for proper comparison
        $values = match($this->type) {
            'cart_qty', 'user_id' => array_map('intval', $values),
            'cart_subtotal' => array_map('floatval', $values),
            default => $values,
        };

        return in_array($actual, $values, false); // Loose comparison for flexibility
    }

    /**
     * Parse comma-separated values into array.
     */
    private function parseArrayValue(string $value): array
    {
        return array_map('trim', explode(',', $value));
    }
}
