<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImportHistory extends Model
{
    protected $fillable = [
        'module',
        'action',
        'original_file_name',
        'stored_file_path',
        'status',
        'progress_percentage',
        'total_rows',
        'processed_rows',
        'summary',
        'result_payload',
        'report_file_path',
        'error_file_path',
        'rollback_status',
        'rollback_summary',
        'last_error',
        'started_at',
        'completed_at',
        'failed_at',
        'rolled_back_at',
        'created_by',
    ];

    protected $casts = [
        'summary' => 'array',
        'result_payload' => 'array',
        'rollback_summary' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
        'rolled_back_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ImportHistoryItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
