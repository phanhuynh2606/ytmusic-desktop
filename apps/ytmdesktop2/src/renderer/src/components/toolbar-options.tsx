import { AlertCircleIcon, CheckIcon, DownloadIcon, PictureInPicture2, TimerIcon } from "lucide-react";
import DevIcon from "@/assets/icons/chip.svg?react";
import RPCIcon from "@/assets/icons/discord-rpc.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import LastFMIcon from "@/assets/icons/lastfm.svg?react";
import RefreshIcon from "@/assets/icons/refresh.svg?react";
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

	const { data: miniPlayerState, refetch: refetchMiniPlayer } = trpc.miniPlayer.state.useQuery();
	const { mutateAsync: toggleMiniPlayer } = trpc.miniPlayer.toggle.useMutation({
		onSuccess: () => void refetchMiniPlayer(),
	});

	const { mutateAsync: openSleepDialog } = trpc.sleepTimer.openDialog.useMutation();

	return (
		<div className="flex flex-row items-center gap-2">
			{/* Nút Mini Player nổi */}
			<button
				type="button"
				onClick={() => void toggleMiniPlayer()}
				className={`control-button h-4 flex items-center justify-center cursor-pointer ${
					miniPlayerState?.isVisible ? "text-red-400 bg-red-500/15 rounded" : ""
				}`}
				title="Cửa sổ Mini Player nổi (Always-on-top) - Bấm để Bật/Tắt"
			>
				<PictureInPicture2 className="size-3.5" />
			</button>

			{/* Nút Hẹn giờ tắt nhạc (Mở Dialog chọn mốc chuyên nghiệp) */}
			<button
				type="button"
				onClick={() => void openSleepDialog()}
				className={`control-button relative h-4 flex items-center gap-1.5 px-2 !w-auto cursor-pointer transition-colors ${
					sleepState?.active ? "text-amber-400 bg-amber-500/20 rounded" : ""
				}`}
				title={
					sleepState?.active
						? `Đang hẹn giờ: ${
								sleepState.trackEnd
									? "Hết bài hát"
									: `${Math.floor(sleepState.remainingSeconds / 60)}:${(sleepState.remainingSeconds % 60).toString().padStart(2, "0")}`
							} (Bấm để xem chi tiết / đổi mốc / hủy)`
						: "Hẹn giờ tắt nhạc (Sleep Timer) - Bấm để mở bảng chọn mốc"
				}
			>
				<TimerIcon className="size-3.5" />
				{sleepState?.active && (
					<span className="text-[11px] font-mono font-medium">
						{sleepState.trackEnd
							? "Hết bài"
							: `${Math.floor(sleepState.remainingSeconds / 60)}:${(sleepState.remainingSeconds % 60).toString().padStart(2, "0")}`}
					</span>
				)}
			</button>
			{/* Nút Last.fm */}
			<button
				type="button"
				className={`control-button relative h-4 cursor-pointer ${lastFMLoading ? "opacity-70" : ""} ${lastFM?.name ? "!w-auto flex gap-2.5 items-center px-1.5" : "w-4"}`}
				onClick={authorizeLastFM}
				title={lastFM?.name ? `Last.fm: ${lastFM.name} (Đã kết nối)` : "Kết nối Last.fm (Thống kê lịch sử bài hát đã nghe)"}
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

			{/* Nút Home */}
			{!isHome && (
				<button type="button" className="control-button relative size-4 cursor-pointer" onClick={() => void home()} title="Về trang chủ YouTube Music">
					<HomeIcon />
				</button>
			)}

			{/* Nút Kiểm tra cập nhật */}
			<button type="button" className="control-button relative size-4 cursor-pointer" disabled={!!updateChecking} onClick={() => void check()} title="Kiểm tra bản cập nhật mới">
				{status === "checking" && !updateInfo ? (
					<Spinner className="size-3" />
				) : updateInfo ? (
					<DownloadIcon className={status === "ready" || updateDownloaded ? "text-green-500" : "animate-pulse"} />
				) : (
					<RefreshIcon />
				)}
			</button>

			{/* Nút DevTools */}
			{isDev && (
				<button type="button" className="control-button relative size-4 cursor-pointer" onClick={() => void devTools()} title="Công cụ lập trình viên (DevTools)">
					<DevIcon />
				</button>
			)}

			{/* Nút Discord Rich Presence */}
			<button
				type="button"
				className="control-button relative cursor-pointer"
				onClick={toggleDiscord}
				title={
					discordEnabled
						? discordConnected
							? "Discord Rich Presence: Đang bật (Hiện nhạc lên Discord)"
							: "Discord: Đang kết nối..."
						: "Bật Discord Rich Presence (Hiển thị bài hát đang nghe lên trang cá nhân Discord)"
				}
			>
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

			{/* Nút Cài đặt (Settings) */}
			<button type="button" className="control-button cursor-pointer" onClick={() => void openWindow("settingsWindow")} title="Cài đặt (Settings)">
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
