# VoiceTTS — Full Implementation Plan

## Context
Building a Laravel 12 + InertiaJS + React + TypeScript TTS SaaS app that delegates audio generation to GPU-powered RunPod Serverless workers. Coqui AI (XTTS v2) is the first provider. The ai-worker FastAPI service already exists at `/home/stoyan/Workspace/ai-worker/` but needs: (a) a bug fix in `tts_service.py` (premature return blocks R2 upload), and (b) a new voice clone endpoint.

## Confirmed Decisions
- **Auth**: All `/coqui/*` pages require authentication; processes belong to `user_id`
- **RunPod**: Serverless async `/run` + **webhook callback in production / 2-job polling fallback in dev**
- **Real-time**: Laravel Reverb (WebSockets) + Laravel Echo on frontend
- **Storage**: **MinIO for local dev** (S3-compatible, shared between ai-worker Docker and Laravel); Cloudflare R2 for production. Same S3 API either way.
- **Voice Clone UX**: Upload wav samples + type text → XTTS v2 returns synthesized speech in cloned voice
- **ai-worker**: Include voice clone endpoint + fix existing bug
- **Library page**: `pages/library.tsx` at root level (not coqui-specific), shows all providers with filters
- **Job timeouts**: TTS 3 min / Voice Clone 10 min — configurable in `config/coqui.php`

---

## Pre-Implementation Corrections

### config/coqui.php
- Move `tts_models/de/thorsten/*`, `tts_models/ewe/*`, `tts_models/hau/*`, etc. out of `'en'` key
- Populate `voice_clone_models` with:
  ```php
  'voice_clone_models' => [
      ['id' => 'tts_models/multilingual/multi-dataset/xtts_v2', 'name' => 'XTTS v2', 'supports_cloning' => true],
      ['id' => 'tts_models/multilingual/multi-dataset/xtts_v1.1', 'name' => 'XTTS v1.1', 'supports_cloning' => true],
      ['id' => 'tts_models/multilingual/multi-dataset/your_tts', 'name' => 'YourTTS', 'supports_cloning' => true],
  ]
  ```
- Add `upload_file.validations`: `max_size_kb`, `max_duration_seconds`, `supported_formats`
- Add `runpod` section: `api_key`, `tts_endpoint_id`, `vc_endpoint_id`, `webhook_url` (nullable for local), `tts_timeout_seconds` (180), `vc_timeout_seconds` (600)

### Page naming — use `voice-clone.tsx` consistently

---

## Critical Files to Create / Modify

### ai-worker
- `app/tts_service.py` — fix bug, add `generate_vc()`, use MinIO/S3-compatible upload
- `app/main.py` — add `POST /api/generate-vc` endpoint
- `docker-compose.yml` — add MinIO service

### Laravel Backend
- `config/coqui.php` — corrections above
- `app/Enums/ProcessStatus.php`
- `app/Enums/StoredFileType.php`
- `database/migrations/create_tts_processes_table.php`
- `database/migrations/create_voice_clone_processes_table.php`
- `database/migrations/create_stored_files_table.php`
- `app/Models/TTSProcess.php`
- `app/Models/VoiceCloneProcess.php`
- `app/Models/StoredFile.php`
- `app/Services/UploadFilesService.php`
- `app/Services/CoquiTTSService.php`
- `app/Services/CoquiVoiceCloneService.php`
- `app/Services/RunPodHealthService.php`
- `app/Jobs/SubmitTTSJob.php`
- `app/Jobs/SubmitVoiceCloneJob.php`
- `app/Jobs/PollRunPodStatusJob.php`
- `app/Events/TTSProcessUpdated.php`
- `app/Events/VoiceCloneProcessUpdated.php`
- `app/Http/Controllers/Coqui/DashboardController.php`
- `app/Http/Controllers/Coqui/TTSController.php`
- `app/Http/Controllers/Coqui/VoiceCloneController.php`
- `app/Http/Controllers/LibraryController.php`
- `app/Http/Controllers/RunPodWebhookController.php`
- `routes/web.php` — add routes

### Frontend
- `resources/js/pages/coqui/dashboard.tsx`
- `resources/js/pages/coqui/tts.tsx`
- `resources/js/pages/coqui/voice-clone.tsx`
- `resources/js/pages/library.tsx`
- `resources/js/components/process-status-card.tsx`
- `resources/js/components/audio-player.tsx`
- `resources/js/components/wav-file-uploader.tsx`
- `resources/js/components/cold-start-notice.tsx`
- `resources/js/hooks/use-process-status.ts`
- `resources/js/types/process.ts`

---

