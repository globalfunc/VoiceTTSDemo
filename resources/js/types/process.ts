export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

export interface StoredFile {
    id: number;
    storage_disk: string;
    storage_path: string;
    name: string;
    type: 'source' | 'output';
    url: string;
    created_at: string;
}

export interface TTSProcess {
    id: number;
    status: ProcessStatus;
    text_to_speech: string;
    model: string;
    language: string;
    runpod_job_id: string | null;
    json_response: Record<string, unknown> | null;
    stored_files?: StoredFile[];
    created_at: string;
    completed_at: string | null;
}

export interface VoiceCloneProcess {
    id: number;
    status: ProcessStatus;
    text_to_speech: string;
    model: string;
    language: string;
    runpod_job_id: string | null;
    json_response: Record<string, unknown> | null;
    stored_files?: StoredFile[];
    created_at: string;
    completed_at: string | null;
}

export interface ProcessBroadcastPayload {
    id: number;
    status: ProcessStatus;
    output_url: string | null;
    error: string | null;
    message: string | null;
    debug_payload: Record<string, unknown> | null;
}

export interface RunPodHealth {
    workers?: { running: number; idle: number };
    jobs?: { inQueue: number; inProgress: number };
}
