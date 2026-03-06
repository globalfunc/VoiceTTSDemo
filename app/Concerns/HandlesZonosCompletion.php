<?php

namespace App\Concerns;

use App\Enums\ProcessStatus;
use App\Enums\StoredFileType;
use App\Models\StoredFile;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use Illuminate\Support\Facades\Storage;

trait HandlesZonosCompletion
{
    /**
     * Handle TTS speech completion: decode base64 audio, upload to S3, create StoredFile.
     */
    protected function handleSpeechCompletion(ZonosTTSProcess $process, array $output): void
    {
        $workerOutput = $output['output'] ?? [];
        $workerStatus = $workerOutput['status'] ?? 200;
        $audioBase64 = $workerOutput['audio'] ?? null;

        if ($workerStatus >= 400 || $audioBase64 === null) {
            $this->handleFailure($process, $output);
            return;
        }

        $format = $workerOutput['format'] ?? 'mp3';
        $storagePath = "zonos/tts/{$process->id}.{$format}";

        // Decode and upload to S3
        $audioBytes = base64_decode($audioBase64);
        Storage::disk('s3')->put($storagePath, $audioBytes, 'private');

        // Strip the base64 audio from the stored response to keep json_response small
        $storedOutput = $output;
        unset($storedOutput['output']['audio']);

        $process->update([
            'status'       => ProcessStatus::COMPLETED,
            'json_response' => $storedOutput,
            'completed_at' => now(),
        ]);

        $storedFile = new StoredFile([
            'storage_disk' => 's3',
            'storage_path' => $storagePath,
            'name'         => basename($storagePath),
            'type'         => StoredFileType::OUTPUT,
        ]);

        $process->storedFiles()->save($storedFile);

        $process->refresh();
        $this->broadcastUpdate($process);
    }

    /**
     * Handle voice creation completion: store the RunPod voice_id.
     */
    protected function handleVoiceCompletion(ZonosVoice $voice, array $output): void
    {
        $workerOutput = $output['output'] ?? [];
        $workerStatus = $workerOutput['status'] ?? 200;
        $runpodVoiceId = $workerOutput['voice_id'] ?? null;

        if ($workerStatus >= 400 || $runpodVoiceId === null) {
            $this->handleFailure($voice, $output);
            return;
        }

        $voice->update([
            'runpod_voice_id' => $runpodVoiceId,
            'status'          => ProcessStatus::COMPLETED,
            'json_response'   => $output,
            'completed_at'    => now(),
        ]);

        $this->broadcastUpdate($voice);
    }

    /**
     * Mark a process as failed with the full API response payload.
     */
    protected function handleFailure(ZonosTTSProcess|ZonosVoice $process, array $response): void
    {
        $process->update([
            'status'        => ProcessStatus::FAILED,
            'json_response' => $response,
            'completed_at'  => now(),
        ]);

        $this->broadcastUpdate($process);
    }

    /**
     * Mark a process as timed out.
     */
    protected function handleTimeout(ZonosTTSProcess|ZonosVoice $process): void
    {
        $process->update([
            'status'       => ProcessStatus::TIMEOUT,
            'completed_at' => now(),
        ]);

        $this->broadcastUpdate($process);
    }

    abstract protected function broadcastUpdate(ZonosTTSProcess|ZonosVoice $process): void;
}
