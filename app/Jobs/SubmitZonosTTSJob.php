<?php

namespace App\Jobs;

use App\Concerns\HandlesZonosCompletion;
use App\Enums\ProcessStatus;
use App\Events\ZonosTTSProcessUpdated;
use App\Events\ZonosVoiceProcessUpdated;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use App\Services\ZonosService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SubmitZonosTTSJob implements ShouldQueue
{
    use Queueable, HandlesZonosCompletion;

    public int $timeout;

    public function __construct(public readonly ZonosTTSProcess $process)
    {
        $this->timeout = (int) config('zonos.runpod.tts_timeout_seconds', 180);
    }

    public function handle(ZonosService $service): void
    {
        $this->process->update(['status' => ProcessStatus::PROCESSING]);
        $this->broadcastUpdate($this->process);

        $webhookUrl = config('zonos.runpod.webhook_url') ?: null;

        $runpodJobId = $service->submitSpeech($this->process, $webhookUrl);
        $this->process->update(['runpod_job_id' => $runpodJobId]);

        if (! $webhookUrl) {
            PollZonosStatusJob::dispatch($this->process->id, ZonosTTSProcess::class)
                ->delay(now()->addSeconds(10));
        }
    }

    protected function broadcastUpdate(ZonosTTSProcess|ZonosVoice $process): void
    {
        ZonosTTSProcessUpdated::dispatch($process);
    }
}
