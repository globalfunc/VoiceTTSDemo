<?php

namespace App\Http\Controllers\Coqui;

use App\Http\Controllers\Controller;
use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $recentTTS = TTSProcess::where('user_id', $userId)
            ->with(['storedFiles' => fn ($q) => $q->where('type', 'output')])
            ->latest()
            ->take(5)
            ->get();

        $recentVC = VoiceCloneProcess::where('user_id', $userId)
            ->with(['storedFiles' => fn ($q) => $q->where('type', 'output')])
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('coqui/dashboard', [
            'stats' => [
                'tts_count' => TTSProcess::where('user_id', $userId)->count(),
                'vc_count' => VoiceCloneProcess::where('user_id', $userId)->count(),
            ],
            'recent_tts' => $recentTTS,
            'recent_vc' => $recentVC,
        ]);
    }
}
