import { useForm } from '@inertiajs/react';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ColdStartNotice } from '@/components/cold-start-notice';
import InputError from '@/components/input-error';
import { ProcessStatusCard } from '@/components/process-status-card';
import { WavFileUploader } from '@/components/wav-file-uploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import zonos from '@/routes/zonos';
import type { BreadcrumbItem } from '@/types';
import type { ProcessStatus, RunPodHealth } from '@/types/process';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Zonos', href: '/zonos' },
    { title: 'Voice Creation', href: zonos.voiceCreation.url() },
];

interface Props {
    runpod_health: RunPodHealth;
    upload_limits: {
        max_size_kb: number;
        max_duration_seconds: number;
    };
    initial_process_status?: ProcessStatus | null;
}

export default function ZonosVoiceCreationPage({ runpod_health, upload_limits, initial_process_status }: Props) {
    const { props } = usePage<{ flash?: { voice_id?: number }; debug?: boolean }>();
    const voiceId = props.flash?.voice_id ?? null;
    const debugMode = props.debug ?? false;

    const [wavFile, setWavFile] = useState<File[]>([]);

    const { data, setData, post, processing, errors } = useForm<{
        name: string;
        file: File | null;
    }>({
        name: '',
        file: null,
    });

    const handleFileChange = (files: File[]) => {
        setWavFile(files);
        setData('file', files[0] ?? null);
    };

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(zonos.voiceCreation.store.url(), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const isColdStart =
        (runpod_health.workers?.running ?? 0) + (runpod_health.workers?.idle ?? 0) === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Zonos Voice Creation" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
                <div>
                    <h1 className="text-2xl font-bold">Voice Creation</h1>
                    <p className="text-muted-foreground">
                        Upload a reference audio file to create a reusable voice for cloning.
                    </p>
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    <strong>Note:</strong> Created voices are stored on the RunPod server and require a network volume
                    to persist between sessions.
                </div>

                {isColdStart && <ColdStartNotice />}

                <Card>
                    <CardHeader>
                        <CardTitle>Create a Voice</CardTitle>
                        <CardDescription>
                            Upload a .wav file (max {upload_limits.max_duration_seconds}s) and give the voice a name.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="voice-name">Voice Name</Label>
                                <Input
                                    id="voice-name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    disabled={processing}
                                    placeholder="e.g. My Voice, Deep Narrator…"
                                    maxLength={100}
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label>Reference Audio File</Label>
                                <WavFileUploader
                                    onChange={handleFileChange}
                                    maxFiles={1}
                                    maxSizeKb={upload_limits.max_size_kb}
                                    disabled={processing}
                                />
                                <InputError message={errors.file} />
                            </div>

                            <Button
                                type="submit"
                                disabled={processing || !data.name || wavFile.length === 0}
                            >
                                {processing ? 'Uploading & creating…' : 'Create Voice'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {voiceId && (
                    <ProcessStatusCard
                        processId={voiceId}
                        processType="zonos-voice"
                        initialStatus={initial_process_status ?? 'pending'}
                        runpodHealth={runpod_health}
                        debugMode={debugMode}
                    />
                )}
            </div>
        </AppLayout>
    );
}
