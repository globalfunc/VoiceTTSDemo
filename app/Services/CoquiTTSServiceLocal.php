<?php

namespace App\Services;

use App\Models\TTSProcess;
use Illuminate\Support\Facades\Http;

class CoquiTTSServiceLocal
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('coqui.local_worker.url'), '/');
        $this->apiKey = config('coqui.local_worker.api_key');
    }

    /**
     * Call the local Docker TTS worker synchronously.
     * Returns the public URL of the generated audio file.
     */
    public function generate(TTSProcess $process): string
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(300)->post("{$this->baseUrl}/api/generate-tts", [
            'modelName' => $process->model,
            'text' => $process->text_to_speech,
            'outputFormat' => 'wav',
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException(
                "Local TTS worker error [{$response->status()}]: {$response->body()}"
            );
        }

        $url = $response->json('url');

        if (! $url) {
            throw new \RuntimeException('Local TTS worker returned no URL in response.');
        }

        return $url;
    }
}
