import { exec } from "node:child_process";
import { EventEmitter } from "node:events";
import { AfterInit, BaseProvider, OnDestroy } from "@main/core/baseProvider";
import { serverMain } from "@main/ipc/serverEvents";
import { getAppWindows } from "@main/lifecycle";
import { trackService } from "@main/trpc/routers/track";
import { createAppWindow } from "@main/windows/windowUtils";
import type { App, BrowserWindow } from "electron";

export type SleepTimerMode = "pause" | "quit" | "lock" | "sleep" | "shutdown";

export interface SleepTimerState {
	active: boolean;
	mode: SleepTimerMode;
	targetDurationMinutes: number | null;
	endAtTimestamp: number | null;
	remainingSeconds: number;
	trackEnd: boolean;
	targetTrackId: string | null;
}

function executeSystemAction(
	action: "lock" | "sleep" | "shutdown",
	logger: { error: (...args: any[]) => void; info: (...args: any[]) => void },
) {
	const isWin = process.platform === "win32";
	const isMac = process.platform === "darwin";

	let command = "";
	if (action === "lock") {
		if (isWin) command = "rundll32.exe user32.dll,LockWorkStation";
		else if (isMac) command = "/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend";
		else command = "loginctl lock-session || xdg-screensaver lock";
	} else if (action === "sleep") {
		if (isWin) command = "rundll32.exe powrprof.dll,SetSuspendState 0,1,0";
		else if (isMac) command = "pmset sleepnow";
		else command = "systemctl suspend";
	} else if (action === "shutdown") {
		if (isWin) command = 'shutdown /s /t 10 /c "YouTube Music: Hẹn giờ tắt máy tính"';
		else if (isMac) command = "osascript -e 'tell app \"System Events\" to shut down'";
		else command = "systemctl poweroff";
	}

	if (!command) return;

	exec(command, (err, stdout, stderr) => {
		if (err) {
			logger.error(`Failed to execute system action ${action}:`, err, stderr);
		} else {
			logger.info(`Successfully triggered system action ${action}:`, stdout);
		}
	});
}

const DEFAULT_STATE: SleepTimerState = {
	active: false,
	mode: "pause",
	targetDurationMinutes: null,
	endAtTimestamp: null,
	remainingSeconds: 0,
	trackEnd: false,
	targetTrackId: null,
};

export default class SleepTimerProvider extends BaseProvider implements AfterInit, OnDestroy {
	private state: SleepTimerState = { ...DEFAULT_STATE };
	private intervalId: NodeJS.Timeout | null = null;
	private trackOffHandler: (() => void) | null = null;
	private readonly emitter = new EventEmitter();
	private dialogWindow: BrowserWindow | null = null;

	constructor(private electronApp: App) {
		super("sleepTimer");
	}

	async openDialog() {
		if (this.dialogWindow && !this.dialogWindow.isDestroyed()) {
			this.dialogWindow.focus();
			return;
		}

		const mainWindow = getAppWindows()?.main ?? null;

		this.dialogWindow = await createAppWindow({
			path: "/sleeptimer",
			parent: mainWindow ?? undefined,
			width: 360,
			height: 530,
			minWidth: 360,
			minHeight: 530,
			maxWidth: 360,
			maxHeight: 530,
			show: true,
			showTaskBar: false,
			minimizeable: false,
			maximizeable: false,
		});

		this.dialogWindow.setResizable(false);
		this.dialogWindow.setAlwaysOnTop(true, "floating");
		this.dialogWindow.on("closed", () => {
			this.dialogWindow = null;
		});
	}

	closeDialog() {
		if (this.dialogWindow && !this.dialogWindow.isDestroyed()) {
			this.dialogWindow.close();
			this.dialogWindow = null;
		}
	}

	async AfterInit() {
		this.logger.debug("SleepTimerProvider initialized");
	}

	async OnDestroy() {
		this.cancelTimer();
		this.closeDialog();
	}

	getState(): SleepTimerState {
		return { ...this.state };
	}

	setMode(mode: SleepTimerMode): SleepTimerState {
		this.state.mode = mode;
		this.broadcastState();
		return this.getState();
	}

	onStateChange(listener: (state: SleepTimerState) => void): () => void {
		this.emitter.on("change", listener);
		return () => {
			this.emitter.off("change", listener);
		};
	}

	private broadcastState(): void {
		const currentState = this.getState();
		this.emitter.emit("change", currentState);
		serverMain.emit("sleepTimer.state", null, currentState);
	}

