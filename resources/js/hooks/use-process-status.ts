import { useEffect, useState } from 'react';
import type { ProcessBroadcastPayload, ProcessStatus } from '@/types/process';

type ProcessType = 'tts' | 'vc';

interface ProcessStatusState {
    status: ProcessStatus;
    outputUrl: string | null;
    error: string | null;
}

const CHANNEL_MAP: Record<ProcessType, string> = {
    tts: 'tts-process',
    vc: 'voice-clone-process',
};

export function useProcessStatus(
    processId: number | null,
    processType: ProcessType,
    initialStatus: ProcessStatus = 'pending',
): ProcessStatusState {
    const [state, setState] = useState<ProcessStatusState>({
        status: initialStatus,
        outputUrl: null,
        error: null,
    });

    useEffect(() => {
        if (!processId || !window.Echo) return;

        const channelName = `${CHANNEL_MAP[processType]}.${processId}`;

        const channel = window.Echo.private(channelName).listen(
            processType === 'tts' ? '.TTSProcessUpdated' : '.VoiceCloneProcessUpdated',
            (payload: ProcessBroadcastPayload) => {
                setState({
                    status: payload.status,
                    outputUrl: payload.output_url,
                    error: payload.error,
                });
            },
        );

        return () => {
            window.Echo.leave(channelName);
        };
    }, [processId, processType]);

    return state;
}
