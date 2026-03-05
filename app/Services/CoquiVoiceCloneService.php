<?php

namespace App\Services;

use App\Models\StoredFile;
use App\Models\VoiceCloneProcess;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class CoquiVoiceCloneService
{
    private string $apiKey;
    private string $endpointId;
    private string $baseUrl = 'https://api.runpod.ai/v2';

    public function __construct()
    {
        $this->apiKey = config('coqui.runpod.api_key');
        $this->endpointId = config('coqui.runpod.vc_endpoint_id');
    }

    /**
     * Submit a voice clone job to RunPod asynchronously.
     * Returns the RunPod job ID.
     */
    public function submit(VoiceCloneProcess $process, array $sourceStoredFiles, ?string $webhookUrl = null): string
    {
        $referenceAudioUrls = collect($sourceStoredFiles)
            ->map(fn (StoredFile $f) => Storage::disk($f->storage_disk)->url($f->storage_path))
            ->values()
            ->all();

        $payload = [
            'input' => [
                'modelName' => $process->model,
                'text' => $process->text_to_speech,
                'language' => $process->language,
                'referenceAudioUrls' => $referenceAudioUrls,
            ],
        ];

        if ($webhookUrl) {
            $payload['webhook'] = $webhookUrl;
        }

        $response = $this->request('post', '/run', $payload);

        return $response->json('id');
    }

    /**
     * Poll the status of a RunPod job.
     */
    public function pollStatus(string $runpodJobId): array
    {
        $response = $this->request('get', "/status/{$runpodJobId}");

        return $response->json();
    }

    private function request(string $method, string $path, array $data = []): Response
    {
        $url = "{$this->baseUrl}/{$this->endpointId}{$path}";

        return Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type' => 'application/json',
        ])->{$method}($url, $data ?: null);
    }
}
