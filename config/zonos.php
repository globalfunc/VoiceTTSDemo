<?php

return [

    'supported_languages' => [
        'en-us' => 'English (US)',
        'en-gb' => 'English (UK)',
        'de'    => 'German',
        'fr'    => 'French',
        'es'    => 'Spanish',
        'it'    => 'Italian',
        'pt'    => 'Portuguese',
        'ru'    => 'Russian',
        'zh'    => 'Chinese',
        'ja'    => 'Japanese',
        'ko'    => 'Korean',
        'pl'    => 'Polish',
        'ar'    => 'Arabic',
        'nl'    => 'Dutch',
    ],

    'runpod' => [
        'api_key'               => env('RUNPOD_API_KEY', ''),
        'endpoint_id'           => env('RUNPOD_ZONOS_ENDPOINT_ID', '787d0fu8o2urws'),
        'webhook_url'           => env('RUNPOD_WEBHOOK_URL', null),
        'tts_timeout_seconds'   => env('RUNPOD_ZONOS_TTS_TIMEOUT', 180),
        'voice_timeout_seconds' => env('RUNPOD_ZONOS_VOICE_TIMEOUT', 120),
    ],

    'upload_file' => [
        'max_size_kb'           => 20480,  // 20 MB
        'max_duration_seconds'  => 30,
        'supported_formats'     => ['.wav'],
    ],

];
