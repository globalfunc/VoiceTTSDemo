<?php

use App\Http\Controllers\Coqui\DashboardController;
use App\Http\Controllers\Coqui\TTSController;
use App\Http\Controllers\Coqui\VoiceCloneController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\RunPodWebhookController;
use App\Http\Controllers\Zonos\DashboardController as ZonosDashboardController;
use App\Http\Controllers\Zonos\TTSController as ZonosTTSController;
use App\Http\Controllers\Zonos\VoiceCreationController as ZonosVoiceCreationController;
use App\Http\Controllers\Zonos\VoiceCloneController as ZonosVoiceCloneController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Library — shared across all TTS providers
    Route::get('/library', [LibraryController::class, 'index'])->name('library');

    // Coqui TTS & Voice Clone
    Route::prefix('coqui')->name('coqui.')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/tts', [TTSController::class, 'index'])->name('tts');
        Route::post('/tts', [TTSController::class, 'store'])->name('tts.store');
        Route::get('/voice-clone', [VoiceCloneController::class, 'index'])->name('voice-clone');
        Route::post('/voice-clone', [VoiceCloneController::class, 'store'])->name('voice-clone.store');
    });

    // Zonos TTS, Voice Creation & Voice Clone
    Route::prefix('zonos')->name('zonos.')->group(function () {
        Route::get('/', [ZonosDashboardController::class, 'index'])->name('dashboard');
        Route::get('/tts', [ZonosTTSController::class, 'index'])->name('tts');
        Route::post('/tts', [ZonosTTSController::class, 'store'])->name('tts.store');
        Route::get('/voice-creation', [ZonosVoiceCreationController::class, 'index'])->name('voice-creation');
        Route::post('/voice-creation', [ZonosVoiceCreationController::class, 'store'])->name('voice-creation.store');
        Route::get('/voice-clone', [ZonosVoiceCloneController::class, 'index'])->name('voice-clone');
        Route::post('/voice-clone', [ZonosVoiceCloneController::class, 'store'])->name('voice-clone.store');
    });
});

// RunPod webhook — no session auth, validated by job ID lookup
Route::post('/api/runpod/webhook', [RunPodWebhookController::class, 'handle'])
    ->name('runpod.webhook');

require __DIR__.'/settings.php';
