import { Head, Link } from '@inertiajs/react';
import { Mic, Mic2, CheckCircle2, Clock, AlertCircle, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import coqui from '@/routes/coqui';
import type { BreadcrumbItem } from '@/types';
import type { ProcessStatus, TTSProcess, VoiceCloneProcess } from '@/types/process';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Coqui', href: '/coqui' },
];

interface Props {
    stats: { tts_count: number; vc_count: number };
    recent_tts: (TTSProcess & { process_type: 'tts' })[];
    recent_vc: (VoiceCloneProcess & { process_type: 'vc' })[];
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

function ProcessRow({ process, type }: { process: TTSProcess | VoiceCloneProcess; type: 'TTS' | 'VC' }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-2 min-w-0">
                {STATUS_ICONS[process.status]}
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{process.model.split('/').pop()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(process.created_at).toLocaleString()}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">{type}</Badge>
                <Badge variant={STATUS_VARIANTS[process.status]} className="text-xs capitalize">{process.status}</Badge>
            </div>
        </div>
    );
}

export default function CoquiDashboard({ stats, recent_tts, recent_vc }: Props) {
    const recentAll = [...recent_tts.map((p) => ({ ...p, type: 'TTS' as const })), ...recent_vc.map((p) => ({ ...p, type: 'VC' as const }))]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Coqui Dashboard" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
                <div>
                    <h1 className="text-2xl font-bold">Coqui AI</h1>
                    <p className="text-muted-foreground">Text to Speech and Voice Cloning powered by Coqui AI.</p>
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
                            <CardTitle className="text-sm font-medium text-muted-foreground">Voice Clones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.vc_count}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Mic className="h-5 w-5" />
                                <CardTitle className="text-base">Text to Speech</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="mt-auto">
                            <Button asChild className="w-full">
                                <Link href={coqui.tts.url()}>Generate Speech</Link>
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
                                <Link href={coqui.voiceClone.url()}>Clone a Voice</Link>
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
                            {recentAll.map((p) => (
                                <ProcessRow key={`${p.type}-${p.id}`} process={p} type={p.type} />
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
