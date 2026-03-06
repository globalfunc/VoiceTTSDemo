<?php

namespace App\Models;

use App\Enums\ProcessStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ZonosVoice extends Model
{
    protected $table = 'zonos_voices';

    protected $fillable = [
        'user_id',
        'name',
        'runpod_voice_id',
        'status',
        'runpod_job_id',
        'json_response',
        'completed_at',
    ];

    protected $casts = [
        'status'        => ProcessStatus::class,
        'json_response' => 'array',
        'completed_at'  => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function storedFiles(): MorphMany
    {
        return $this->morphMany(StoredFile::class, 'process');
    }
}
