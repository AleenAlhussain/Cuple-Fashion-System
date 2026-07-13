<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AramexStatusMapping extends Model
{
    protected $fillable = [
        'aramex_code',
        'aramex_name',
        'stage',
        'severity',
        'customer_title_en',
        'customer_message_en',
        'customer_title_ar',
        'customer_message_ar',
        'is_active',
        'is_manual_override',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_manual_override' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
