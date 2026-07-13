<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class Faq extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'title_ar',
        'description',
        'description_ar',
        'status',
        'created_by_id',
    ];

    protected $casts = [
        'status' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
