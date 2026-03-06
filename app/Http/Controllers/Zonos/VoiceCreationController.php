<?php

namespace App\Http\Controllers\Zonos;

use App\Enums\StoredFileType;
use App\Http\Controllers\Controller;
use App\Jobs\SubmitZonosVoiceJob;
use App\Models\ZonosVoice;
use App\Services\RunPodHealthService;
use App\Services\UploadFilesService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VoiceCreationController extends Controller
{
    public function index(Request $request): Response
    {
        $health = app(RunPodHealthService::class)
            ->getEndpointHealth(config('zonos.runpod.endpoint_id'));

        $initialProcessStatus = null;
        if ($voiceId = session('voice_id')) {
            $initialProcessStatus = ZonosVoice::find($voiceId)?->status?->value;
        }

        return Inertia::render('zonos/voice-creation', [
            'runpod_health'          => $health,
            'upload_limits'          => config('zonos.upload_file'),
            'initial_process_status' => $initialProcessStatus,
        ]);
    }

    public function store(Request $request, UploadFilesService $uploadService): \Illuminate\Http\RedirectResponse
    {
        $maxSizeKb = config('zonos.upload_file.max_size_kb', 20480);

        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'file' => ['required', 'file', 'mimes:wav', "max:{$maxSizeKb}"],
        ]);

        $errors = $uploadService->validate($request->file('file'));
        if (! empty($errors)) {
            return back()->withErrors(['file' => $errors]);
        }

        $voice = ZonosVoice::create([
            'user_id' => $request->user()->id,
            'name'    => $request->name,
        ]);

        $normalizedPath = $uploadService->normalize($request->file('file'));

        try {
            $storedFile = $uploadService->uploadToS3(
                $normalizedPath,
                $request->file('file')->getClientOriginalName(),
                StoredFileType::SOURCE
            );
            $voice->storedFiles()->save($storedFile);
        } finally {
            @unlink($normalizedPath);
        }

        SubmitZonosVoiceJob::dispatch($voice);

        return redirect()->route('zonos.voice-creation')
            ->with('voice_id', $voice->id);
    }
}
