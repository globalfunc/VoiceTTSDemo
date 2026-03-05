<?php

namespace App\Models;

use App\Enums\StoredFileType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class StoredFile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'process_id',
        'process_type',
        'storage_disk',
        'storage_path',
        'name',
        'type',
    ];

    protected $casts = [
        'type' => StoredFileType::class,
    ];

    protected $appends = ['url'];

    public function process(): MorphTo
    {
        return $this->morphTo();
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->storage_disk)->url($this->storage_path);
    }
}