	setTimer(options: { durationMinutes?: number; trackEnd?: boolean; mode?: SleepTimerMode }): SleepTimerState {
		this.cancelTimer();

		const mode = options.mode ?? "pause";

		if (options.trackEnd) {
			const currentTrack = trackService.trackState;
			const initialTrackId = currentTrack?.id || null;
			let initialRemaining = 0;
			if (currentTrack && currentTrack.duration > 0) {
				initialRemaining = Math.max(0, Math.round(currentTrack.duration - currentTrack.progress));
			}

			this.state = {
				active: true,
				mode,
				targetDurationMinutes: null,
				endAtTimestamp: null,
				remainingSeconds: initialRemaining,
				trackEnd: true,
				targetTrackId: initialTrackId,
			};

			const onTrackChange = (trackState: any) => {
				if (!this.state.active || !this.state.trackEnd) return;

				// Nếu ban đầu chưa có bài nào phát, gán bài đầu tiên xuất hiện
				if (!this.state.targetTrackId) {
					if (trackState?.id && trackState.playing) {
						this.state.targetTrackId = trackState.id;
						const rem = trackState.duration > 0 ? Math.max(0, Math.round(trackState.duration - trackState.progress)) : 0;
						this.state.remainingSeconds = rem;
						this.broadcastState();
					}
					return;
				}

				// Cùng bài hát: cập nhật thời gian còn lại
				if (trackState?.id === this.state.targetTrackId) {
					if (trackState.duration > 0) {
						const rem = Math.max(0, Math.round(trackState.duration - trackState.progress));
						if (rem !== this.state.remainingSeconds) {
							this.state.remainingSeconds = rem;
							this.broadcastState();
						}

						// Nếu bài hát đã chạy tới cuối thời lượng (còn <= 1s)
						if (trackState.duration > 2 && trackState.progress >= trackState.duration - 1) {
							this.logger.debug("Sleep timer triggered: track reached end");
							void this.triggerAction();
							return;
						}
					}

					// Trường hợp bài đã ngừng phát ở gần cuối bài (kết thúc danh sách / tắt autoplay)
					if (!trackState.playing && trackState.duration > 2 && trackState.duration - trackState.progress <= 2) {
						this.logger.debug("Sleep timer triggered: track stopped near end");
						void this.triggerAction();
						return;
					}
					return;
				}

				// Nếu bài hát đã chuyển sang bài khác
				if (trackState?.id && trackState.id !== this.state.targetTrackId) {
					this.logger.debug("Sleep timer triggered: track changed to new track");
					void this.triggerAction();
				}
			};

			this.trackOffHandler = trackService.onTrackStateChange(onTrackChange);
			this.broadcastState();
			return this.getState();
		}

		if (options.durationMinutes && options.durationMinutes > 0) {
			const totalSeconds = Math.round(options.durationMinutes * 60);
			const endAtTimestamp = Date.now() + totalSeconds * 1000;

			this.state = {
				active: true,
				mode,
				targetDurationMinutes: options.durationMinutes,
				endAtTimestamp,
				remainingSeconds: totalSeconds,
				trackEnd: false,
				targetTrackId: null,
			};

			this.intervalId = setInterval(() => {
				if (!this.state.active || !this.state.endAtTimestamp) {
					this.cancelTimer();
					return;
				}

				const now = Date.now();
				const remaining = Math.max(0, Math.round((this.state.endAtTimestamp - now) / 1000));
				this.state.remainingSeconds = remaining;

				if (remaining <= 0) {
					this.logger.debug("Sleep timer countdown reached 0: triggering action");
					void this.triggerAction();
				} else {
					this.broadcastState();
				}
			}, 1000);

			this.broadcastState();
			return this.getState();
		}

		return this.getState();
	}

	cancelTimer(): SleepTimerState {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		if (this.trackOffHandler) {
			this.trackOffHandler();
			this.trackOffHandler = null;
		}
		this.state = { ...DEFAULT_STATE };
		this.broadcastState();
		return this.getState();
	}

	private async triggerAction(): Promise<void> {
		const targetMode = this.state.mode;
		this.cancelTimer();

		this.logger.info("Sleep timer executed: pausing track playback");
		try {
			await trackService.pauseTrack();
		} catch (err) {
			this.logger.error("Failed to pause track on sleep timer", err);
		}

		if (targetMode === "quit") {
			this.logger.info("Sleep timer executed: force quitting application");
			// Gửi forceQuit = true để vượt qua bộ chặn minimize-to-tray
			serverMain.emit("app.quit", null, true);
		} else if (targetMode === "lock" || targetMode === "sleep" || targetMode === "shutdown") {
			this.logger.info(`Sleep timer executed: triggering system action ${targetMode}`);
			executeSystemAction(targetMode, this.logger);
		}
	}
}
