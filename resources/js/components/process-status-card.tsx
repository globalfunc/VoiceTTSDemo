import { AudioPlayer } from '@/components/audio-player';
import { ColdStartNotice } from '@/components/cold-start-notice';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useProcessStatus } from '@/hooks/use-process-status';
import type { ProcessType } from '@/hooks/use-process-status';
import type { ProcessStatus, RunPodHealth } from '@/types/process';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface ProcessStatusCardProps {
    processId: number;
    processType: ProcessType;
    initialStatus?: ProcessStatus;
    runpodHealth?: RunPodHealth;
    debugMode?: boolean;
}

const STATUS_LABELS: Record<ProcessStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    timeout: 'Timed out',
};

const STATUS_VARIANTS: Record<ProcessStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    processing: 'secondary',
    completed: 'default',
    failed: 'destructive',
    timeout: 'destructive',
};

export function ProcessStatusCard({
    processId,
    processType,
    initialStatus = 'pending',
    runpodHealth,
    debugMode = false,
}: ProcessStatusCardProps) {
    const { status, outputUrl, error, message, debugPayload } = useProcessStatus(processId, processType, initialStatus);

    const isColdStart =
        (status === 'pending' || status === 'processing') &&
        runpodHealth &&
        (runpodHealth.workers?.running ?? 0) + (runpodHealth.workers?.idle ?? 0) === 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Generation Status</CardTitle>
                <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {isColdStart && <ColdStartNotice />}

                {(status === 'pending' || status === 'processing') && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="h-4 w-4" />
                        <span>
                            {status === 'pending' ? 'Queued — waiting to start…' : 'Generating audio…'}
                        </span>
                    </div>
                )}

                {status === 'completed' && outputUrl && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{message ?? 'Generation complete'}</span>
                        </div>
                        <AudioPlayer url={outputUrl} />
                    </div>
                )}

                {status === 'failed' && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Generation failed</AlertTitle>
                        <AlertDescription>
                            {message ?? error ?? 'An unexpected error occurred.'}
                            <p className="mt-1 text-xs">Try again with a different model or shorter text.</p>
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'timeout' && (
                    <Alert variant="destructive">
                        <Clock className="h-4 w-4" />
                        <AlertTitle>Request timed out</AlertTitle>
                        <AlertDescription>
                            The generation took too long to complete. This may happen during cold starts.
                            <p className="mt-1 text-xs">Please try again — the server should be warmed up now.</p>
                        </AlertDescription>
                    </Alert>
                )}

                {debugMode && debugPayload && (
                    <details className="mt-2 rounded-md border border-dashed border-muted-foreground/40">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground select-none">
                            Debug — API response payload
                        </summary>
                        <pre className="overflow-x-auto px-3 pb-3 pt-1 text-xs text-muted-foreground">
                            {JSON.stringify(debugPayload, null, 2)}
                        </pre>
                    </details>
                )}
            </CardContent>
        </Card>
    );
}
