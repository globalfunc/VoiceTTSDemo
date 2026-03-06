<?php

namespace App\Http\Controllers;

use App\Concerns\HandlesZonosCompletion;
use App\Events\ZonosTTSProcessUpdated;
use App\Events\ZonosVoiceProcessUpdated;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;

class ZonosWebhookHandler
{
    use HandlesZonosCompletion;

    public function handleCompleted(ZonosTTSProcess|ZonosVoice $process, array $payload): void
    {
        if ($process instanceof ZonosTTSProcess) {
            $this->handleSpeechCompletion($process, $payload);
        } else {
            $this->handleVoiceCompletion($process, $payload);
        }
    }

    public function handleFailed(ZonosTTSProcess|ZonosVoice $process, array $payload): void
    {
        $this->handleFailure($process, $payload);
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