## Phase 0: Config Fixes & Package Installation

**Laravel packages:**
```bash
composer require laravel/reverb php-ffmpeg/php-ffmpeg
php artisan reverb:install
```

**NPM packages:**
```bash
npm install @wavesurfer/react react-dropzone laravel-echo pusher-js
```

**Storage configuration (`config/filesystems.php`):**
Add `s3` disk config (works for both MinIO and R2 — controlled by env vars):
```php
's3' => [
    'driver' => 's3',
    'endpoint' => env('AWS_ENDPOINT'),
    'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false), // true for MinIO
    'key'    => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION', 'auto'),
    'bucket' => env('AWS_BUCKET'),
    'url'    => env('AWS_URL'),
]
```

**.env additions:**
```
# Local (MinIO)
AWS_ENDPOINT=http://localhost:9000
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_BUCKET=voicetts
AWS_URL=http://localhost:9000/voicetts
FILESYSTEM_DISK=s3

# RunPod
RUNPOD_API_KEY=
RUNPOD_TTS_ENDPOINT_ID=
RUNPOD_VC_ENDPOINT_ID=
RUNPOD_WEBHOOK_URL=   # empty in local dev, public URL in prod

# Reverb
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
```

---

## Phase 1: ai-worker Fixes & Extensions

**`docker-compose.yml` — add MinIO service:**
```yaml
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"  # MinIO console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
  app:
    # existing fastapi service
    environment:
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin
      - S3_BUCKET=voicetts
      - S3_PUBLIC_URL=http://localhost:9000/voicetts
      - S3_USE_PATH_STYLE=true
volumes:
  minio-data:
  tts-cache:
```

**`app/config.py` — rename R2_* to S3_* for generic S3 compatibility:**
```python
S3_ENDPOINT = os.getenv("S3_ENDPOINT")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
S3_BUCKET = os.getenv("S3_BUCKET")
S3_PUBLIC_URL = os.getenv("S3_PUBLIC_URL")
S3_USE_PATH_STYLE = os.getenv("S3_USE_PATH_STYLE", "false").lower() == "true"
```

**`app/tts_service.py` — fix bug + voice clone:**
- Remove premature `return output_file;` (line 41) — fix dead R2/S3 upload code
- Rename `upload_to_r2` → `upload_to_s3`, use S3_* config vars, add `Config(s3={"addressing_style": "path"})` when `S3_USE_PATH_STYLE`
- Add `generate_vc(model_name, reference_audio_urls, text, language)`:
  - Download reference audio files from S3 to temp dir
  - `model.tts_to_file(text=text, speaker_wav=local_paths, language=language, file_path=output_file)` for XTTS v2
  - Upload output to S3, return URL

**`app/main.py` — add voice clone endpoint:**
```python
class VCRequest(BaseModel):
    modelName: str
    text: str
    language: str
    referenceAudioUrls: list[str]  # S3 URLs of uploaded source files

@app.post("/api/generate-vc")
async def generate_vc_endpoint(req: VCRequest, x_api_key: str = Header(None)):
    verify_api_key(x_api_key)
    url = generate_vc(req.modelName, req.referenceAudioUrls, req.text, req.language)
    return {"url": url}
```

---

## Phase 2: Database Migrations & Models

### Migrations

**`create_tts_processes_table`**
```
id, user_id (FK users), model (string), language (string),
status (string, default: pending), text_to_speech (text),
runpod_job_id (string, nullable),
json_response (json, nullable), created_at, completed_at (nullable)
```

**`create_voice_clone_processes_table`**
```
id, user_id (FK users), model (string), language (string),
status (string, default: pending), text_to_speech (text),
runpod_job_id (string, nullable),
json_response (json, nullable), created_at, completed_at (nullable)
```

**`create_stored_files_table`**
```
id, process_id (unsignedBigInt), process_type (string),
storage_disk (string), storage_path (string), name (string),
type (string: source|output), created_at, deleted_at
```

### Enums

**`ProcessStatus`**: PENDING, PROCESSING, COMPLETED, FAILED, TIMEOUT

**`StoredFileType`**: SOURCE, OUTPUT

### Models

**`TTSProcess`** — fillable, casts status → ProcessStatus, `storedFiles()` morphMany, `user()` belongsTo

**`VoiceCloneProcess`** — same structure

**`StoredFile`**
- `process()` morphTo
- `getUrlAttribute()`:
  ```php
  return Storage::disk($this->storage_disk)->url($this->storage_path);
  // Works for both local MinIO (s3 disk) and production R2 (s3 disk with different endpoint)
  ```

---

## Phase 3: Services

