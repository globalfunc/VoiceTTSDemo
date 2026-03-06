import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, Loader } from 'lucide-react';
import { AudioPlayer } from '@/components/audio-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { ProcessStatus, StoredFile, TTSProcess, VoiceCloneProcess } from '@/types/process';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Library', href: '/library' }];

type LibraryItem = (TTSProcess | VoiceCloneProcess) & {
    process_type: 'tts' | 'vc' | 'zonos-tts';
    stored_files: StoredFile[];
};

interface Pagination {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

interface Props {
    items: LibraryItem[];
    pagination: Pagination;
    filters: {
        type: string | null;
        status: string | null;
    };
}

const STATUS_LABELS: Record<ProcessStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    timeout: 'Timed out',
};

const STATUS_ICONS: Record<ProcessStatus, React.ReactNode> = {
    pending: <Loader className="h-4 w-4 animate-spin text-muted-foreground" />,
    processing: <Loader className="h-4 w-4 animate-spin text-blue-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <AlertCircle className="h-4 w-4 text-destructive" />,
    timeout: <Clock className="h-4 w-4 text-destructive" />,
};

const STATUS_VARIANTS: Record<ProcessStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    processing: 'secondary',
    completed: 'default',
    failed: 'destructive',
    timeout: 'destructive',
};

function applyFilter(key: string, value: string | null) {
    router.get('/library', { [key]: value ?? undefined }, { preserveState: true });
}

export default function LibraryPage({ items, pagination, filters }: Props) {
    const outputFiles = (item: LibraryItem) =>
        (item.stored_files ?? []).filter((f) => f.type === 'output');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Library" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Library</h1>
                    <p className="text-muted-foreground">All your TTS and Voice Clone generations.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <Select
                        value={filters.type ?? 'all'}
                        onValueChange={(v) => applyFilter('type', v === 'all' ? null : v)}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="tts">Coqui TTS</SelectItem>
                            <SelectItem value="vc">Coqui Voice Clone</SelectItem>
                            <SelectItem value="zonos-tts">Zonos TTS</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.status ?? 'all'}
                        onValueChange={(v) => applyFilter('status', v === 'all' ? null : v)}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="timeout">Timed out</SelectItem>
                        </SelectContent>
                    </Select>

                    <span className="text-sm text-muted-foreground ml-auto">
                        {pagination.total} item{pagination.total !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Items */}
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16">
                        <p className="text-muted-foreground text-sm">No generations found.</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/coqui/tts">Generate TTS</Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/coqui/voice-clone">Clone a Voice</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {items.map((item) => {
                            const outputs = outputFiles(item);
                            return (
                                <Card key={`${item.process_type}-${item.id}`}>
                                    <CardContent className="flex flex-col gap-3 pt-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {STATUS_ICONS[item.status]}
                                                    <span className="font-medium text-sm">
                                                        {item.model.split('/').pop()}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs uppercase">
                                                        {item.process_type === 'tts' ? 'TTS' : item.process_type === 'vc' ? 'Voice Clone' : 'TTS'}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs uppercase">
                                                        {item.process_type === 'zonos-tts' ? 'Zonos' : 'Coqui'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(item.created_at).toLocaleString()} · {item.language.toUpperCase()}
                                                </p>
                                            </div>
                                            <Badge variant={STATUS_VARIANTS[item.status]} className="shrink-0">
                                                {STATUS_LABELS[item.status]}
                                            </Badge>
                                        </div>

                                        {item.text_to_speech && (
                                            <p className="line-clamp-2 text-sm text-muted-foreground">
                                                "{item.text_to_speech}"
                                            </p>
                                        )}

                                        {outputs.map((file) => (
                                            <AudioPlayer key={file.id} url={file.url} fileName={file.name} />
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page <= 1}
                            onClick={() => applyFilter('page', String(pagination.current_page - 1))}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {pagination.current_page} of {pagination.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => applyFilter('page', String(pagination.current_page + 1))}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
