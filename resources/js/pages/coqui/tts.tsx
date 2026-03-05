import { useForm } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ColdStartNotice } from '@/components/cold-start-notice';
import { ProcessStatusCard } from '@/components/process-status-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import coqui from '@/routes/coqui';
import type { BreadcrumbItem } from '@/types';
import type { ProcessStatus, RunPodHealth } from '@/types/process';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Coqui', href: '/coqui' },
    { title: 'Text to Speech', href: coqui.tts.url() },
];

const MAX_CHARS = 1000;

interface Props {
    languages: Record<string, string>;
    models: Record<string, { tts: string[] }>;
    runpod_health: RunPodHealth;
    initial_process_status?: ProcessStatus | null;
}

export default function TTSPage({ languages, models, runpod_health, initial_process_status }: Props) {
    const { props } = usePage<{ flash?: { process_id?: number }; debug?: boolean }>();
    const processId = props.flash?.process_id ?? null;
    const debugMode = props.debug ?? false;

    const [selectedLanguage, setSelectedLanguage] = useState('');
    const availableModels = selectedLanguage ? (models[selectedLanguage]?.tts ?? []) : [];

    const { data, setData, post, processing, errors } = useForm({
        language: '',
        model: '',
        text: '',
    });

    const charCount = data.text.length;
    const atLimit = charCount >= MAX_CHARS;

    // Prevent typing beyond limit (allow backspace / delete)
    const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (atLimit && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    };

    const handleLanguageChange = (value: string) => {
        setSelectedLanguage(value);
        setData({ ...data, language: value, model: '' });
    };

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(coqui.tts.store.url(), { preserveScroll: true });
    };

    const isColdStart =
        (runpod_health.workers?.running ?? 0) + (runpod_health.workers?.idle ?? 0) === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Generate TTS" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
                <div>
                    <h1 className="text-2xl font-bold">Text to Speech</h1>
                    <p className="text-muted-foreground">Generate speech from text using Coqui TTS models.</p>
                </div>

                {isColdStart && <ColdStartNotice />}

                <Card>
                    <CardHeader>
                        <CardTitle>Generate Speech</CardTitle>
                        <CardDescription>Select a language and model, then enter your text.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="language">Language</Label>
                                <Select
                                    value={data.language}
                                    onValueChange={handleLanguageChange}
                                    disabled={processing}
                                >
                                    <SelectTrigger id="language">
                                        <SelectValue placeholder="Select language…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(languages).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.language} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="model">Model</Label>
                                <Select
                                    value={data.model}
                                    onValueChange={(v) => setData('model', v)}
                                    disabled={!selectedLanguage || processing}
                                >
                                    <SelectTrigger id="model">
                                        <SelectValue placeholder={selectedLanguage ? 'Select model…' : 'Select a language first'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableModels.map((modelId) => (
                                            <SelectItem key={modelId} value={modelId}>
                                                {modelId.split('/').pop()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.model} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="text">Text</Label>
                                    <span className={`text-xs ${atLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                        {charCount}/{MAX_CHARS}
                                    </span>
                                </div>
                                <textarea
                                    id="text"
                                    value={data.text}
                                    onChange={(e) => setData('text', e.target.value)}
                                    onKeyDown={handleTextKeyDown}
                                    disabled={processing}
                                    rows={5}
                                    placeholder="Enter the text you want to convert to speech…"
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                />
                                <InputError message={errors.text} />
                            </div>

                            <Button type="submit" disabled={processing || !data.language || !data.model || !data.text}>
                                {processing ? 'Submitting…' : 'Generate Speech'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {processId && (
                    <ProcessStatusCard
                        processId={processId}
                        processType="tts"
                        initialStatus={initial_process_status ?? 'pending'}
                        runpodHealth={runpod_health}
                        debugMode={debugMode}
                    />
                )}
            </div>
        </AppLayout>
    );
}
