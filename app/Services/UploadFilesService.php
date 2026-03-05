<?php

namespace App\Services;

use App\Enums\StoredFileType;
use App\Models\StoredFile;
use FFMpeg\FFMpeg;
use FFMpeg\FFProbe;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadFilesService
{
    private FFProbe $probe;
    private FFMpeg $ffmpeg;

    public function __construct()
    {
        $this->probe = FFProbe::create();
        $this->ffmpeg = FFMpeg::create();
    }

    /**
     * Validate an uploaded wav file against configured constraints.
     * Returns array of error strings, empty if valid.
     */
    public function validate(UploadedFile $file): array
    {
        $errors = [];
        $maxSizeKb = config('coqui.upload_file.validations.max_size_kb');
        $maxDuration = config('coqui.upload_file.validations.max_duration_seconds');

        $fileSizeKb = $file->getSize() / 1024;
        if ($fileSizeKb > $maxSizeKb) {
            $errors[] = "File \"{$file->getClientOriginalName()}\" exceeds maximum size of {$maxSizeKb} KB.";
        }

        try {
            $duration = $this->probe
                ->format($file->getRealPath())
                ->get('duration');

            if ($duration > $maxDuration) {
                $errors[] = "File \"{$file->getClientOriginalName()}\" exceeds maximum duration of {$maxDuration} seconds (got {$duration}s).";
            }
        } catch (\Throwable $e) {
            $errors[] = "Could not read audio duration for \"{$file->getClientOriginalName()}\": {$e->getMessage()}";
        }

        return $errors;
    }

    /**
     * Normalize a wav file using ffmpeg: mono, 22050 Hz, 16-bit PCM.
     * Returns the path to the normalized temp file.
     */
    public function normalize(UploadedFile $file): string
    {
        $tmpDir = sys_get_temp_dir();
        $outputPath = $tmpDir.'/'.Str::uuid().'.wav';

        $audio = $this->ffmpeg->open($file->getRealPath());
        $audio
            ->filters()
            ->custom('-ac 1 -ar 22050 -acodec pcm_s16le');

        $format = new \FFMpeg\Format\Audio\Wav();
        $audio->save($format, $outputPath);

        return $outputPath;
    }

    /**
     * Upload a local file to S3/MinIO and return a StoredFile record.
     * The record is not yet associated with a process — caller must set process_id/process_type.
     */
    public function uploadToS3(string $localPath, string $originalName, StoredFileType $type): StoredFile
    {
        $key = 'uploads/'.Str::uuid().'.wav';
        $disk = 's3';

        Storage::disk($disk)->put($key, file_get_contents($localPath), 'public');

        return new StoredFile([
            'storage_disk' => $disk,
            'storage_path' => $key,
            'name' => $originalName,
            'type' => $type,
        ]);
    }
}
