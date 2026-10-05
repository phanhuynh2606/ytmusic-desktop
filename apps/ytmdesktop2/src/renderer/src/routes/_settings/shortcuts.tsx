import { createFileRoute } from "@tanstack/react-router";
import {
	Heart,
	Keyboard,
	Maximize2,
	Mic2,
	Play,
	RotateCcw,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_settings/shortcuts")({
	component: ShortcutsSettingsPage,
});

type ShortcutAction =
	| "playPause"
	| "next"
	| "prev"
	| "volumeUp"
	| "volumeDown"
	| "mute"
	| "like"
	| "toggleFloatingLyrics";

const ACTION_METAS: {
	key: ShortcutAction;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}[] = [
	{
		key: "playPause",
		label: "Phát / Tạm dừng",
		description: "Chuyển đổi trạng thái phát nhạc",
		icon: Play,
	},
	{
		key: "next",
		label: "Bài kế tiếp",
		description: "Chuyển sang bài hát tiếp theo trong danh sách",
		icon: SkipForward,
	},
	{
		key: "prev",
		label: "Bài trước đó",
		description: "Quay lại bài hát trước",
		icon: SkipBack,
	},
	{
		key: "volumeUp",
		label: "Tăng âm lượng (+5%)",
		description: "Tăng âm lượng thêm 5%",
		icon: Volume2,
	},
	{
		key: "volumeDown",
		label: "Giảm âm lượng (-5%)",
		description: "Giảm âm lượng đi 5%",
		icon: Volume2,
	},
	{
		key: "mute",
		label: "Bật / Tắt tiếng (Mute)",
		description: "Tắt tiếng tạm thời hoặc khôi phục âm lượng trước đó",
		icon: VolumeX,
	},
	{
		key: "like",
		label: "Thích bài hát (Like)",
		description: "Thêm hoặc xóa bài hát khỏi danh sách Đã thích",
		icon: Heart,
	},
	{
		key: "toggleFloatingLyrics",
		label: "Bật / Tắt Lời bài hát nổi",
		description: "Ẩn hoặc hiện thanh Floating Lyrics trên màn hình",
		icon: Mic2,
	},
];

function KeyBadge({ text }: { text: string }) {
	return (
		<kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-[11px] font-mono font-semibold text-neutral-300 bg-neutral-900 border border-neutral-700/80 rounded shadow-inner">
			{text}
		</kbd>
	);
}

function ShortcutsSettingsPage() {
	const utils = trpc.useUtils();
	const { data: shortcutData, isLoading } = trpc.shortcut.getBindings.useQuery();
	const { mutateAsync: setEnabledMutation } = trpc.shortcut.setEnabled.useMutation();
	const { mutateAsync: updateBindingMutation } = trpc.shortcut.updateBinding.useMutation();
	const { mutateAsync: resetDefaultsMutation } = trpc.shortcut.resetDefaults.useMutation();

	const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);

	const enabled = shortcutData?.enabled ?? true;
	const bindings = shortcutData?.bindings;

	// Listen for keystrokes when recording
	useEffect(() => {
		if (!recordingAction) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (e.key === "Escape") {
				setRecordingAction(null);
				return;
			}

			// Ignore solo modifier presses
			if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
				return;
			}

			const parts: string[] = [];
			if (e.ctrlKey) parts.push("Ctrl");
			if (e.altKey) parts.push("Alt");
			if (e.shiftKey) parts.push("Shift");
			if (e.metaKey) parts.push("Cmd");

			let keyName = e.key;
			if (e.code === "Space" || e.key === " ") keyName = "Space";
			else if (e.code.startsWith("Arrow")) keyName = e.code.replace("Arrow", "");
			else if (keyName.length === 1) keyName = keyName.toUpperCase();

			// Require at least one modifier unless function key
			if (parts.length === 0 && !keyName.startsWith("F")) {
				return;
			}

			parts.push(keyName);
			const accelerator = parts.join("+");

			void updateBindingMutation({ action: recordingAction, accelerator }).then((res) => {
				utils.shortcut.getBindings.setData(undefined, res);
			});
			setRecordingAction(null);
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
	}, [recordingAction, updateBindingMutation, utils]);

	const handleToggleEnabled = (val: boolean) => {
		void setEnabledMutation({ enabled: val }).then((res) => {
			utils.shortcut.getBindings.setData(undefined, res);
		});
	};

	const handleReset = () => {
		void resetDefaultsMutation().then((res) => {
			utils.shortcut.getBindings.setData(undefined, res);
		});
	};

	return (
		<div className="flex flex-col gap-6 max-w-4xl">
			{/* Master Switch Card */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
					<div className="space-y-1">
						<CardTitle className="text-base flex items-center gap-2">
							<Keyboard className="size-4 text-amber-400" />
							Phím Tắt Toàn Cục (Global Shortcuts)
						</CardTitle>
						<CardDescription className="text-xs">
							Cho phép điều khiển bài hát từ mọi ứng dụng hoặc khi đang chơi game trên máy tính.
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Switch checked={enabled} onCheckedChange={handleToggleEnabled} />
					</div>
				</CardHeader>
			</Card>

			{/* Shortcuts List Card */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
					<div className="space-y-0.5">
						<CardTitle className="text-sm font-medium">Danh Sách Phím Tắt</CardTitle>
						<CardDescription className="text-xs">
							Click vào nút phím tắt để ghi nhận tổ hợp phím mới (nhấn Esc để hủy).
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleReset}
						className="gap-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer"
					>
						<RotateCcw className="size-3.5" />
						Khôi phục mặc định
					</Button>
				</CardHeader>

				<CardContent className="divide-y divide-border/40 pt-1">
					{ACTION_METAS.map((action) => {
						const Icon = action.icon;
						const isRecording = recordingAction === action.key;
						const currentAcc = bindings ? (bindings as any)[action.key] : "";
						const parts = currentAcc ? currentAcc.split("+") : [];

						return (
							<div
								key={action.key}
								className={cn(
									"flex items-center justify-between py-3 transition-colors",
									!enabled && "opacity-40 pointer-events-none",
								)}
							>
								<div className="flex items-center gap-3">
									<div className="size-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
										<Icon className="size-4" />
									</div>
									<div className="space-y-0.5">
										<p className="text-xs font-medium text-foreground">{action.label}</p>
										<p className="text-[11px] text-muted-foreground">{action.description}</p>
									</div>
								</div>

								{/* Key Recorder Button */}
								<button
									type="button"
									disabled={!enabled}
									onClick={() => setRecordingAction(isRecording ? null : action.key)}
									className={cn(
										"px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1.5",
										isRecording
											? "bg-amber-500/20 border-amber-500/60 text-amber-300 ring-2 ring-amber-500/30 animate-pulse"
											: "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-200",
									)}
								>
									{isRecording ? (
										<span className="font-mono text-amber-300 text-[11px]">Bấm tổ hợp phím...</span>
									) : parts.length > 0 ? (
										<div className="flex items-center gap-1">
											{parts.map((part: string, idx: number) => (
												<span key={part} className="flex items-center gap-1">
													<KeyBadge text={part} />
													{idx < parts.length - 1 && <span className="text-[10px] text-neutral-500">+</span>}
												</span>
											))}
										</div>
									) : (
										<span className="text-neutral-500 italic text-[11px]">Chưa gán</span>
									)}
								</button>
							</div>
						);
					})}
				</CardContent>
			</Card>
		</div>
	);
}
