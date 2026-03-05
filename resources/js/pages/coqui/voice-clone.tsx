import { useForm } from '@inertiajs/react';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ColdStartNotice } from '@/components/cold-start-notice';
import InputError from '@/components/input-error';
import { ProcessStatusCard } from '@/components/process-status-card';
import { WavFileUploader } from '@/components/wav-file-uploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import coqui from '@/routes/coqui';
import type { BreadcrumbItem } from '@/types';
import type { RunPodHealth } from '@/types/process';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Coqui', href: '/coqui' },
    { title: 'Voice Clone', href: coqui.voiceClone.url() },
];

const MAX_CHARS = 1000;

interface VCModel {
    id: string;
    name: string;
    supports_cloning: boolean;
    supported_languages: string[];
}

interface Props {
    vc_models: VCModel[];
    vc_languages: Record<string, string>;
    runpod_health: RunPodHealth;
    upload_limits: {
        max_size_kb: number;
        max_duration_seconds: number;
        max_files: number;
    };
}

export default function VoiceClonePage({ vc_models, vc_languages, runpod_health, upload_limits }: Props) {
    const { props } = usePage<{ flash?: { process_id?: number } }>();
    const processId = props.flash?.process_id ?? null;

    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [wavFiles, setWavFiles] = useState<File[]>([]);

    const availableModels = selectedLanguage
        ? vc_models.filter((m) => m.supported_languages.includes(selectedLanguage))
        : vc_models;

    const { data, setData, post, processing, errors } = useForm<{
        language: string;
        model: string;
        text: string;
        files: File[];
    }>({
        language: '',
        model: '',
        text: '',
        files: [],
    });

    const charCount = data.text.length;
    const atLimit = charCount >= MAX_CHARS;

    const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (atLimit && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    };

    const handleLanguageChange = (value: string) => {
        setSelectedLanguage(value);
        setData({ ...data, language: value, model: '' });
    };

    const handleFilesChange = (files: File[]) => {
        setWavFiles(files);
        setData('files', files);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(coqui.voiceClone.post.url(), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const isColdStart =
        (runpod_health.workers?.running ?? 0) + (runpod_health.workers?.idle ?? 0) === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Voice Clone" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
                <div>
                    <h1 className="text-2xl font-bold">Voice Clone</h1>
                    <p className="text-muted-foreground">
                        Upload reference audio samples and generate speech in the cloned voice.
                    </p>
                </div>

                {isColdStart && <ColdStartNotice />}

                <Card>
                    <CardHeader>
                        <CardTitle>Generate Voice Clone</CardTitle>
                        <CardDescription>
                            Upload up to {upload_limits.max_files} .wav files (max {upload_limits.max_duration_seconds}s each) and
                            enter the text to synthesize.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="vc-language">Language</Label>
                                <Select value={data.language} onValueChange={handleLanguageChange} disabled={processing}>
                                    <SelectTrigger id="vc-language">
                                        <SelectValue placeholder="Select language…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(vc_languages).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.language} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="vc-model">Voice Clone Model</Label>
                                <Select
                                    value={data.model}
                                    onValueChange={(v) => setData('model', v)}
                                    disabled={processing}
                                >
                                    <SelectTrigger id="vc-model">
                                        <SelectValue placeholder="Select model…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableModels.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.model} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label>Reference Audio Files</Label>
                                <WavFileUploader
                                    onChange={handleFilesChange}
                                    maxFiles={upload_limits.max_files}
                                    maxSizeKb={upload_limits.max_size_kb}
                                    disabled={processing}
                                />
                                {errors.files && (
                                    <div className="flex flex-col gap-1">
                                        {Array.isArray(errors.files)
                                            ? errors.files.map((e, i) => <InputError key={i} message={e} />)
                                            : <InputError message={errors.files} />
                                        }
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="vc-text">Text to Synthesize</Label>
                                    <span className={`text-xs ${atLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                        {charCount}/{MAX_CHARS}
                                    </span>
                                </div>
                                <textarea
                                    id="vc-text"
                                    value={data.text}
                                    onChange={(e) => setData('text', e.target.value)}
                                    onKeyDown={handleTextKeyDown}
                                    disabled={processing}
                                    rows={5}
                                    placeholder="Enter the text to speak in the cloned voice…"
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                />
                                <InputError message={errors.text} />
                            </div>

                            <Button
                                type="submit"
                                disabled={processing || !data.language || !data.model || !data.text || wavFiles.length === 0}
                            >
                                {processing ? 'Uploading & submitting…' : 'Generate Voice Clone'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {processId && (
                    <ProcessStatusCard
                        processId={processId}
                        processType="vc"
                        initialStatus="pending"
                        runpodHealth={runpod_health}
                    />
                )}
            </div>
        </AppLayout>
    );
}
