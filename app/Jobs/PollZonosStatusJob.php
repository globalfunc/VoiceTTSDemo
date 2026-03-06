<?php

namespace App\Jobs;

use App\Concerns\HandlesZonosCompletion;
use App\Events\ZonosTTSProcessUpdated;
use App\Events\ZonosVoiceProcessUpdated;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use App\Services\ZonosService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class PollZonosStatusJob implements ShouldQueue
{
    use Queueable, HandlesZonosCompletion;

    private const POLL_INTERVAL_SECONDS = 10;

    public function __construct(
        private readonly int $processId,
        private readonly string $processClass,
    ) {}

    public function handle(): void
    {
        /** @var ZonosTTSProcess|ZonosVoice $process */
        $process = $this->processClass::findOrFail($this->processId);

        if (! $process->runpod_job_id) {
            return;
        }

        $timeoutSeconds = $process instanceof ZonosTTSProcess
            ? config('zonos.runpod.tts_timeout_seconds', 180)
            : config('zonos.runpod.voice_timeout_seconds', 120);

        if (now()->diffInSeconds($process->created_at) >= $timeoutSeconds) {
            $this->handleTimeout($process);
            return;
        }

        $status = app(ZonosService::class)->pollStatus($process->runpod_job_id);

        if ($process instanceof ZonosTTSProcess) {
            match ($status['status'] ?? 'IN_QUEUE') {
                'COMPLETED' => $this->handleSpeechCompletion($process, $status),
                'FAILED'    => $this->handleFailure($process, $status),
                default     => $this->reschedule(),
            };
        } else {
            match ($status['status'] ?? 'IN_QUEUE') {
                'COMPLETED' => $this->handleVoiceCompletion($process, $status),
                'FAILED'    => $this->handleFailure($process, $status),
                default     => $this->reschedule(),
            };
        }
    }

    private function reschedule(): void
    {
        static::dispatch($this->processId, $this->processClass)
            ->delay(now()->addSeconds(self::POLL_INTERVAL_SECONDS));
    }

    protected function broadcastUpdate(ZonosTTSProcess|ZonosVoice $process): void
    {
        if ($process instanceof ZonosTTSProcess) {
            ZonosTTSProcessUpdated::dispatch($process);
        } else {
            ZonosVoiceProcessUpdated::dispatch($process);
        }
    }
}
