<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReturnRequest extends Model
{
    protected $fillable = [
        'order_id',
        'order_item_id',
        'user_id',
        'type',
        'status',
        'payment_type',
        'reason',
        'notes',
        'attachments',
        'requested_at',
        'return_awb_number',
        'return_label_url',
        'return_pickup_reference',
        'return_pickup_date',
        'return_is_international',
        'return_params',
        'return_raw_response',
        'return_status',
        'return_error_message',
        'return_created_at',
    ];

    protected $casts = [
        'attachments' => 'array',
        'requested_at' => 'datetime',
        'return_is_international' => 'boolean',
        'return_params' => 'array',
        'return_raw_response' => 'array',
        'return_pickup_date' => 'date',
        'return_created_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ReturnRequestAttachment::class);
    }
}
