<?php

namespace App\Concerns;

use App\Enums\ProcessStatus;
use App\Enums\StoredFileType;
use App\Models\StoredFile;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;

trait HandlesRunPodCompletion
{
    /**
     * Mark a process as completed, create output StoredFile, broadcast update.
     */
    protected function handleCompletion(TTSProcess|VoiceCloneProcess $process, array $output): void
    {
        $outputUrl = $output['output']['url'] ?? null;

        $process->update([
            'status' => ProcessStatus::COMPLETED,
            'json_response' => $output,
            'completed_at' => now(),
        ]);

        if ($outputUrl) {
            // Parse the S3 path from the URL to store just the key
            $storagePath = $this->extractStoragePath($outputUrl);

            $storedFile = new StoredFile([
                'storage_disk' => 's3',
                'storage_path' => $storagePath,
                'name' => basename($storagePath),
                'type' => StoredFileType::OUTPUT,
            ]);

            $process->storedFiles()->save($storedFile);
        }

        $process->refresh();
        $this->broadcastUpdate($process);
    }

    /**
     * Mark a process as failed with the error response.
     */
    protected function handleFailure(TTSProcess|VoiceCloneProcess $process, array $response): void
    {
        $process->update([
            'status' => ProcessStatus::FAILED,
            'json_response' => $response,
            'completed_at' => now(),
        ]);

        $this->broadcastUpdate($process);
    }

    /**
     * Mark a process as timed out.
     */
    protected function handleTimeout(TTSProcess|VoiceCloneProcess $process): void
    {
        $process->update([
            'status' => ProcessStatus::TIMEOUT,
            'completed_at' => now(),
        ]);

        $this->broadcastUpdate($process);
    }

    private function extractStoragePath(string $url): string
    {
        // Strip the bucket base URL to get just the object key
        $s3BaseUrl = config('filesystems.disks.s3.url', '');
        if ($s3BaseUrl && str_starts_with($url, $s3BaseUrl)) {
            return ltrim(substr($url, strlen($s3BaseUrl)), '/');
        }
        // Fallback: use the URL path
        return ltrim(parse_url($url, PHP_URL_PATH), '/');
    }

    abstract protected function broadcastUpdate(TTSProcess|VoiceCloneProcess $process): void;
}
