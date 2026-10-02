import {
	RiAlbumLine,
	RiArrowRightSLine,
	RiChatQuoteLine,
	RiCodeSSlashLine,
	RiComputerLine,
	RiDashboardLine,
	RiDiscordLine,
	RiGithubFill,
	RiGlobalLine,
	RiInformationLine,
	RiKey2Line,
	RiLiveLine,
	RiMusic2Line,
	RiPaletteLine,
	RiQrCodeLine,
	RiServerLine,
	RiSettings3Line,
	RiShieldKeyholeLine,
} from "@remixicon/react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ComponentType, type CSSProperties, memo, Suspense, useEffect, useState } from "react";
import LogoIcon from "@/assets/logo.svg?react";
import { ControlBar } from "@/components/control-bar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarSeparator,
} from "@/components/ui/sidebar";
import { SpinnerPage } from "@/components/ui/spinner";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_settings")({
	component: SettingsLayout,
});

const socials = [
	{ href: "https://github.com/phanhuynh2606/ytmusic-desktop", label: "GitHub", icon: RiGithubFill },
	{ href: "https://youtube-music.app", label: "Website", icon: RiGlobalLine },
] as const;

type SettingsTabTo =
	| "/"
	| "/discord"
	| "/lastfm"
	| "/about"
	| "/player/general"
	| "/player/lyrics"
	| "/api-integrations/api"
	| "/api-integrations/authentication"
	| "/api-integrations/remote"
	| "/api-integrations/streamdeck"
	| "/api-integrations/obs"
	| "/appearance/themes"
	| "/appearance/display";

/** Avoid Link+useRender compose — breaks first click with hash history. */
const SettingsNavItem = memo(function SettingsNavItem({
	to,
	label,
	icon: Icon,
}: {
	to: SettingsTabTo;
	label: string;
	icon: ComponentType<{ className?: string }>;
}) {
	const navigate = useNavigate();
	const isActive = useRouterState({
		select: (s) => s.location.pathname === to,
	});

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				isActive={isActive}
				onClick={() => {
					if (isActive) return;
					void navigate({ to });
				}}
			>
				<Icon />
				<span>{label}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
});

const SettingsNavSubItem = memo(function SettingsNavSubItem({
	to,
	label,
	icon: Icon,
}: {
	to: SettingsTabTo;
	label: string;
	icon: ComponentType<{ className?: string }>;
}) {
	const navigate = useNavigate();
	const isActive = useRouterState({
		select: (s) => s.location.pathname === to,
	});

	return (
		<SidebarMenuSubItem>
			<SidebarMenuSubButton
				isActive={isActive}
				onClick={() => {
					if (isActive) return;
					void navigate({ to });
				}}
			>
				<Icon />
				<span>{label}</span>
			</SidebarMenuSubButton>
		</SidebarMenuSubItem>
	);
});

const PlayerNav = memo(function PlayerNav() {
	const { t } = useTranslation();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isSectionActive = pathname.startsWith("/player");
	const [open, setOpen] = useState(isSectionActive);

	useEffect(() => {
		if (isSectionActive) setOpen(true);
	}, [isSectionActive]);

	return (
		<SidebarMenuItem>
			<Collapsible open={open} onOpenChange={setOpen} className="group/collapsible w-full">
				<CollapsibleTrigger render={<SidebarMenuButton isActive={isSectionActive} />}>
					<RiMusic2Line />
					<span>{t.sidebar.player}</span>
					<RiArrowRightSLine
						className={cn("ml-auto transition-transform duration-150 ease-out", open && "rotate-90")}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						<SettingsNavSubItem to="/player/general" label={t.sidebar.general} icon={RiMusic2Line} />
						<SettingsNavSubItem to="/player/lyrics" label={t.sidebar.lyrics} icon={RiChatQuoteLine} />
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	);
});

const ApiIntegrationsNav = memo(function ApiIntegrationsNav() {
	const { t } = useTranslation();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isSectionActive = pathname.startsWith("/api-integrations");
	const [open, setOpen] = useState(isSectionActive);

	useEffect(() => {
		if (isSectionActive) setOpen(true);
	}, [isSectionActive]);

	return (
		<SidebarMenuItem>
			<Collapsible open={open} onOpenChange={setOpen} className="group/collapsible w-full">
				<CollapsibleTrigger render={<SidebarMenuButton isActive={isSectionActive} />}>
					<RiShieldKeyholeLine />
					<span>{t.sidebar.apiIntegrations}</span>
					<RiArrowRightSLine
						className={cn("ml-auto transition-transform duration-150 ease-out", open && "rotate-90")}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						<SettingsNavSubItem to="/api-integrations/api" label={t.sidebar.api} icon={RiServerLine} />
						<SettingsNavSubItem to="/api-integrations/authentication" label={t.sidebar.authentication} icon={RiKey2Line} />
						<li className="px-2 pt-2 pb-0.5" aria-hidden>
							<span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{t.sidebar.apiIntegrations}</span>
						</li>
						<SettingsNavSubItem to="/api-integrations/remote" label={t.sidebar.remote} icon={RiQrCodeLine} />
						<SettingsNavSubItem to="/api-integrations/streamdeck" label={t.sidebar.streamDeck} icon={RiDashboardLine} />
						<SettingsNavSubItem to="/api-integrations/obs" label={t.sidebar.obs} icon={RiLiveLine} />
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	);
});

