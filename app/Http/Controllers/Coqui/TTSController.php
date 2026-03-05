<?php

namespace App\Http\Controllers\Coqui;

use App\Http\Controllers\Controller;
use App\Jobs\SubmitTTSJob;
use App\Models\TTSProcess;
use App\Services\RunPodHealthService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TTSController extends Controller
{
    public function index(Request $request): Response
    {
        $languages = config('coqui.supported_languages');
        $models = config('coqui.models');

        $health = app(RunPodHealthService::class)
            ->getEndpointHealth(config('coqui.runpod.tts_endpoint_id'));

        return Inertia::render('coqui/tts', [
            'languages' => $languages,
            'models' => $models,
            'runpod_health' => $health,
        ]);
    }

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $supportedLanguages = array_keys(config('coqui.supported_languages', []));
        $request->validate([
            'language' => ['required', Rule::in($supportedLanguages)],
            'model' => ['required', 'string'],
            'text' => ['required', 'string', 'max:1000'],
        ]);

        // Validate that model belongs to the chosen language
        $validModels = config("coqui.models.{$request->language}.tts", []);
        if (! in_array($request->model, $validModels)) {
            return back()->withErrors(['model' => 'Invalid model for the selected language.']);
        }

        $process = TTSProcess::create([
            'user_id' => $request->user()->id,
            'model' => $request->model,
            'language' => $request->language,
            'text_to_speech' => $request->text,
        ]);

        SubmitTTSJob::dispatch($process);

        return redirect()->route('coqui.tts')
            ->with('process_id', $process->id);
    }
}
