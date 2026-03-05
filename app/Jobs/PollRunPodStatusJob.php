<?php

namespace App\Jobs;

use App\Concerns\HandlesRunPodCompletion;
use App\Events\TTSProcessUpdated;
use App\Events\VoiceCloneProcessUpdated;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Services\CoquiTTSService;
use App\Services\CoquiVoiceCloneService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class PollRunPodStatusJob implements ShouldQueue
{
    use Queueable, HandlesRunPodCompletion;

    private const POLL_INTERVAL_SECONDS = 10;

    public function __construct(
        private readonly int $processId,
        private readonly string $processClass,
    ) {}

    public function handle(): void
    {
        /** @var TTSProcess|VoiceCloneProcess $process */
        $process = $this->processClass::findOrFail($this->processId);

        if (! $process->runpod_job_id) {
            return;
        }

        $timeoutSeconds = $process instanceof TTSProcess
            ? config('coqui.runpod.tts_timeout_seconds', 180)
            : config('coqui.runpod.vc_timeout_seconds', 600);

        // Wall-clock timeout check
        if (now()->diffInSeconds($process->created_at) >= $timeoutSeconds) {
            $this->handleTimeout($process);
            return;
        }

        $status = $this->pollStatus($process);

        match ($status['status'] ?? 'IN_QUEUE') {
            'COMPLETED' => $this->handleCompletion($process, $status),
            'FAILED' => $this->handleFailure($process, $status),
            default => $this->reschedule(),
        };
    }

    private function pollStatus(TTSProcess|VoiceCloneProcess $process): array
    {
        if ($process instanceof TTSProcess) {
            return app(CoquiTTSService::class)->pollStatus($process->runpod_job_id);
        }

        return app(CoquiVoiceCloneService::class)->pollStatus($process->runpod_job_id);
    }

    private function reschedule(): void
    {
        static::dispatch($this->processId, $this->processClass)
            ->delay(now()->addSeconds(self::POLL_INTERVAL_SECONDS));
    }

    protected function broadcastUpdate(TTSProcess|VoiceCloneProcess $process): void
    {
        if ($process instanceof TTSProcess) {
            TTSProcessUpdated::dispatch($process);
        } else {
            VoiceCloneProcessUpdated::dispatch($process);
        }
    }
}