const AppearanceNav = memo(function AppearanceNav() {
	const { t } = useTranslation();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isSectionActive = pathname.startsWith("/appearance");
	const [open, setOpen] = useState(isSectionActive);

	useEffect(() => {
		if (isSectionActive) setOpen(true);
	}, [isSectionActive]);

	return (
		<SidebarMenuItem>
			<Collapsible open={open} onOpenChange={setOpen} className="group/collapsible w-full">
				<CollapsibleTrigger render={<SidebarMenuButton isActive={isSectionActive} />}>
					<RiPaletteLine />
					<span>{t.sidebar.appearance}</span>
					<RiArrowRightSLine
						className={cn("ml-auto transition-transform duration-150 ease-out", open && "rotate-90")}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						<SettingsNavSubItem to="/appearance/themes" label={t.sidebar.themes} icon={RiCodeSSlashLine} />
						<SettingsNavSubItem to="/appearance/display" label={t.sidebar.display} icon={RiComputerLine} />
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	);
});

function SettingsLayout() {
	const { t } = useTranslation();

	useEffect(() => {
		document.title = `${t.appName} - ${t.tray.settings}`;
	}, [t.appName, t.tray.settings]);

	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<div className="absolute inset-0 flex h-full flex-col overflow-hidden bg-background">
			<ControlBar title={t.tray.settings} />
			<SidebarProvider className="min-h-0 flex-1" defaultOpen style={{ "--sidebar-width": "14rem" } as CSSProperties}>
				<Sidebar collapsible="none" className="border-r border-sidebar-border">
					<SidebarHeader className="gap-2 border-b border-sidebar-border p-3">
						<div className="flex items-center gap-2 px-1">
							<LogoIcon className="size-5 shrink-0" />
							<div className="flex min-w-0 flex-col">
								<span className="truncate text-xs font-medium text-sidebar-foreground">{t.appName}</span>
								<span className="truncate text-[10px] text-muted-foreground">{t.tray.settings}</span>
							</div>
						</div>
					</SidebarHeader>
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>{t.sidebar.generic}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu className="flex flex-col gap-1">
									<SettingsNavItem to="/" label={t.sidebar.generic} icon={RiSettings3Line} />
									<PlayerNav />
									<AppearanceNav />
									<SettingsNavItem to="/discord" label={t.sidebar.discord} icon={RiDiscordLine} />
									<SettingsNavItem to="/lastfm" label={t.sidebar.lastfm} icon={RiAlbumLine} />
									<ApiIntegrationsNav />
									<SettingsNavItem to="/about" label={t.sidebar.about} icon={RiInformationLine} />
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
					<SidebarFooter className="gap-y-2 border-t border-sidebar-border py-3 px-0">
						<div className="flex flex-col gap-1 px-3 text-[10px] text-muted-foreground">
							<span>
								v{window.api.version} ({window.app.environment})
							</span>
							<span>{window.app.platform}</span>
						</div>
						<SidebarSeparator className="p-0 m-0" />
						<div className="flex items-center gap-1 px-3">
							{socials.map(({ href, label, icon: Icon }) => (
								<a
									key={href}
									href={href}
									target="_blank"
									rel="noreferrer"
									aria-label={label}
									title={label}
									className={cn(
										"inline-flex size-8 items-center justify-center rounded-md text-muted-foreground",
										"transition-colors duration-150 ease-out hover:bg-sidebar-accent hover:text-sidebar-foreground",
										"active:scale-[0.97]",
									)}
								>
									<Icon className="size-4" />
									<span className="sr-only">{label}</span>
								</a>
							))}
						</div>
					</SidebarFooter>
				</Sidebar>
				<SidebarInset className="min-h-0 overflow-hidden">
					{pathname.startsWith("/api-integrations") ? (
						<Outlet />
					) : (
						<ScrollArea className="h-full">
							<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 pb-32">
								<Suspense key={pathname} fallback={<SpinnerPage />}>
									<Outlet />
								</Suspense>
							</div>
						</ScrollArea>
					)}
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
