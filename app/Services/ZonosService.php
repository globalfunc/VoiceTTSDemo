<?php

namespace App\Services;

use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use App\Models\StoredFile;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ZonosService
{
    private string $apiKey;
    private string $endpointId;
    private string $baseUrl = 'https://api.runpod.ai/v2';

    public function __construct()
    {
        $this->apiKey = config('zonos.runpod.api_key');
        $this->endpointId = config('zonos.runpod.endpoint_id');
    }

    /**
     * Submit a TTS (speech) job to RunPod.
     * Returns the RunPod job ID.
     */
    public function submitSpeech(ZonosTTSProcess $process, ?string $webhookUrl = null): string
    {
        $input = [
            'type'            => 'speech',
            'input'           => $process->text_to_speech,
            'language'        => $process->language,
            'speed'           => $process->speed,
            'response_format' => 'mp3',
        ];

        if ($process->emotion) {
            $input['emotion'] = $process->emotion;
        }

        if ($process->voice_id) {
            $input['voice'] = $process->voice_id;
        }

        $payload = ['input' => $input];

        if ($webhookUrl) {
            $payload['webhook'] = $webhookUrl;
        }

        \Log::debug('Zonos TTS submit', ['payload' => json_encode($payload, JSON_PRETTY_PRINT)]);

        $response = $this->request('post', '/run', $payload);

        \Log::debug('Zonos TTS response', ['status' => $response->status(), 'body' => $response->body()]);

        return $response->json('id');
    }

    /**
     * Submit a voice creation job to RunPod.
     * Reads the uploaded WAV from S3, base64-encodes it, sends inline.
     * Returns the RunPod job ID.
     */
    public function submitVoice(ZonosVoice $voice, StoredFile $sourceFile, ?string $webhookUrl = null): string
    {
        $audioBytes = Storage::disk($sourceFile->storage_disk)->get($sourceFile->storage_path);
        $audioBase64 = base64_encode($audioBytes);

        $input = [
            'type'  => 'voice',
            'audio' => $audioBase64,
            'name'  => $voice->name,
        ];

        $payload = ['input' => $input];

        if ($webhookUrl) {
            $payload['webhook'] = $webhookUrl;
        }

        \Log::debug('Zonos Voice submit', ['voice_name' => $voice->name]);

        $response = $this->request('post', '/run', $payload);

        \Log::debug('Zonos Voice response', ['status' => $response->status(), 'body' => $response->body()]);

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
            'Content-Type'  => 'application/json',
        ])->{$method}($url, $data ?: null);
    }
}