### `UploadFilesService`
- `validate(UploadedFile $file): array` — mime, size vs `config('coqui.upload_file.validations.max_size_kb')`, duration via `php-ffmpeg/php-ffmpeg`
- `normalize(UploadedFile $file): string` — ffmpeg: `-ac 1 -ar 22050 -acodec pcm_s16le`, return temp path
- `uploadToS3(string $localPath, string $key): StoredFile` — `Storage::disk('s3')->put()`, create StoredFile record

### `CoquiTTSService`
- `submit(TTSProcess $process, ?string $webhookUrl = null): string` — POST to `https://api.runpod.ai/v2/{tts_endpoint_id}/run`, include `webhook` if $webhookUrl is set, return RunPod job_id
- `pollStatus(string $runpodJobId): array` — GET `/v2/{endpoint_id}/status/{job_id}`, returns `{status, output}`

### `CoquiVoiceCloneService`
Same pattern, for `vc_endpoint_id`. Payload includes `referenceAudioUrls`.

### `RunPodHealthService`
- `getEndpointHealth(string $endpointId): array` — `GET /v2/{endpointId}/health`
- Returns `{workers: {running, idle}, jobs: {inQueue}}` — frontend uses for ColdStartNotice

---

## Phase 4: Queue Jobs (2-job architecture)

### Job 1: `SubmitTTSJob`
1. Update TTSProcess → PROCESSING, broadcast
2. Check `config('coqui.runpod.webhook_url')` — if set, submit RunPod async request **with webhook**; otherwise submit without webhook
3. Store returned RunPod job_id on `$process->runpod_job_id`
4. If **no webhook** configured: dispatch `PollRunPodStatusJob($process, 'tts')` with 10s delay
5. Broadcast `TTSProcessUpdated` (status: processing)

### Job 2: `PollRunPodStatusJob` (only active when no webhook configured)
1. Call `CoquiTTSService::pollStatus($process->runpod_job_id)` (or VC equivalent)
2. If RunPod status = `COMPLETED`: call `handleCompletion($process, $output)`, broadcast
3. If RunPod status = `FAILED`: mark FAILED, broadcast
4. If RunPod status = `IN_QUEUE` / `IN_PROGRESS`:
   - Check if `now() > $process->created_at + timeout` → mark TIMEOUT, broadcast
   - Otherwise: re-dispatch self with 10s delay
5. Accepts both TTSProcess and VoiceCloneProcess via a shared interface

### `RunPodWebhookController` (production)
- `POST /api/runpod/webhook` — validates RunPod signature, finds process by `runpod_job_id`, calls `handleCompletion` or marks FAILED

### Shared `handleCompletion()` logic (trait)
- Parse URL from RunPod output
- Create `StoredFile` (type: output, disk: s3)
- Set `$process->status = COMPLETED`, `completed_at = now()`, `json_response = $output`
- Broadcast updated event

### Timeouts (config-driven)
- `config('coqui.runpod.tts_timeout_seconds')` = 180
- `config('coqui.runpod.vc_timeout_seconds')` = 600

---

## Phase 5: Broadcasting Events

### `TTSProcessUpdated` — private channel `tts-process.{process->id}`
Payload: `{id, status, output_url?, error?, is_cold_starting?}`

### `VoiceCloneProcessUpdated` — private channel `voice-clone-process.{process->id}`

### `routes/channels.php`
```php
Broadcast::channel('tts-process.{processId}', fn($user, $processId) =>
    TTSProcess::where('id', $processId)->where('user_id', $user->id)->exists()
);
Broadcast::channel('voice-clone-process.{processId}', fn($user, $processId) =>
    VoiceCloneProcess::where('id', $processId)->where('user_id', $user->id)->exists()
);
```

---

## Phase 6: Controllers & Routes

### Routes (`routes/web.php`)
```php
Route::middleware(['auth', 'verified'])->prefix('coqui')->name('coqui.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/tts', [TTSController::class, 'index'])->name('tts');
    Route::post('/tts', [TTSController::class, 'store'])->name('tts.store');
    Route::get('/voice-clone', [VoiceCloneController::class, 'index'])->name('voice-clone');
    Route::post('/voice-clone', [VoiceCloneController::class, 'store'])->name('voice-clone.store');
});

Route::middleware(['auth', 'verified'])
    ->get('/library', [LibraryController::class, 'index'])
    ->name('library');

// Webhook — no auth, validated by RunPod signature header
Route::post('/api/runpod/webhook', [RunPodWebhookController::class, 'handle'])
    ->name('runpod.webhook');
```

