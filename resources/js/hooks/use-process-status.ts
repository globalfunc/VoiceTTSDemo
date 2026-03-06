import { useEffect, useState } from 'react';
import type { ProcessBroadcastPayload, ProcessStatus } from '@/types/process';

export type ProcessType = 'tts' | 'vc' | 'zonos-tts' | 'zonos-voice';

interface ProcessStatusState {
    status: ProcessStatus;
    outputUrl: string | null;
    error: string | null;
    message: string | null;
    debugPayload: Record<string, unknown> | null;
}

const CHANNEL_MAP: Record<ProcessType, string> = {
    tts: 'tts-process',
    vc: 'voice-clone-process',
    'zonos-tts': 'zonos-tts',
    'zonos-voice': 'zonos-voice',
};

const EVENT_MAP: Record<ProcessType, string> = {
    tts: '.TTSProcessUpdated',
    vc: '.VoiceCloneProcessUpdated',
    'zonos-tts': '.ZonosTTSProcessUpdated',
    'zonos-voice': '.ZonosVoiceProcessUpdated',
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
        message: null,
        debugPayload: null,
    });

    useEffect(() => {
        if (!processId || !window.Echo)  {
            console.debug('no process id or no window echo aborting');
            return;
        }

        const channelName = `${CHANNEL_MAP[processType]}.${processId}`;
        console.debug('Listen on private channel', channelName);
        window.Echo.private(channelName).listen(
            EVENT_MAP[processType],
            (payload: ProcessBroadcastPayload) => {
                setState({
                    status: payload.status,
                    outputUrl: payload.output_url,
                    error: payload.error,
                    message: payload.message,
                    debugPayload: payload.debug_payload,
                });
            },
        );

        return () => {
            window.Echo.leave(channelName);
        };
    }, [processId, processType]);

    return state;
}
