<?php

namespace App\Services;

use App\Models\StoredFile;
use App\Models\VoiceCloneProcess;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class CoquiVoiceCloneServiceLocal
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('coqui.local_worker.url'), '/');
        $this->apiKey = config('coqui.local_worker.api_key');
    }

    /**
     * Call the local Docker voice-clone worker synchronously.
     * Returns the public URL of the generated audio file.
     */
    public function generate(VoiceCloneProcess $process, array $sourceStoredFiles): string
    {
        $referenceAudioUrls = collect($sourceStoredFiles)
            ->map(fn (StoredFile $f) => Storage::disk($f->storage_disk)->url($f->storage_path))
            ->values()
            ->all();

        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(600)->post("{$this->baseUrl}/api/generate-vc", [
            'modelName' => $process->model,
            'text' => $process->text_to_speech,
            'language' => $process->language,
            'referenceAudioUrls' => $referenceAudioUrls,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException(
                "Local VC worker error [{$response->status()}]: {$response->body()}"
            );
        }

        $url = $response->json('url');

        if (! $url) {
            throw new \RuntimeException('Local VC worker returned no URL in response.');
        }

        return $url;
    }
}