### `TTSController::store()`
1. Validate: language, model, text (max:1000)
2. Create TTSProcess (status: PENDING, user_id, model, language, text_to_speech)
3. Dispatch `SubmitTTSJob::dispatch($process)`
4. Return Inertia with `['processId' => $process->id]`

### `VoiceCloneController::store()`
1. Validate: language, model, text, files (1-5, wav, max size from config)
2. For each file: validate duration via UploadFilesService, normalize, upload to S3 → create StoredFile (SOURCE)
3. Create VoiceCloneProcess, reference source StoredFiles
4. Dispatch `SubmitVoiceCloneJob::dispatch($process)`
5. Return Inertia with `['processId' => $process->id]`

### `LibraryController::index()`
- Query TTSProcess + VoiceCloneProcess for `auth()->id()`
- Filter params: `provider`, `type` (tts/vc), `status`
- Paginated, eager-load output StoredFiles

---

## Phase 7: Frontend Pages & Components

### NPM additions
```json
"@wavesurfer/react": "^7.x",
"react-dropzone": "^14.x",
"laravel-echo": "^1.x",
"pusher-js": "^8.x"
```

### `resources/js/types/process.ts`
```ts
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

export interface TTSProcess {
  id: number;
  status: ProcessStatus;
  text_to_speech: string;
  model: string;
  language: string;
  output_url?: string;
  created_at: string;
}

export interface VoiceCloneProcess {
  id: number;
  status: ProcessStatus;
  model: string;
  language: string;
  output_url?: string;
  created_at: string;
}
```

### `hooks/use-process-status.ts`
- Subscribes to Reverb private channel on mount
- Returns `{status, outputUrl, error, isColdStarting}` — updates reactively on broadcast

### `components/process-status-card.tsx`
- Pending/processing: spinner + cold start notice if `isColdStarting`
- Completed: renders `AudioPlayer` with output URL
- Failed/timeout: error message + retry tips

### `components/audio-player.tsx`
- `@wavesurfer/react` waveform + play/pause
- Download button

### `components/wav-file-uploader.tsx`
- `react-dropzone`, max 5 files, `.wav` only
- Per-file progress bar, `×` remove button
- Client-side pre-validation: reject files > config max_size immediately

### `pages/coqui/tts.tsx`
- Language `<Select>` → Model `<Select>` (config-driven)
- `<Textarea>` with 1000-char countdown, disables on limit (backspace still works)
- `ColdStartNotice` if RunPod health shows 0 idle workers
- After submit: `ProcessStatusCard` subscribed to WS channel

### `pages/coqui/voice-clone.tsx`
- Language `<Select>` (only voice_clone_models languages)
- Model `<Select>` (from voice_clone_models config)
- `<Textarea>` (text to synthesize in cloned voice, 1000 char limit)
- `WavFileUploader` (up to 5 files)
- `ProcessStatusCard` after submit

### `pages/library.tsx` — root level, shared across all providers
- Filter bar: provider (Coqui, future: Zonos…), type (TTS / Voice Clone), status
- Paginated table: status badge, type, provider, model, created date, output `AudioPlayer`

### `pages/coqui/dashboard.tsx`
- Stats: total TTS / Voice Clone generations
- Recent 5 processes with status badges
- Quick action cards to TTS and Voice Clone pages

---

## Reusable Existing Code
- `resources/js/components/ui/*` — shadcn/ui (Select, Button, Textarea, Badge, Alert, Card, Skeleton, Spinner) — all installed
- `resources/js/components/alert-error.tsx` — form-level errors
- `resources/js/components/input-error.tsx` — field-level errors

---

## Verification Plan
1. `php artisan migrate` — verify 3 new tables in PostgreSQL
2. `docker-compose up` in ai-worker — MinIO (port 9000) + FastAPI (port 8000) both running
3. `php artisan reverb:start` + `php artisan queue:work`
4. POST `/coqui/tts` → TTSProcess (PENDING), job dispatched
5. Local dev (no webhook): PollRunPodStatusJob fires every 10s, polls RunPod
6. Production (webhook set): RunPod POSTs to webhook controller on completion
7. COMPLETED response → TTSProcess status updated, StoredFile created (s3/minIO disk)
8. `StoredFile::url` resolves via MinIO locally / R2 in production
9. Frontend: submit → spinner → AudioPlayer renders on broadcast
10. POST `/coqui/voice-clone` with 5 wav files → ffmpeg validation + normalization → upload to MinIO → VoiceCloneProcess created
11. Library page: filter by provider/type, audio playback on completed items
12. Unauthenticated `/coqui/tts` → redirect to login
13. Timeout: set low timeout in config → TIMEOUT status, frontend shows error card
