<?php

namespace App\Events;

use App\Models\ZonosTTSProcess;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ZonosTTSProcessUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly ZonosTTSProcess $process) {}

    public function broadcastAs(): string
    {
        return 'ZonosTTSProcessUpdated';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("zonos-tts.{$this->process->id}")];
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
            'id'            => $this->process->id,
            'status'        => $status,
            'output_url'    => $outputFile?->url,
            'error'         => $status === 'failed' ? ($message ?? 'An error occurred.') : null,
            'message'       => $message,
            'debug_payload' => config('app.debug') ? $jsonResponse : null,
        ];

        Log::debug('Broadcast ZonosTTSProcessUpdated', $payload);

        return $payload;
    }
}
