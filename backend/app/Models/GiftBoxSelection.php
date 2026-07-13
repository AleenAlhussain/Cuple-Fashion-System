<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GiftBoxSelection extends Model
{
    protected $fillable = [
        'user_id',
        'gift_box_offer_id',
        'category_id',
        'product_id',
        'status',
        'order_id',
    ];

    public function offer(): BelongsTo
    {
        return $this->belongsTo(GiftBoxOffer::class, 'gift_box_offer_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
