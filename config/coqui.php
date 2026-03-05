<?php

return [

    'supported_languages' => [
        'en' => 'English',
        'es' => 'Spanish',
        'fr' => 'French',
        'de' => 'German',
        'bg' => 'Bulgarian',
        'it' => 'Italian',
        'ru' => 'Russian',
        'multi' => 'Multi-language',
    ],

    'models' => [
        'en' => [
            'tts' => [
                'tts_models/en/ek1/tacotron2',
                'tts_models/en/ljspeech/tacotron2-DDC',
                'tts_models/en/ljspeech/tacotron2-DDC_ph',
                'tts_models/en/ljspeech/glow-tts',
                'tts_models/en/ljspeech/speedy-speech',
                'tts_models/en/ljspeech/tacotron2-DCA',
                'tts_models/en/ljspeech/vits',
                'tts_models/en/ljspeech/vits--neon',
                'tts_models/en/ljspeech/fast_pitch',
                'tts_models/en/ljspeech/overflow',
                'tts_models/en/ljspeech/neural_hmm',
                'tts_models/en/vctk/vits',
                'tts_models/en/vctk/fast_pitch',
                'tts_models/en/sam/tacotron-DDC',
                'tts_models/en/blizzard2013/capacitron-t2-c50',
                'tts_models/en/blizzard2013/capacitron-t2-c150_v2',
                'tts_models/en/multi-dataset/tortoise-v2',
                'tts_models/en/jenny/jenny',
            ],
        ],
        'de' => [
            'tts' => [
                'tts_models/de/thorsten/tacotron2-DCA',
                'tts_models/de/thorsten/vits',
                'tts_models/de/thorsten/tacotron2-DDC',
            ],
        ],
        'fr' => [
            'tts' => [
                'tts_models/fr/mai/tacotron2-DDC',
                'tts_models/fr/css10/vits',
            ],
        ],
        'it' => [
            'tts' => [
                'tts_models/it/mai_female/glow-tts',
                'tts_models/it/mai_female/vits',
                'tts_models/it/mai_male/glow-tts',
                'tts_models/it/mai_male/vits',
            ],
        ],
        'es' => [
            'tts' => [
                'tts_models/es/mai/tacotron2-DDC',
                'tts_models/es/css10/vits',
            ],
        ],
        'bg' => [
            'tts' => [
                'tts_models/bg/cv/vits',
            ],
        ],
        'multi' => [
            'tts' => [
                'tts_models/multilingual/multi-dataset/xtts_v2',
                'tts_models/multilingual/multi-dataset/xtts_v1.1',
                'tts_models/multilingual/multi-dataset/your_tts',
                'tts_models/multilingual/multi-dataset/bark',
            ],
        ],
    ],

    'voice_clone_models' => [
        [
            'id' => 'tts_models/multilingual/multi-dataset/xtts_v2',
            'name' => 'XTTS v2',
            'supports_cloning' => true,
            'supported_languages' => ['en', 'es', 'fr', 'de', 'it', 'ru', 'multi'],
        ],
        [
            'id' => 'tts_models/multilingual/multi-dataset/xtts_v1.1',
            'name' => 'XTTS v1.1',
            'supports_cloning' => true,
            'supported_languages' => ['en', 'es', 'fr', 'de', 'it', 'multi'],
        ],
        [
            'id' => 'tts_models/multilingual/multi-dataset/your_tts',
            'name' => 'YourTTS',
            'supports_cloning' => true,
            'supported_languages' => ['en', 'multi'],
        ],
    ],

    'upload_file' => [
        'validations' => [
            'max_size_kb' => 20480,        // 20 MB
            'max_duration_seconds' => 38,
            'supported_formats' => ['.wav'],
            'max_files' => 5,
        ],
    ],

    'runpod' => [
        'api_key' => env('RUNPOD_API_KEY', ''),
        'tts_endpoint_id' => env('RUNPOD_TTS_ENDPOINT_ID', 'nbzsxv4jty3zz2'),
        'vc_endpoint_id' => env('RUNPOD_VC_ENDPOINT_ID', 'nbzsxv4jty3zz2'),
        'webhook_url' => env('RUNPOD_WEBHOOK_URL', null), // null = use polling fallback
        'tts_timeout_seconds' => env('RUNPOD_TTS_TIMEOUT', 180),
        'vc_timeout_seconds' => env('RUNPOD_VC_TIMEOUT', 600),
    ],

    'local_worker' => [
        'enabled' => env('LOCAL_TTS_WORKER_ENABLED', false),
        'url' => env('LOCAL_TTS_WORKER_URL', 'http://localhost:8001'),
        'api_key' => env('LOCAL_TTS_WORKER_API_KEY', ''),
    ],

];
