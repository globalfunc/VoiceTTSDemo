<?php

namespace App\Jobs;

use App\Concerns\HandlesRunPodCompletion;
use App\Enums\ProcessStatus;
use App\Events\TTSProcessUpdated;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Services\CoquiTTSServiceLocal;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class SubmitTTSJobLocal implements ShouldQueue
{
    use Queueable, HandlesRunPodCompletion;

    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(public readonly TTSProcess $process) {}

    public function handle(CoquiTTSServiceLocal $service): void
    {
        // Assign a dummy job ID so the model field is never null
        $this->process->update([
            'status' => ProcessStatus::PROCESSING,
            'runpod_job_id' => 'local-' . Str::uuid(),
        ]);
        $this->broadcastUpdate($this->process);

        try {
            $url = $service->generate($this->process);

            $this->handleCompletion($this->process, [
                'output' => ['status' => 200, 'url' => $url, 'message' => 'Audio generated successfully'],
            ]);
        } catch (\Throwable $e) {
            $this->handleFailure($this->process, [
                'message' => $e->getMessage(),
            ]);
        }
    }

    protected function broadcastUpdate(TTSProcess|VoiceCloneProcess $process): void
    {
        TTSProcessUpdated::dispatch($process);
    }
}
