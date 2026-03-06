<?php

namespace App\Models;

use App\Enums\ProcessStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ZonosTTSProcess extends Model
{
    protected $table = 'zonos_tts_processes';

    protected $fillable = [
        'user_id',
        'model',
        'language',
        'status',
        'text_to_speech',
        'speed',
        'emotion',
        'voice_id',
        'runpod_job_id',
        'json_response',
        'completed_at',
    ];

    protected $casts = [
        'status'       => ProcessStatus::class,
        'emotion'      => 'array',
        'json_response' => 'array',
        'completed_at' => 'datetime',
        'speed'        => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function storedFiles(): MorphMany
    {
        return $this->morphMany(StoredFile::class, 'process');
    }

    public function outputFile(): ?StoredFile
    {
        return $this->storedFiles()->where('type', 'output')->first();
    }
}
