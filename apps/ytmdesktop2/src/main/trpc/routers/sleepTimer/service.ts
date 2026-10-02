import { EventEmitter } from "node:events";
import { AfterInit, BaseProvider, OnDestroy } from "@main/core/baseProvider";
import { serverMain } from "@main/ipc/serverEvents";
import { trackService } from "@main/trpc/routers/track";
import type { App } from "electron";

export interface SleepTimerState {
	active: boolean;
	mode: "pause" | "quit";
	targetDurationMinutes: number | null;
	endAtTimestamp: number | null;
	remainingSeconds: number;
	trackEnd: boolean;
	targetTrackId: string | null;
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

	constructor(private electronApp: App) {
		super("sleepTimer");
	}

	async AfterInit() {
		this.logger.debug("SleepTimerProvider initialized");
	}

	async OnDestroy() {
		this.cancelTimer();
	}

	getState(): SleepTimerState {
		return { ...this.state };
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
		// Phát sự kiện IPC để khay hệ thống (tray menu) hoặc renderer có thể bắt realtime
		serverMain.emit("sleepTimer.state", null, currentState);
	}

	setTimer(options: { durationMinutes?: number; trackEnd?: boolean; mode?: "pause" | "quit" }): SleepTimerState {
		this.cancelTimer();

		const mode = options.mode ?? "pause";

		if (options.trackEnd) {
			const targetTrackId = trackService.trackState?.id ?? null;

			this.state = {
				active: true,
				mode,
				targetDurationMinutes: null,
				endAtTimestamp: null,
				remainingSeconds: 0,
				trackEnd: true,
				targetTrackId,
			};

			// Lắng nghe khi bài hát hiện tại đổi bài hoặc kết thúc
			const onTrackChange = (trackState: any) => {
				if (!this.state.active || !this.state.trackEnd) return;

				// Nếu bài hát chuyển sang bài khác hoặc dừng kết thúc
				if (targetTrackId && trackState.id !== targetTrackId) {
					this.logger.debug("Sleep timer triggered: track finished/changed");
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

		if (targetMode === "quit") {
			this.logger.info("Sleep timer executed: quitting application");
			this.electronApp.quit();
		} else {
			this.logger.info("Sleep timer executed: pausing track playback");
			await trackService.pauseTrack();
		}
	}
}
