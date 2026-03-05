<?php

namespace App\Jobs;

use App\Concerns\HandlesRunPodCompletion;
use App\Enums\ProcessStatus;
use App\Events\TTSProcessUpdated;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Services\CoquiTTSService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SubmitTTSJob implements ShouldQueue
{
    use Queueable, HandlesRunPodCompletion;

    public int $timeout;

    public function __construct(public readonly TTSProcess $process)
    {
        $this->timeout = (int) config('coqui.runpod.tts_timeout_seconds', 180);
    }

    public function handle(CoquiTTSService $service): void
    {
        $this->process->update(['status' => ProcessStatus::PROCESSING]);
        $this->broadcastUpdate($this->process);

        $webhookUrl = config('coqui.runpod.webhook_url') ?: null;

        $runpodJobId = $service->submit($this->process, $webhookUrl);
        $this->process->update(['runpod_job_id' => $runpodJobId]);

        // No webhook configured — hand off to polling job
        if (! $webhookUrl) {
            PollRunPodStatusJob::dispatch($this->process->id, TTSProcess::class)
                ->delay(now()->addSeconds(10));
        }
    }

    protected function broadcastUpdate(TTSProcess|VoiceCloneProcess $process): void
    {
        TTSProcessUpdated::dispatch($process);
    }
}
