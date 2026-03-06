<?php

namespace App\Http\Controllers;

use App\Concerns\HandlesRunPodCompletion;
use App\Events\TTSProcessUpdated;
use App\Events\VoiceCloneProcessUpdated;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RunPodWebhookController extends Controller
{
    use HandlesRunPodCompletion;

    /**
     * Handle a RunPod webhook callback.
     * RunPod sends: { id, status, output, error }
     */
    public function handle(Request $request): JsonResponse
    {
        $runpodJobId = $request->input('id');
        $status = $request->input('status');

        if (! $runpodJobId) {
            return response()->json(['error' => 'Missing job id'], 400);
        }

        // Check Zonos tables first (separate completion logic handles base64 audio)
        $zonosProcess = ZonosTTSProcess::where('runpod_job_id', $runpodJobId)->first()
            ?? ZonosVoice::where('runpod_job_id', $runpodJobId)->first();

        if ($zonosProcess) {
            $handler = app(ZonosWebhookHandler::class);
            if ($status === 'COMPLETED') {
                $handler->handleCompleted($zonosProcess, $request->all());
            } else {
                $handler->handleFailed($zonosProcess, $request->all());
            }
            return response()->json(['ok' => true]);
        }

        // Find the Coqui process by runpod_job_id
        $process = TTSProcess::where('runpod_job_id', $runpodJobId)->first()
            ?? VoiceCloneProcess::where('runpod_job_id', $runpodJobId)->first();

        if (! $process) {
            return response()->json(['error' => 'Process not found'], 404);
        }

        if ($status === 'COMPLETED') {
            $this->handleCompletion($process, $request->all());
        } else {
            $this->handleFailure($process, $request->all());
        }

        return response()->json(['ok' => true]);
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
