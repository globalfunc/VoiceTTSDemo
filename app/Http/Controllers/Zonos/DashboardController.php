<?php

namespace App\Http\Controllers\Zonos;

use App\Http\Controllers\Controller;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $recentTTS = ZonosTTSProcess::where('user_id', $userId)
            ->with(['storedFiles' => fn ($q) => $q->where('type', 'output')])
            ->latest()
            ->take(5)
            ->get();

        $recentVoices = ZonosVoice::where('user_id', $userId)
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('zonos/dashboard', [
            'stats' => [
                'tts_count'   => ZonosTTSProcess::where('user_id', $userId)->count(),
                'voice_count' => ZonosVoice::where('user_id', $userId)->count(),
            ],
            'recent_tts'    => $recentTTS,
            'recent_voices' => $recentVoices,
        ]);
    }
}
