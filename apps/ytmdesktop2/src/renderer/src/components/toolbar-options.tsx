import { DownloadIcon, PictureInPicture2, TimerIcon } from "lucide-react";
import DevIcon from "@/assets/icons/chip.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import RefreshIcon from "@/assets/icons/refresh.svg?react";
import { Spinner } from "@/components/ui/spinner";
import { useNavigation } from "@/hooks/use-navigation";
import { useSettingsState } from "@/hooks/use-settings";
import { useUpdater } from "@/hooks/use-updater";
import { trpc } from "@/lib/trpc";

export function ToolbarOptions() {
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
	const { mutateAsync: toggleTrayView } = trpc.trayView.toggle.useMutation();
	const { data: trayPinned } = trpc.trayView.pinned.useQuery();

	return (
		<div className="flex flex-row items-center gap-1.5">
			{/* Nút Khay phát nhạc thu nhỏ (System Tray View) */}
			<button
				type="button"
				onClick={() => void toggleTrayView()}
				className="control-button h-4 flex items-center justify-center cursor-pointer hover:bg-white/10 rounded transition-colors"
				title="Khay phát nhạc thu nhỏ (System Tray View) - Bấm để Bật/Tắt"
			>
				<PictureInPicture2 className="size-3.5" />
			</button>

			{/* Nút Hẹn giờ tắt nhạc (Mở Dialog chọn mốc chuyên nghiệp) */}
			<button
				type="button"
				onClick={() => void openSleepDialog()}
				className={`control-button relative h-4 flex items-center gap-1.5 px-2 !w-auto cursor-pointer transition-colors ${
					sleepState?.active ? "text-amber-400 bg-amber-500/20 rounded" : "hover:bg-white/10 rounded"
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

			{/* Nút Home (chỉ hiện khi đang không ở trang chủ) */}
			{!isHome && (
				<button type="button" className="control-button relative size-4 cursor-pointer hover:bg-white/10 rounded" onClick={() => void home()} title="Về trang chủ YouTube Music">
					<HomeIcon />
				</button>
			)}

			{/* Nút Cập nhật (chỉ hiện khi đang kiểm tra hoặc có bản cập nhật mới) */}
			{(updateInfo || status === "checking") && (
				<button type="button" className="control-button relative size-4 cursor-pointer" disabled={!!updateChecking} onClick={() => void check()} title="Kiểm tra bản cập nhật mới">
					{status === "checking" && !updateInfo ? (
						<Spinner className="size-3" />
					) : updateInfo ? (
						<DownloadIcon className={status === "ready" || updateDownloaded ? "text-green-500" : "animate-pulse"} />
					) : (
						<RefreshIcon />
					)}
				</button>
			)}

			{/* Nút DevTools (chỉ cho dev) */}
			{isDev && (
				<button type="button" className="control-button relative size-4 cursor-pointer" onClick={() => void devTools()} title="Công cụ lập trình viên (DevTools)">
					<DevIcon />
				</button>
			)}

			{/* Nút Cài đặt (Settings) */}
			<button type="button" className="control-button cursor-pointer hover:bg-white/10 rounded" onClick={() => void openWindow("settingsWindow")} title="Cài đặt (Settings)">
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
