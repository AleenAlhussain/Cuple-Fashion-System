<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GiftBoxOfferCategoryItem extends Model
{
    protected $fillable = [
        'gift_box_offer_id',
        'category_id',
        'product_id',
        'position',
        'discount_type',
        'discount_value',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
    ];

    public function offer(): BelongsTo
    {
        return $this->belongsTo(GiftBoxOffer::class, 'gift_box_offer_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
