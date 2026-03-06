<?php

use App\Models\TTSProcess;
use App\Models\VoiceCloneProcess;
use App\Models\ZonosTTSProcess;
use App\Models\ZonosVoice;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('tts-process.{processId}', function ($user, int $processId) {
    return TTSProcess::where('id', $processId)->where('user_id', $user->id)->exists();
});

Broadcast::channel('voice-clone-process.{processId}', function ($user, int $processId) {
    return VoiceCloneProcess::where('id', $processId)->where('user_id', $user->id)->exists();
});

Broadcast::channel('zonos-tts.{processId}', function ($user, int $processId) {
    return ZonosTTSProcess::where('id', $processId)->where('user_id', $user->id)->exists();
});

Broadcast::channel('zonos-voice.{voiceId}', function ($user, int $voiceId) {
    return ZonosVoice::where('id', $voiceId)->where('user_id', $user->id)->exists();
});
