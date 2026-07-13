<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AramexUnknownStatus extends Model
{
    protected $fillable = [
        'aramex_code',
        'aramex_name',
        'stage',
        'severity',
        'locale',
        'occurred_at',
        'location',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function scopeRecent($query)
    {
        return $query->orderBy('occurred_at', 'desc')->limit(20);
    }
}
