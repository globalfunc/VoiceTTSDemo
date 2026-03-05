<?php

namespace App\Events;

use App\Models\StoredFile;
use App\Models\TTSProcess;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class TTSProcessUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly TTSProcess $process) {}

    public function broadcastAs(): string
    {
        return 'TTSProcessUpdated';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("tts-process.{$this->process->id}")];
    }

    public function broadcastWith(): array
    {
        $outputFile = $this->process->storedFiles()->where('type', 'output')->first();
        $jsonResponse = $this->process->json_response;
        $status = $this->process->status->value;

        $message = match ($status) {
            'completed', 'failed' => $jsonResponse['output']['message']
                ?? $jsonResponse['message']
                ?? $jsonResponse['error']
                ?? null,
            default => null,
        };


        $payload = [
            'id' => $this->process->id,
            'status' => $status,
            'output_url' => $outputFile?->url,
            'error' => $status === 'failed' ? ($message ?? 'An error occurred.') : null,
            'message' => $message,
            'debug_payload' => config('app.debug') ? $jsonResponse : null,
        ];

        Log::debug('Broadcast TTSProcessUpdated', $payload);

        return $payload;
    }
}
