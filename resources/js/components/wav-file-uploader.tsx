import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FileEntry {
    file: File;
    id: string;
    error?: string;
}

interface WavFileUploaderProps {
    onChange: (files: File[]) => void;
    maxFiles?: number;
    maxSizeKb?: number;
    disabled?: boolean;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WavFileUploader({ onChange, maxFiles = 5, maxSizeKb = 20480, disabled = false }: WavFileUploaderProps) {
    const [entries, setEntries] = useState<FileEntry[]>([]);

    const addFiles = useCallback(
        (newFiles: File[]) => {
            const remaining = maxFiles - entries.length;
            const toAdd = newFiles.slice(0, remaining).map((file) => {
                const error =
                    file.size > maxSizeKb * 1024
                        ? `File exceeds ${maxSizeKb} KB limit`
                        : undefined;
                return { file, id: `${file.name}-${Date.now()}-${Math.random()}`, error };
            });

            const updated = [...entries, ...toAdd];
            setEntries(updated);
            onChange(updated.filter((e) => !e.error).map((e) => e.file));
        },
        [entries, maxFiles, maxSizeKb, onChange],
    );

    const removeFile = useCallback(
        (id: string) => {
            const updated = entries.filter((e) => e.id !== id);
            setEntries(updated);
            onChange(updated.filter((e) => !e.error).map((e) => e.file));
        },
        [entries, onChange],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'audio/wav': ['.wav'] },
        disabled: disabled || entries.length >= maxFiles,
        onDrop: addFiles,
        multiple: true,
    });

    return (
        <div className="flex flex-col gap-3">
            <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
                    isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${disabled || entries.length >= maxFiles ? 'cursor-not-allowed opacity-50' : ''}`}
            >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                    <p className="text-sm font-medium">
                        {isDragActive ? 'Drop .wav files here' : 'Drag & drop .wav files here'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        or click to browse — up to {maxFiles} files, max {maxSizeKb} KB each
                    </p>
                </div>
            </div>

            {entries.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {entries.map(({ file, id, error }) => (
                        <li key={id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                            <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                            </div>
                            {error ? (
                                <Badge variant="destructive" className="shrink-0 text-xs">
                                    {error}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="shrink-0 text-xs">Ready</Badge>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 shrink-0 p-0"
                                onClick={() => removeFile(id)}
                                aria-label={`Remove ${file.name}`}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
