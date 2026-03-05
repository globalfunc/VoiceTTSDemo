<?php

namespace App\Jobs;

use App\Concerns\HandlesRunPodCompletion;
use App\Enums\ProcessStatus;
use App\Events\VoiceCloneProcessUpdated;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Services\CoquiVoiceCloneServiceLocal;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class SubmitVoiceCloneJobLocal implements ShouldQueue
{
    use Queueable, HandlesRunPodCompletion;

    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(public readonly VoiceCloneProcess $process) {}

    public function handle(CoquiVoiceCloneServiceLocal $service): void
    {
        $this->process->update([
            'status' => ProcessStatus::PROCESSING,
            'runpod_job_id' => 'local-' . Str::uuid(),
        ]);
        $this->broadcastUpdate($this->process);

        $sourceFiles = $this->process->sourceFiles()->get()->all();

        try {
            $url = $service->generate($this->process, $sourceFiles);

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
        VoiceCloneProcessUpdated::dispatch($process);
    }
}
