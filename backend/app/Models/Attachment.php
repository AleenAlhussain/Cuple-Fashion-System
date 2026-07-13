<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    protected $fillable = [
        'name',
        'file_name',
        'path',
        'original_url',
        'source_url',
        'url_hash',
        'file_hash',
        'disk',
        'source',
        'mime_type',
        'size',
    ];

    protected $appends = ['resolved_url'];

    protected $casts = [
        'size' => 'integer',
    ];

    public function getResolvedUrlAttribute(): ?string
    {
        return MediaUrl::fromPath($this->original_url ?: $this->path);
    }
}
