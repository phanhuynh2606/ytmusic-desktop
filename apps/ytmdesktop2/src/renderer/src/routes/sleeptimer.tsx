import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, Lock, MonitorOff, Moon, Pause, Power, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SleepTimerMode } from "@main/trpc/routers/sleepTimer/service";
import { formatSleepTimerRemaining, useSleepTimer } from "@/hooks/use-sleep-timer";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sleeptimer")({
	component: SleepTimerDialogPage,
});

const PRESETS = [
	{ label: "15 phút", minutes: 15 },
	{ label: "30 phút", minutes: 30 },
	{ label: "45 phút", minutes: 45 },
	{ label: "1 giờ", minutes: 60 },
];

const MODE_OPTIONS: {
	id: SleepTimerMode;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	activeClass: string;
}[] = [
	{ id: "pause", label: "Dừng nhạc", icon: Pause, activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
	{ id: "quit", label: "Đóng app", icon: Power, activeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
	{ id: "lock", label: "Khóa máy", icon: Lock, activeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
	{ id: "sleep", label: "Ngủ máy", icon: Moon, activeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" },
	{ id: "shutdown", label: "Tắt máy", icon: MonitorOff, activeClass: "bg-red-500/20 text-red-300 border-red-500/40" },
];

function getModeTitle(mode?: SleepTimerMode) {
	switch (mode) {
		case "quit":
			return "Đóng ứng dụng";
		case "lock":
			return "Khóa màn hình máy tính";
		case "sleep":
			return "Ngủ máy tính (Sleep)";
		case "shutdown":
			return "Tắt máy tính (Shutdown)";
		case "pause":
		default:
			return "Tạm dừng nhạc";
	}
}

function SleepTimerDialogPage() {
	const sleepState = useSleepTimer();

	const { mutateAsync: setTimer } = trpc.sleepTimer.set.useMutation();
	const { mutateAsync: setModeMutation } = trpc.sleepTimer.setMode.useMutation();
	const { mutateAsync: cancelTimer } = trpc.sleepTimer.cancel.useMutation();
	const { mutateAsync: closeDialog } = trpc.sleepTimer.closeDialog.useMutation();

	const [mode, setMode] = useState<SleepTimerMode>("pause");
	const [customMinutes, setCustomMinutes] = useState<string>("");

	useEffect(() => {
		if (sleepState?.mode) {
			setMode(sleepState.mode);
		}
	}, [sleepState?.mode]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				void closeDialog();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closeDialog]);

	const active = sleepState?.active ?? false;
	const remaining = sleepState?.remainingSeconds ?? 0;
	const isTrackEnd = sleepState?.trackEnd ?? false;

	const handleCustomSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		const mins = Number.parseInt(customMinutes.trim(), 10);
		if (!Number.isNaN(mins) && mins >= 1 && mins <= 720) {
			void setTimer({ durationMinutes: mins, mode });
			setCustomMinutes("");
		}
	};

	const handleModeChange = (newMode: SleepTimerMode) => {
		setMode(newMode);
		if (active) {
			void setModeMutation(newMode);
		}
	};

	return (
		<div className="drag h-screen w-screen p-4 flex flex-col justify-between bg-neutral-950 text-white select-none border border-neutral-800/80 rounded-2xl shadow-2xl">
			{/* Header */}
			<div className="flex items-center justify-between pb-2.5 border-b border-neutral-800/60">
				<div className="flex items-center gap-2">
					<div className="size-6 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center">
						<Timer className="size-3.5" />
					</div>
					<div>
						<h1 className="text-xs font-semibold text-neutral-100 tracking-tight">Hẹn Giờ Tắt Nhạc</h1>
						<p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Sleep Timer</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => void closeDialog()}
					className="no-drag size-6 flex items-center justify-center rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
					title="Đóng (Esc)"
				>
					<X className="size-3.5" />
				</button>
			</div>

			{/* Main Status / Countdown */}
			<div className="py-2.5 px-4 flex flex-col items-center justify-center bg-neutral-900/40 rounded-xl border border-neutral-800/60 my-1">
				{active ? (
					<>
						<span className="text-[10px] font-medium tracking-wide text-amber-400/90 flex items-center gap-1.5 mb-1 uppercase font-mono">
							<span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
							{isTrackEnd ? "Hết bài hát hiện tại" : "Đang đếm ngược"}
						</span>
						<div className="text-3xl font-mono font-semibold tracking-tight text-amber-300">
							{remaining > 0 ? formatSleepTimerRemaining(remaining) : "00:00"}
						</div>
						<span className="text-[10px] text-neutral-400 mt-1">
							Hành động: <strong className="text-neutral-200 font-medium">{getModeTitle(sleepState?.mode)}</strong>
						</span>
					</>
				) : (
					<>
						<Clock className="size-4 text-neutral-600 mb-1" />
						<div className="text-xl font-mono font-medium text-neutral-500">00:00</div>
						<span className="text-[10px] text-neutral-500 mt-0.5">Chưa kích hoạt</span>
					</>
				)}
			</div>

			{/* Presets List */}
			<div className="no-drag flex flex-col gap-1.5">
				<span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
					Thời gian hẹn giờ
				</span>

				<div className="grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onClick={() => void setTimer({ trackEnd: true, mode })}
						className={cn(
							"col-span-2 py-1.5 px-3 rounded-lg text-xs font-medium text-left flex items-center justify-between border transition-all cursor-pointer",
							active && isTrackEnd
								? "bg-amber-500/15 border-amber-500/40 text-amber-300"
								: "bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800/80 hover:border-neutral-700 text-neutral-200",
						)}
					>
						<span>Khi kết thúc bài hát</span>
						{active && isTrackEnd && <Check className="size-3 text-amber-400" />}
					</button>

					{PRESETS.map((p) => {
						const isSelected = active && !isTrackEnd && sleepState?.targetDurationMinutes === p.minutes;
						return (
							<button
								key={p.minutes}
								type="button"
								onClick={() => void setTimer({ durationMinutes: p.minutes, mode })}
								className={cn(
									"py-1.5 px-3 rounded-lg text-xs font-medium text-left flex items-center justify-between border transition-all cursor-pointer",
									isSelected
										? "bg-amber-500/15 border-amber-500/40 text-amber-300"
										: "bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800/80 hover:border-neutral-700 text-neutral-200",
								)}
							>
								<span>{p.label}</span>
								{isSelected && <Check className="size-3 text-amber-400" />}
							</button>
						);
					})}
				</div>

				{/* Custom Duration Input */}
				<form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 pt-0.5">
					<div className="relative flex-1">
						<input
							type="number"
							min="1"
							max="720"
							placeholder="Tùy chỉnh số phút (1 - 720)..."
							value={customMinutes}
							onChange={(e) => setCustomMinutes(e.target.value)}
							className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-lg pl-3 pr-10 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						/>
						<span className="absolute right-3 top-1.5 text-[10px] text-neutral-500 pointer-events-none">phút</span>
					</div>
					<button
						type="submit"
						disabled={!customMinutes.trim()}
						className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
					>
						Đặt
					</button>
				</form>
			</div>

			{/* Mode Choice */}
			<div className="no-drag flex flex-col gap-1.5 pt-2 border-t border-neutral-800/60">
				<span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
					Hành động khi hết giờ
				</span>
				<div className="grid grid-cols-5 gap-1">
					{MODE_OPTIONS.map((opt) => {
						const Icon = opt.icon;
						const isSelected = mode === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => handleModeChange(opt.id)}
								className={cn(
									"flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-[10px] font-medium transition-all cursor-pointer",
									isSelected
										? opt.activeClass
										: "bg-neutral-900/60 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60",
								)}
								title={opt.label}
							>
								<Icon className="size-3.5 mb-1 shrink-0" />
								<span className="truncate w-full text-center leading-tight">{opt.label}</span>
							</button>
						);
					})}
				</div>
				{mode === "shutdown" && (
					<p className="text-[9px] text-red-400/90 leading-tight">
						* Khi hết giờ, máy tính sẽ đếm lùi 10 giây trước khi tắt hẳn.
					</p>
				)}
			</div>

			{/* Bottom Action Buttons */}
			<div className="no-drag flex items-center gap-2 pt-2 border-t border-neutral-800/60">
				{active ? (
					<button
						type="button"
						onClick={() => void cancelTimer()}
						className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-colors cursor-pointer"
					>
						Hủy hẹn giờ
					</button>
				) : null}
				<button
					type="button"
					onClick={() => void closeDialog()}
					className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
				>
					Đóng
				</button>
			</div>
		</div>
	);
}
