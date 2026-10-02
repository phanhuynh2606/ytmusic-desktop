import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, Play, Power, Timer, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sleeptimer")({
	component: SleepTimerDialogPage,
});

const PRESETS = [
	{ label: "15 phút", minutes: 15 },
	{ label: "30 phút", minutes: 30 },
	{ label: "45 phút", minutes: 45 },
	{ label: "1 giờ (60 phút)", minutes: 60 },
];

function SleepTimerDialogPage() {
	const utils = trpc.useUtils();
	const { data: sleepState, refetch } = trpc.sleepTimer.state.useQuery(undefined, {
		refetchInterval: (data) => (data?.active ? 1000 : false),
	});

	const { mutateAsync: setTimer } = trpc.sleepTimer.set.useMutation({
		onSuccess: () => void refetch(),
	});
	const { mutateAsync: cancelTimer } = trpc.sleepTimer.cancel.useMutation({
		onSuccess: () => void refetch(),
	});
	const { mutateAsync: closeDialog } = trpc.sleepTimer.closeDialog.useMutation();

	const [mode, setMode] = useState<"pause" | "quit">("pause");

	const active = sleepState?.active ?? false;
	const remaining = sleepState?.remainingSeconds ?? 0;
	const isTrackEnd = sleepState?.trackEnd ?? false;

	const formatRemaining = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) {
			return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
		}
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	return (
		<div className="drag h-screen w-screen p-4 flex flex-col justify-between bg-neutral-950 text-white select-none border border-neutral-800 rounded-2xl shadow-2xl">
			{/* Header */}
			<div className="flex items-center justify-between pb-2 border-b border-neutral-800">
				<div className="flex items-center gap-2">
					<div className="size-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
						<Timer className="size-4" />
					</div>
					<div>
						<h1 className="text-xs font-bold text-neutral-100">Hẹn Giờ Tắt Nhạc</h1>
						<p className="text-[10px] text-neutral-400">Sleep Timer</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => void closeDialog()}
					className="no-drag size-6 flex items-center justify-center rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
				>
					<X className="size-3.5" />
				</button>
			</div>

			{/* Main Status / Countdown */}
			<div className="py-2.5 flex flex-col items-center justify-center bg-neutral-900/60 rounded-xl border border-neutral-800/80 my-1">
				{active ? (
					<>
						<span className="text-[10px] font-medium uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-0.5">
							<span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
							Đang đếm ngược
						</span>
						<div className="text-3xl font-mono font-bold tracking-tight text-amber-300 drop-shadow-md">
							{isTrackEnd ? "Hết bài hát" : formatRemaining(remaining)}
						</div>
						<span className="text-[10px] text-neutral-400 mt-1">
							Hành động: {sleepState?.mode === "quit" ? "Tắt ứng dụng" : "Tạm dừng nhạc"}
						</span>
					</>
				) : (
					<>
						<Clock className="size-6 text-neutral-600 mb-1" />
						<div className="text-xl font-mono font-semibold text-neutral-400">00:00</div>
						<span className="text-[10px] text-neutral-500 mt-0.5">Chưa bật hẹn giờ</span>
					</>
				)}
			</div>

			{/* Presets List */}
			<div className="no-drag flex flex-col gap-1.5">
				<span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
					Chọn mốc thời gian:
				</span>

				<div className="grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onClick={() => void setTimer({ trackEnd: true, mode })}
						className={cn(
							"col-span-2 py-1.5 px-2.5 rounded-lg text-xs font-medium text-left flex items-center justify-between border transition-all cursor-pointer",
							active && isTrackEnd
								? "bg-amber-500/20 border-amber-500/50 text-amber-300"
								: "bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-200",
						)}
					>
						<span>🎵 Khi hết bài hát hiện tại</span>
						{active && isTrackEnd && <Check className="size-3 text-amber-400" />}
					</button>

					{PRESETS.map((p) => {
						const isSelected = active && sleepState?.targetDurationMinutes === p.minutes;
						return (
							<button
								key={p.minutes}
								type="button"
								onClick={() => void setTimer({ durationMinutes: p.minutes, mode })}
								className={cn(
									"py-1.5 px-2.5 rounded-lg text-xs font-medium text-left flex items-center justify-between border transition-all cursor-pointer",
									isSelected
										? "bg-amber-500/20 border-amber-500/50 text-amber-300"
										: "bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-200",
								)}
							>
								<span>⏱️ {p.label}</span>
								{isSelected && <Check className="size-3 text-amber-400" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Mode Choice */}
			<div className="no-drag flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
				<span className="text-[10px] text-neutral-400">Khi hết giờ:</span>
				<div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
					<button
						type="button"
						onClick={() => setMode("pause")}
						className={cn(
							"px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer",
							mode === "pause" ? "bg-amber-500/30 text-amber-300" : "text-neutral-400 hover:text-white",
						)}
					>
						<Play className="size-2.5" />
						Dừng nhạc
					</button>
					<button
						type="button"
						onClick={() => setMode("quit")}
						className={cn(
							"px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer",
							mode === "quit" ? "bg-red-500/30 text-red-300" : "text-neutral-400 hover:text-white",
						)}
					>
						<Power className="size-2.5" />
						Tắt app
					</button>
				</div>
			</div>

			{/* Bottom Action Buttons */}
			<div className="no-drag flex items-center gap-2 pt-2">
				{active ? (
					<button
						type="button"
						onClick={() => void cancelTimer()}
						className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 transition-colors cursor-pointer"
					>
						Hủy hẹn giờ
					</button>
				) : null}
				<button
					type="button"
					onClick={() => void closeDialog()}
					className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
				>
					Đóng
				</button>
			</div>
		</div>
	);
}
