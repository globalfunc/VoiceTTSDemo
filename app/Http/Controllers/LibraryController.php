<?php

namespace App\Http\Controllers;

use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Models\ZonosTTSProcess;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class LibraryController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $type = $request->query('type');      // 'tts' | 'vc' | null
        $status = $request->query('status');   // 'completed' | 'failed' etc
        $perPage = 20;

        $ttsQuery = TTSProcess::where('user_id', $userId)
            ->with(['storedFiles' => fn ($q) => $q->where('type', 'output')]);

        $vcQuery = VoiceCloneProcess::where('user_id', $userId)
            ->with(['storedFiles' => fn ($q) => $q->where('type', 'output')]);

        $zonosTtsQuery = ZonosTTSProcess::where('user_id', $userId)
            ->with(['storedFiles' => fn ($q) => $q->where('type', 'output')]);

        if ($status) {
            $ttsQuery->where('status', $status);
            $vcQuery->where('status', $status);
            $zonosTtsQuery->where('status', $status);
        }

        // Combine and sort by created_at desc, then paginate
        $items = collect();

        if (! $type || $type === 'tts') {
            $items = $items->concat(
                $ttsQuery->get()->map(fn ($p) => array_merge($p->toArray(), ['process_type' => 'tts']))
            );
        }

        if (! $type || $type === 'vc') {
            $items = $items->concat(
                $vcQuery->get()->map(fn ($p) => array_merge($p->toArray(), ['process_type' => 'vc']))
            );
        }

        if (! $type || $type === 'zonos-tts') {
            $items = $items->concat(
                $zonosTtsQuery->get()->map(fn ($p) => array_merge($p->toArray(), ['process_type' => 'zonos-tts']))
            );
        }

        $sorted = $items->sortByDesc('created_at')->values();

        // Manual pagination
        $page = (int) $request->query('page', 1);
        $total = $sorted->count();
        $paginated = $sorted->forPage($page, $perPage)->values();

        return Inertia::render('library', [
            'items' => $paginated,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
            ],
            'filters' => compact('type', 'status'),
        ]);
    }
}
