import { Head, Link } from '@inertiajs/react';
import { Mic, Mic2, UserPlus, CheckCircle2, Clock, AlertCircle, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import zonos from '@/routes/zonos';
import type { BreadcrumbItem } from '@/types';
import type { ProcessStatus } from '@/types/process';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Zonos', href: '/zonos' },
];

interface ZonosTTSProcess {
    id: number;
    status: ProcessStatus;
    model: string;
    language: string;
    text_to_speech: string;
    created_at: string;
}

interface ZonosVoice {
    id: number;
    name: string;
    status: ProcessStatus;
    created_at: string;
}

interface Props {
    stats: { tts_count: number; voice_count: number };
    recent_tts: ZonosTTSProcess[];
    recent_voices: ZonosVoice[];
}

const STATUS_ICONS: Record<ProcessStatus, React.ReactNode> = {
    pending: <Loader className="h-3.5 w-3.5 animate-spin text-muted-foreground" />,
    processing: <Loader className="h-3.5 w-3.5 animate-spin text-blue-500" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    failed: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
    timeout: <Clock className="h-3.5 w-3.5 text-destructive" />,
};

const STATUS_VARIANTS: Record<ProcessStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    processing: 'secondary',
    completed: 'default',
    failed: 'destructive',
    timeout: 'destructive',
};

export default function ZonosDashboard({ stats, recent_tts, recent_voices }: Props) {
    const recentAll = [
        ...recent_tts.map((p) => ({ id: p.id, label: p.text_to_speech.slice(0, 40), status: p.status, type: 'TTS' as const, created_at: p.created_at })),
        ...recent_voices.map((v) => ({ id: v.id, label: v.name, status: v.status, type: 'Voice' as const, created_at: v.created_at })),
    ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Zonos Dashboard" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
                <div>
                    <h1 className="text-2xl font-bold">Zonos</h1>
                    <p className="text-muted-foreground">Text to Speech and Voice Cloning powered by Zonos.</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">TTS Generations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.tts_count}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Created Voices</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.voice_count}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Mic className="h-5 w-5" />
                                <CardTitle className="text-base">Text to Speech</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="mt-auto">
                            <Button asChild className="w-full">
                                <Link href={zonos.tts.url()}>Generate Speech</Link>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                <CardTitle className="text-base">Create Voice</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="mt-auto">
                            <Button asChild className="w-full">
                                <Link href={zonos.voiceCreation.url()}>Create a Voice</Link>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Mic2 className="h-5 w-5" />
                                <CardTitle className="text-base">Voice Clone</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="mt-auto">
                            <Button asChild className="w-full">
                                <Link href={zonos.voiceClone.url()}>Clone a Voice</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent activity */}
                {recentAll.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Recent Activity</CardTitle>
                            <Link href="/library" className="text-xs text-muted-foreground hover:underline">
                                View all
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {recentAll.map((item) => (
                                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {STATUS_ICONS[item.status]}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{item.label}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className="text-xs">{item.type}</Badge>
                                        <Badge variant={STATUS_VARIANTS[item.status]} className="text-xs capitalize">{item.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
