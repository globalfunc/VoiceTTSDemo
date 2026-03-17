import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface MicRecorderDialogProps {
    onRecorded: (file: File) => void;
    disabled?: boolean;
    maxSeconds?: number;
}

type RecorderState = 'idle' | 'recording' | 'processing';

function encodeWav(channelData: Float32Array[], sampleRate: number): ArrayBuffer {
    const numChannels = channelData.length;
    const numSamples = channelData[0].length;
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);        // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const s = Math.max(-1, Math.min(1, channelData[ch][i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            offset += 2;
        }
    }

    return buffer;
}

export function MicRecorderDialog({ onRecorded, disabled = false, maxSeconds = 20 }: MicRecorderDialogProps) {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<RecorderState>('idle');
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (autoStopRef.current) {
            clearTimeout(autoStopRef.current);
            autoStopRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
    }, []);

    useEffect(() => {
        if (!open) {
            cleanup();
            setState('idle');
            setSeconds(0);
            setError(null);
        }
    }, [open, cleanup]);

    const processAndDeliver = useCallback(
        async (recorder: MediaRecorder) => {
            try {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                const arrayBuffer = await blob.arrayBuffer();
                const audioCtx = new AudioContext();
                const decoded = await audioCtx.decodeAudioData(arrayBuffer);
                await audioCtx.close();

                const channels: Float32Array[] = [];
                for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
                    channels.push(decoded.getChannelData(ch));
                }

                const wavBuffer = encodeWav(channels, decoded.sampleRate);
                const wavFile = new File([wavBuffer], `recording-${Date.now()}.wav`, { type: 'audio/wav' });

                cleanup();
                onRecorded(wavFile);
                setOpen(false);
            } catch {
                setError('Failed to process recording. Please try again.');
                setState('idle');
                cleanup();
            }
        },
        [cleanup, onRecorded],
    );

    const stopRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;

        setState('processing');
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (autoStopRef.current) {
            clearTimeout(autoStopRef.current);
            autoStopRef.current = null;
        }

        recorder.onstop = () => processAndDeliver(recorder);
        recorder.stop();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, [processAndDeliver]);

    const startRecording = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : '';

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.start(100);
            setState('recording');
            setSeconds(0);

            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

            // Auto-stop at limit
            autoStopRef.current = setTimeout(() => {
                stopRecording();
            }, maxSeconds * 1000);
        } catch {
            setError('Microphone access denied or unavailable.');
        }
    }, [maxSeconds, stopRecording]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const remaining = maxSeconds - seconds;
    const nearLimit = remaining <= 5;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={disabled} className="gap-2">
                    <Mic className="h-4 w-4" />
                    Use your voice
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Record your voice</DialogTitle>
                    <DialogDescription>
                        Click Start to record, then Stop when done. Maximum {maxSeconds} seconds. The recording will be saved as a .wav file.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    {state === 'recording' && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                                <span className="text-sm font-medium text-red-600 dark:text-red-400">Recording</span>
                            </div>
                            <span className={`font-mono text-3xl font-semibold tabular-nums ${nearLimit ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {formatTime(seconds)}
                            </span>
                            <span className={`text-xs ${nearLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {remaining}s remaining
                            </span>
                        </div>
                    )}

                    {state === 'processing' && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Processing audio…</span>
                        </div>
                    )}

                    {state === 'idle' && (
                        <p className="text-sm text-muted-foreground">Ready to record.</p>
                    )}

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <div className="flex gap-3">
                        {state === 'idle' && (
                            <Button type="button" onClick={startRecording} className="gap-2">
                                <Mic className="h-4 w-4" />
                                Start recording
                            </Button>
                        )}
                        {state === 'recording' && (
                            <Button type="button" variant="destructive" onClick={stopRecording} className="gap-2">
                                <Square className="h-4 w-4" />
                                Stop recording
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
