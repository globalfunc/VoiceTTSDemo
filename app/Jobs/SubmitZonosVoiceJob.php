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

class SubmitZonosVoiceJob implements ShouldQueue
{
    use Queueable, HandlesZonosCompletion;

    public int $timeout;

    public function __construct(public readonly ZonosVoice $voice)
    {
        $this->timeout = (int) config('zonos.runpod.voice_timeout_seconds', 120);
    }

    public function handle(ZonosService $service): void
    {
        $this->voice->update(['status' => ProcessStatus::PROCESSING]);
        $this->broadcastUpdate($this->voice);

        $webhookUrl = config('zonos.runpod.webhook_url') ?: null;

        $sourceFile = $this->voice->storedFiles()->where('type', 'source')->firstOrFail();

        $runpodJobId = $service->submitVoice($this->voice, $sourceFile, $webhookUrl);
        $this->voice->update(['runpod_job_id' => $runpodJobId]);

        if (! $webhookUrl) {
            PollZonosStatusJob::dispatch($this->voice->id, ZonosVoice::class)
                ->delay(now()->addSeconds(10));
        }
    }

    protected function broadcastUpdate(ZonosTTSProcess|ZonosVoice $process): void
    {
        ZonosVoiceProcessUpdated::dispatch($process);
    }
}
