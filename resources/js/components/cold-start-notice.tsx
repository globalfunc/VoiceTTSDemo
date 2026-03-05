import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function ColdStartNotice() {
    return (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Warming up GPU</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
                The processing server is starting up. Your first generation may take 1–2 minutes longer than usual.
            </AlertDescription>
        </Alert>
    );
}
