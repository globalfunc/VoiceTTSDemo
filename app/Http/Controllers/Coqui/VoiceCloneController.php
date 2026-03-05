<?php

namespace App\Http\Controllers\Coqui;

use App\Enums\StoredFileType;
use App\Http\Controllers\Controller;
use App\Jobs\SubmitVoiceCloneJob;
use App\Models\VoiceCloneProcess;
use App\Services\RunPodHealthService;
use App\Services\UploadFilesService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VoiceCloneController extends Controller
{
    public function index(Request $request): Response
    {
        $vcModels = config('coqui.voice_clone_models', []);
        $health = app(RunPodHealthService::class)
            ->getEndpointHealth(config('coqui.runpod.vc_endpoint_id'));

        // Build the list of supported languages from voice clone models
        $vcLanguages = collect($vcModels)
            ->flatMap(fn ($m) => $m['supported_languages'])
            ->unique()
            ->mapWithKeys(fn ($lang) => [$lang => config("coqui.supported_languages.{$lang}")])
            ->filter()
            ->all();

        return Inertia::render('coqui/voice-clone', [
            'vc_models' => $vcModels,
            'vc_languages' => $vcLanguages,
            'runpod_health' => $health,
            'upload_limits' => config('coqui.upload_file.validations'),
        ]);
    }

    public function store(Request $request, UploadFilesService $uploadService): \Illuminate\Http\RedirectResponse
    {
        $vcModels = config('coqui.voice_clone_models', []);
        $validModelIds = array_column($vcModels, 'id');
        $maxFiles = config('coqui.upload_file.validations.max_files', 5);
        $maxSizeKb = config('coqui.upload_file.validations.max_size_kb', 20480);

        $request->validate([
            'language' => ['required', 'string'],
            'model' => ['required', Rule::in($validModelIds)],
            'text' => ['required', 'string', 'max:1000'],
            'files' => ['required', 'array', "max:{$maxFiles}"],
            'files.*' => ['file', 'mimes:wav', "max:{$maxSizeKb}"],
        ]);

        // Duration validation for each file
        $durationErrors = [];
        foreach ($request->file('files') as $file) {
            $errors = $uploadService->validate($file);
            array_push($durationErrors, ...$errors);
        }

        if (! empty($durationErrors)) {
            return back()->withErrors(['files' => $durationErrors]);
        }

        $process = VoiceCloneProcess::create([
            'user_id' => $request->user()->id,
            'model' => $request->model,
            'language' => $request->language,
            'text_to_speech' => $request->text,
        ]);

        // Normalize, upload each source file, save StoredFile records
        foreach ($request->file('files') as $file) {
            $normalizedPath = $uploadService->normalize($file);

            try {
                $storedFile = $uploadService->uploadToS3(
                    $normalizedPath,
                    $file->getClientOriginalName(),
                    StoredFileType::SOURCE
                );
                $process->storedFiles()->save($storedFile);
            } finally {
                @unlink($normalizedPath);
            }
        }

        SubmitVoiceCloneJob::dispatch($process);

        return redirect()->route('coqui.voice-clone')
            ->with('process_id', $process->id);
    }
}
