<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportHistoryItem extends Model
{
    protected $fillable = [
        'import_history_id',
        'target_type',
        'operation',
        'product_id',
        'product_variant_id',
        'sku',
        'before_state',
        'after_state',
        'rollback_status',
        'rollback_message',
    ];

    protected $casts = [
        'before_state' => 'array',
        'after_state' => 'array',
    ];

    public function importHistory(): BelongsTo
    {
        return $this->belongsTo(ImportHistory::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
