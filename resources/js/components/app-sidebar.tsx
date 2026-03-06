import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, Library, Mic, Mic2, Sparkles, WandSparkles } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavGroup } from '@/components/nav-group';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import coqui from '@/routes/coqui';
import zonos from '@/routes/zonos';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Library',
        href: '/library',
        icon: Library,
    },
];

const coquiNavItems: NavItem[] = [
    {
        title: 'TTS',
        href: coqui.tts.url(),
        icon: Mic,
    },
    {
        title: 'Voice Clone',
        href: coqui.voiceClone.url(),
        icon: Mic2,
    },
];

const zonosNavItems: NavItem[] = [
    {
        title: 'TTS',
        href: zonos.tts.url(),
        icon: Mic,
    },
    {
        title: 'Voice Clone',
        href: zonos.voiceClone.url(),
        icon: Mic2,
    },
    {
        title: 'Voice Creation',
        href: zonos.voiceCreation.url(),
        icon: WandSparkles,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                <NavGroup label="Coqui" icon={Mic} items={coquiNavItems} />
                <NavGroup label="Zonos" icon={Sparkles} items={zonosNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
