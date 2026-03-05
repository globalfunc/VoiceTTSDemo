<?php

namespace App\Jobs;

use App\Concerns\HandlesRunPodCompletion;
use App\Enums\ProcessStatus;
use App\Events\VoiceCloneProcessUpdated;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Services\CoquiVoiceCloneService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SubmitVoiceCloneJob implements ShouldQueue
{
    use Queueable, HandlesRunPodCompletion;

    public int $timeout;

    public function __construct(public readonly VoiceCloneProcess $process)
    {
        $this->timeout = (int) config('coqui.runpod.vc_timeout_seconds', 600);
    }

    public function handle(CoquiVoiceCloneService $service): void
    {
        $this->process->update(['status' => ProcessStatus::PROCESSING]);
        $this->broadcastUpdate($this->process);

        $sourceFiles = $this->process->sourceFiles()->get()->all();
        $webhookUrl = config('coqui.runpod.webhook_url') ?: null;

        $runpodJobId = $service->submit($this->process, $sourceFiles, $webhookUrl);
        $this->process->update(['runpod_job_id' => $runpodJobId]);

        if (! $webhookUrl) {
            PollRunPodStatusJob::dispatch($this->process->id, VoiceCloneProcess::class)
                ->delay(now()->addSeconds(10));
        }
    }

    protected function broadcastUpdate(TTSProcess|VoiceCloneProcess $process): void
    {
        VoiceCloneProcessUpdated::dispatch($process);
    }
}
