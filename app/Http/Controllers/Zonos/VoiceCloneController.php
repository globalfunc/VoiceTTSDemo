<?php

namespace App\Http\Controllers\Zonos;

use App\Http\Controllers\Controller;
use App\Jobs\SubmitZonosTTSJob;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use App\Services\RunPodHealthService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VoiceCloneController extends Controller
{
    public function index(Request $request): Response
    {
        $health = app(RunPodHealthService::class)
            ->getEndpointHealth(config('zonos.runpod.endpoint_id'));

        $voices = ZonosVoice::where('user_id', $request->user()->id)
            ->where('status', 'completed')
            ->whereNotNull('runpod_voice_id')
            ->latest()
            ->get(['id', 'name', 'runpod_voice_id', 'created_at']);

        $initialProcessStatus = null;
        if ($processId = session('process_id')) {
            $initialProcessStatus = ZonosTTSProcess::find($processId)?->status?->value;
        }

        return Inertia::render('zonos/voice-clone', [
            'languages'              => config('zonos.supported_languages'),
            'voices'                 => $voices,
            'runpod_health'          => $health,
            'initial_process_status' => $initialProcessStatus,
        ]);
    }

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $supportedLanguages = array_keys(config('zonos.supported_languages', []));

        $request->validate([
            'language' => ['required', Rule::in($supportedLanguages)],
            'text'     => ['required', 'string', 'max:1000'],
            'voice_id' => ['required', 'string'],
            'speed'    => ['nullable', 'numeric', 'min:0.5', 'max:2.0'],
            'emotion'  => ['nullable', 'array'],
            'emotion.happiness' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'emotion.sadness'   => ['nullable', 'numeric', 'min:0', 'max:1'],
            'emotion.disgust'   => ['nullable', 'numeric', 'min:0', 'max:1'],
            'emotion.fear'      => ['nullable', 'numeric', 'min:0', 'max:1'],
            'emotion.surprise'  => ['nullable', 'numeric', 'min:0', 'max:1'],
            'emotion.anger'     => ['nullable', 'numeric', 'min:0', 'max:1'],
            'emotion.other'     => ['nullable', 'numeric', 'min:0', 'max:1'],
            'emotion.neutral'   => ['nullable', 'numeric', 'min:0', 'max:1'],
        ]);

        // Verify voice belongs to this user and is completed
        $voice = ZonosVoice::where('id', $request->voice_id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'completed')
            ->whereNotNull('runpod_voice_id')
            ->first();

        if (! $voice) {
            return back()->withErrors(['voice_id' => 'Invalid or incomplete voice selected.']);
        }

        $process = ZonosTTSProcess::create([
            'user_id'        => $request->user()->id,
            'language'       => $request->language,
            'text_to_speech' => $request->text,
            'speed'          => $request->speed ?? 1.0,
            'emotion'        => $request->emotion ?: null,
            'voice_id'       => $voice->runpod_voice_id,
        ]);

        SubmitZonosTTSJob::dispatch($process);

        return redirect()->route('zonos.voice-clone')
            ->with('process_id', $process->id);
    }
}
