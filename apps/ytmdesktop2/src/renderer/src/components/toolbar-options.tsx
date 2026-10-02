import { AlertCircleIcon, CheckIcon, DownloadIcon, TimerIcon } from "lucide-react";
import DevIcon from "@/assets/icons/chip.svg?react";
import RPCIcon from "@/assets/icons/discord-rpc.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import LastFMIcon from "@/assets/icons/lastfm.svg?react";
import RefreshIcon from "@/assets/icons/refresh.svg?react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useDiscord } from "@/hooks/use-discord";
import { useLastFm } from "@/hooks/use-lastfm";
import { useNavigation } from "@/hooks/use-navigation";
import { useSettingsState } from "@/hooks/use-settings";
import { useUpdater } from "@/hooks/use-updater";
import { trpc } from "@/lib/trpc";

export function ToolbarOptions() {
	const { lastFM, lastFMState, lastFMLoading, authorizeLastFM } = useLastFm();
	const { connected: discordConnected, loading: discordLoading, error: discordConnectionError, enabled: discordEnabled, toggle: toggleDiscord } = useDiscord();
	const { isHome, home, devTools } = useNavigation();
	const { updateInfo, downloaded: updateDownloaded, checking: updateChecking, status, check } = useUpdater();
	const [isDev] = useSettingsState<boolean>("app.enableDev", false);
	const { mutateAsync: openWindow } = trpc.app.openWindow.useMutation();

	const { data: sleepState, refetch: refetchSleep } = trpc.sleepTimer.state.useQuery(undefined, {
		refetchInterval: (data) => (data?.active ? 1000 : false),
	});
	const { mutateAsync: setTimer } = trpc.sleepTimer.set.useMutation({
		onSuccess: () => void refetchSleep(),
	});
	const { mutateAsync: cancelTimer } = trpc.sleepTimer.cancel.useMutation({
		onSuccess: () => void refetchSleep(),
	});

	return (
		<div className="flex flex-row items-center gap-2">
			{/* Nút Hẹn giờ tắt nhạc (Sleep Timer) */}
			<Popover>
				<PopoverTrigger
					className={`control-button relative h-4 flex items-center gap-1.5 px-1.5 !w-auto cursor-pointer ${
						sleepState?.active ? "text-amber-400 bg-amber-500/15 rounded" : ""
					}`}
					title="Hẹn giờ tắt nhạc (Sleep Timer)"
				>
					<TimerIcon className="size-3.5" />
					{sleepState?.active && (
						<span className="text-[11px] font-mono font-medium">
							{sleepState.trackEnd
								? "Hết bài"
								: `${Math.floor(sleepState.remainingSeconds / 60)}:${(sleepState.remainingSeconds % 60).toString().padStart(2, "0")}`}
						</span>
					)}
				</PopoverTrigger>
				<PopoverContent className="w-56 p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white shadow-xl">
					<div className="font-semibold text-xs mb-2 flex items-center justify-between">
						<span>⏰ Hẹn giờ tắt nhạc</span>
						{sleepState?.active && (
							<span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">
								Đang đếm
							</span>
						)}
					</div>
					<div className="grid grid-cols-2 gap-1.5 mb-2.5">
						<button
							type="button"
							onClick={() => void setTimer({ trackEnd: true })}
							className="px-2 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-left cursor-pointer transition-colors"
						>
							Hết bài hiện tại
						</button>
						<button
							type="button"
							onClick={() => void setTimer({ durationMinutes: 15 })}
							className="px-2 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-left cursor-pointer transition-colors"
						>
							15 phút
						</button>
						<button
							type="button"
							onClick={() => void setTimer({ durationMinutes: 30 })}
							className="px-2 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-left cursor-pointer transition-colors"
						>
							30 phút
						</button>
						<button
							type="button"
							onClick={() => void setTimer({ durationMinutes: 45 })}
							className="px-2 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-left cursor-pointer transition-colors"
						>
							45 phút
						</button>
						<button
							type="button"
							onClick={() => void setTimer({ durationMinutes: 60 })}
							className="col-span-2 px-2 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-left cursor-pointer transition-colors"
						>
							1 giờ (60 phút)
						</button>
					</div>
					{sleepState?.active && (
						<button
							type="button"
							onClick={() => void cancelTimer()}
							className="w-full py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 text-center font-medium cursor-pointer transition-colors"
						>
							Hủy hẹn giờ
						</button>
					)}
				</PopoverContent>
			</Popover>
			<button
				type="button"
				className={`control-button relative h-4 ${lastFMLoading ? "opacity-70" : ""} ${lastFM?.name ? "!w-auto flex gap-2.5 items-center px-1.5" : "w-4"}`}
				onClick={authorizeLastFM}
			>
				{lastFM?.connected && !lastFM?.error && lastFMState !== null ? (
					typeof lastFMState === "string" ? (
						<Spinner className="size-3" />
					) : lastFMState === true ? (
						<CheckIcon className="text-green-500" />
					) : (
						<AlertCircleIcon className="text-red-500" />
					)
				) : (
					<LastFMIcon className={lastFM?.connected && !lastFM?.error ? "text-green-500" : lastFM?.error ? "text-red-500" : undefined} />
				)}
				{lastFM?.name && <span className="text-sm text-gray-100">{lastFM.name}</span>}
			</button>
			{!isHome && (
				<button type="button" className="control-button relative size-4" onClick={() => void home()}>
					<HomeIcon />
				</button>
			)}
			<button type="button" className="control-button relative size-4" disabled={!!updateChecking} onClick={() => void check()}>
				{status === "checking" && !updateInfo ? (
					<Spinner className="size-3" />
				) : updateInfo ? (
					<DownloadIcon className={status === "ready" || updateDownloaded ? "text-green-500" : "animate-pulse"} />
				) : (
					<RefreshIcon />
				)}
			</button>
			{isDev && (
				<button type="button" className="control-button relative size-4" onClick={() => void devTools()}>
					<DevIcon />
				</button>
			)}
			<button type="button" className="control-button relative" onClick={toggleDiscord}>
				<RPCIcon
					className={
						discordConnectionError && discordEnabled
							? "text-red-500"
							: discordEnabled || discordConnectionError
								? "opacity-100"
								: "opacity-70"
					}
				/>
				{discordConnected && !discordConnectionError && !discordLoading && (
					<div className="absolute top-0 right-0 flex size-3 items-center justify-center rounded-full bg-green-500 p-0.5">
						<svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
				)}
				{discordLoading && (
					<div className="absolute top-0 right-0 flex size-3 items-center justify-center rounded-full bg-gray-600 p-0.5">
						<Spinner className="size-2" />
					</div>
				)}
			</button>
			<button type="button" className="control-button" onClick={() => void openWindow("settingsWindow")}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
					<path
						fillRule="evenodd"
						d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
						clipRule="evenodd"
					/>
				</svg>
			</button>
		</div>
	);
}
