<?php

namespace App\Events;

use App\Models\VoiceCloneProcess;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceCloneProcessUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly VoiceCloneProcess $process) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("voice-clone-process.{$this->process->id}")];
    }

    public function broadcastWith(): array
    {
        $outputFile = $this->process->storedFiles()->where('type', 'output')->first();

        return [
            'id' => $this->process->id,
            'status' => $this->process->status->value,
            'output_url' => $outputFile?->url,
            'error' => $this->process->status->value === 'failed'
                ? ($this->process->json_response['error'] ?? 'An error occurred.')
                : null,
        ];
    }
}
