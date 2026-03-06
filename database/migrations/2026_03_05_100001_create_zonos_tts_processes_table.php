<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zonos_tts_processes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('model')->default('Zonos v0.1');
            $table->string('language');
            $table->string('status')->default('pending');
            $table->text('text_to_speech');
            $table->float('speed')->default(1.0);
            $table->json('emotion')->nullable();
            $table->string('voice_id')->nullable(); // RunPod voice_id for voice-clone TTS
            $table->string('runpod_job_id')->nullable();
            $table->json('json_response')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zonos_tts_processes');
    }
};
