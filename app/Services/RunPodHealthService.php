<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class RunPodHealthService
{
    private string $apiKey;
    private string $baseUrl = 'https://api.runpod.ai/v2';

    public function __construct()
    {
        $this->apiKey = config('coqui.runpod.api_key');
    }

    /**
     * Returns endpoint health data including worker counts.
     * Shape: { workers: { running, idle }, jobs: { inQueue, inProgress, completed, failed } }
     */
    public function getEndpointHealth(string $endpointId): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
        ])->get("{$this->baseUrl}/{$endpointId}/health");

        if ($response->failed()) {
            return ['workers' => ['running' => 0, 'idle' => 0], 'jobs' => ['inQueue' => 0]];
        }

        return $response->json();
    }

    /**
     * Returns true if no workers are available (cold start likely needed).
     */
    public function isColdStartLikely(string $endpointId): bool
    {
        $health = $this->getEndpointHealth($endpointId);

        return ($health['workers']['running'] ?? 0) + ($health['workers']['idle'] ?? 0) === 0;
    }
}
