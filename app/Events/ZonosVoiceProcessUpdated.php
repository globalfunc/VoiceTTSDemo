<?php

namespace App\Events;

use App\Models\ZonosVoice;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ZonosVoiceProcessUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly ZonosVoice $voice) {}

    public function broadcastAs(): string
    {
        return 'ZonosVoiceProcessUpdated';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("zonos-voice.{$this->voice->id}")];
    }

    public function broadcastWith(): array
    {
        $jsonResponse = $this->voice->json_response;
        $status = $this->voice->status->value;

        $errorMessage = $jsonResponse['output']['message']
            ?? $jsonResponse['message']
            ?? $jsonResponse['error']
            ?? null;

        $message = match ($status) {
            'completed' => "Voice '{$this->voice->name}' created successfully.",
            'failed'    => $errorMessage,
            default     => null,
        };

        $payload = [
            'id'              => $this->voice->id,
            'status'          => $status,
            'output_url'      => null,
            'runpod_voice_id' => $this->voice->runpod_voice_id,
            'error'           => $status === 'failed' ? ($errorMessage ?? 'An error occurred.') : null,
            'message'         => $message,
            'debug_payload'   => config('app.debug') ? $jsonResponse : null,
        ];

        Log::debug('Broadcast ZonosVoiceProcessUpdated', $payload);

        return $payload;
    }
}
