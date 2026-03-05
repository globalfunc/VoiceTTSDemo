<?php

namespace App\Services;

use App\Models\TTSProcess;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class CoquiTTSService
{
    private string $apiKey;
    private string $endpointId;
    private string $baseUrl = 'https://api.runpod.ai/v2';

    public function __construct()
    {
        $this->apiKey = config('coqui.runpod.api_key');
        $this->endpointId = config('coqui.runpod.tts_endpoint_id');
    }

    /**
     * Submit a TTS job to RunPod asynchronously.
     * Returns the RunPod job ID.
     */
    public function submit(TTSProcess $process, ?string $webhookUrl = null): string
    {
        $payload = [
            'input' => [
                'modelName' => $process->model,
                'text' => $process->text_to_speech,
                'outputFormat' => 'wav',
            ],
        ];

        if ($webhookUrl) {
            $payload['webhook'] = $webhookUrl;
        }

        $url = "{$this->baseUrl}/{$this->endpointId}/run";
        \Log::debug('RunPod TTS submit', ['url' => $url, 'payload' => json_encode($payload, JSON_PRETTY_PRINT)]);

        $response = $this->request('post', "/run", $payload);

        \Log::debug('RunPod TTS response', ['status' => $response->status(), 'body' => $response->body()]);

        return $response->json('id');
    }

    /**
     * Poll the status of a RunPod job.
     * Returns array with keys: status, output (on completion).
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
