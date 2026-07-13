<?php

namespace App\Services\OfferEngine\DTOs;

class CartItemDTO
{
    public function __construct(
        public readonly int $variant_id,
        public readonly string $variant_sku,
        public readonly float $price,
        public readonly int $qty,
        public readonly int $product_id,
        public readonly array $category_ids = [],
        public readonly array $tag_ids = [],
        public readonly array $attributes = [],
        public readonly ?string $line_id = null,
        public readonly ?int $brand_id = null,
        public readonly array $promo_group_ids = [],
    ) {}

    /**
     * Create from array data.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            variant_id: (int) ($data['variant_id'] ?? 0),
            variant_sku: (string) ($data['variant_sku'] ?? ''),
            price: (float) ($data['price'] ?? 0),
            qty: (int) ($data['qty'] ?? 1),
            product_id: (int) ($data['product_id'] ?? 0),
            category_ids: array_map('intval', $data['category_ids'] ?? []),
            tag_ids: array_map('intval', $data['tag_ids'] ?? []),
            attributes: $data['attributes'] ?? [],
            line_id: $data['line_id'] ?? null,
            brand_id: isset($data['brand_id']) ? (int) $data['brand_id'] : null,
            promo_group_ids: array_map('intval', $data['promo_group_ids'] ?? []),
        );
    }

    /**
     * Create collection from array of items.
     * Handles both raw arrays and existing CartItemDTO objects.
     */
    public static function collection(array $items): array
    {
        return array_map(function ($item) {
            // If already a CartItemDTO, return as-is
            if ($item instanceof self) {
                return $item;
            }
            // Otherwise convert from array
            return self::fromArray($item);
        }, $items);
    }

    /**
     * Get subtotal for this item (price * qty).
     */
    public function getSubtotal(): float
    {
        return $this->price * $this->qty;
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return [
            'variant_id' => $this->variant_id,
            'variant_sku' => $this->variant_sku,
            'price' => $this->price,
            'qty' => $this->qty,
            'product_id' => $this->product_id,
            'category_ids' => $this->category_ids,
            'tag_ids' => $this->tag_ids,
            'attributes' => $this->attributes,
            'line_id' => $this->line_id,
            'brand_id' => $this->brand_id,
            'promo_group_ids' => $this->promo_group_ids,
        ];
    }

    /**
     * Get a unique identifier for this cart item.
     */
    public function getUniqueId(): string
    {
        return $this->line_id ?? "variant_{$this->variant_id}";
    }
}
