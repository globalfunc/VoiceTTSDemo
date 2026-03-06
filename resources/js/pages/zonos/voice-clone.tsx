import { useForm } from '@inertiajs/react';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ColdStartNotice } from '@/components/cold-start-notice';
import InputError from '@/components/input-error';
import { ProcessStatusCard } from '@/components/process-status-card';
import { ZonosVoiceSettings, ZONOS_VOICE_SETTINGS_DEFAULTS } from '@/components/zonos-voice-settings';
import type { ZonosVoiceSettingsValue } from '@/components/zonos-voice-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import zonos from '@/routes/zonos';
import type { BreadcrumbItem } from '@/types';
import type { ProcessStatus, RunPodHealth } from '@/types/process';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Zonos', href: '/zonos' },
    { title: 'Voice Clone', href: zonos.voiceClone.url() },
];

const MAX_CHARS = 1000;

interface ZonosVoice {
    id: number;
    name: string;
    runpod_voice_id: string;
    created_at: string;
}

interface Props {
    languages: Record<string, string>;
    voices: ZonosVoice[];
    runpod_health: RunPodHealth;
    initial_process_status?: ProcessStatus | null;
}

export default function ZonosVoiceClonePage({ languages, voices, runpod_health, initial_process_status }: Props) {
    const { props } = usePage<{ flash?: { process_id?: number }; debug?: boolean }>();
    const processId = props.flash?.process_id ?? null;
    const debugMode = props.debug ?? false;

    const [voiceSettings, setVoiceSettings] = useState<ZonosVoiceSettingsValue>(ZONOS_VOICE_SETTINGS_DEFAULTS);

    const { data, setData, post, processing, errors } = useForm({
        language: '',
        text: '',
        voice_id: '',
        speed: 1.0,
        emotion: ZONOS_VOICE_SETTINGS_DEFAULTS.emotion,
    });

    const charCount = data.text.length;
    const atLimit = charCount >= MAX_CHARS;

    const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (atLimit && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    };

    const handleVoiceSettingsChange = (v: ZonosVoiceSettingsValue) => {
        setVoiceSettings(v);
        setData((prev) => ({ ...prev, speed: v.speed, emotion: v.emotion }));
    };

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(zonos.voiceClone.store.url(), { preserveScroll: true });
    };

    const isColdStart =
        (runpod_health.workers?.running ?? 0) + (runpod_health.workers?.idle ?? 0) === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Zonos Voice Clone" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
                <div>
                    <h1 className="text-2xl font-bold">Voice Clone</h1>
                    <p className="text-muted-foreground">
                        Generate speech using a previously created voice.
                    </p>
                </div>

                {isColdStart && <ColdStartNotice />}

                {voices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12">
                        <p className="text-muted-foreground text-sm text-center">
                            You don't have any completed voices yet.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={zonos.voiceCreation.url()}>Create a Voice</Link>
                        </Button>
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate with Voice Clone</CardTitle>
                            <CardDescription>
                                Select a saved voice, enter your text, and adjust voice settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="voice">Voice</Label>
                                    <Select
                                        value={data.voice_id}
                                        onValueChange={(v) => setData('voice_id', v)}
                                        disabled={processing}
                                    >
                                        <SelectTrigger id="voice">
                                            <SelectValue placeholder="Select a voice…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {voices.map((v) => (
                                                <SelectItem key={v.id} value={String(v.id)}>
                                                    {v.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.voice_id} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="language">Language</Label>
                                    <Select
                                        value={data.language}
                                        onValueChange={(v) => setData('language', v)}
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
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="text">Text to Synthesize</Label>
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
                                        placeholder="Enter the text to speak in the cloned voice…"
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                    />
                                    <InputError message={errors.text} />
                                </div>

                                <ZonosVoiceSettings
                                    value={voiceSettings}
                                    onChange={handleVoiceSettingsChange}
                                    disabled={processing}
                                />

                                <Button
                                    type="submit"
                                    disabled={processing || !data.voice_id || !data.language || !data.text}
                                >
                                    {processing ? 'Submitting…' : 'Generate with Voice Clone'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {processId && (
                    <ProcessStatusCard
                        processId={processId}
                        processType="zonos-tts"
                        initialStatus={initial_process_status ?? 'pending'}
                        runpodHealth={runpod_health}
                        debugMode={debugMode}
                    />
                )}
            </div>
        </AppLayout>
    );
}
