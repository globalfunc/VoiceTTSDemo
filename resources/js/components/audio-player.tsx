import { useRef } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { Download, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
    url: string;
    fileName?: string;
}

export function AudioPlayer({ url, fileName = 'output.wav' }: AudioPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const { wavesurfer, isPlaying, isReady } = useWavesurfer({
        container: containerRef,
        url,
        waveColor: 'rgb(99, 102, 241)',
        progressColor: 'rgb(55, 48, 163)',
        height: 64,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
    });

    const togglePlay = () => {
        wavesurfer?.playPause();
    };

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <div ref={containerRef} className="w-full" />
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlay}
                    disabled={!isReady}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button variant="outline" size="sm" asChild>
                    <a href={url} download={fileName}>
                        <Download className="h-4 w-4" />
                        Download
                    </a>
                </Button>
            </div>
        </div>
    );
}
