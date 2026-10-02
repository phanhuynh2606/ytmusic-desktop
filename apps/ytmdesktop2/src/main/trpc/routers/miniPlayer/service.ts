import { AfterInit, BaseProvider, OnDestroy } from "@main/core/baseProvider";
import { isAppQuitting, shouldCancelWindowClose } from "@main/handlers/quitPolicy";
import SettingsProvider from "@main/trpc/routers/settings/service";
import { createAppWindow } from "@main/windows/windowUtils";
import { App, BrowserWindow, screen } from "electron";
import { debounce } from "lodash-es";
import { Observable, Subject } from "rxjs";

const MINI_PLAYER_WIDTH = 380;
const MINI_PLAYER_HEIGHT = 180;

export interface MiniPlayerState {
	isVisible: boolean;
	alwaysOnTop: boolean;
	opacity: number;
}

export default class MiniPlayerProvider extends BaseProvider implements AfterInit, OnDestroy {
	private _ready: Promise<BrowserWindow> | null = null;
	private _alwaysOnTop = true;
	private _opacity = 0.95;
	private _state$ = new Subject<MiniPlayerState>();

	private persistMoved = debounce(() => {
		const win = this.getWindow();
		if (!win || win.isDestroyed()) return;
		const [x, y] = win.getPosition();
		this.settings.set("miniPlayer.x", x);
		this.settings.set("miniPlayer.y", y);
	}, 300);

	constructor(_app: App) {
		super("miniPlayer");
	}

	private get settings(): SettingsProvider {
		return this.getProvider("settings");
	}

	async AfterInit() {
		this._alwaysOnTop = !!this.settings.get("miniPlayer.alwaysOnTop", true);
		this._opacity = Number(this.settings.get("miniPlayer.opacity", 0.95)) || 0.95;
		const autoOpen = !!this.settings.get("miniPlayer.autoOpen", false);
		if (autoOpen) {
			void this.show();
		}
	}

	private getWindow(): BrowserWindow | null {
		const win = this.windowContext.views.miniPlayerWindow;
		if (!win || win.isDestroyed()) return null;
		return win;
	}

	private clampToVisibleWorkArea(x: number, y: number): { x: number; y: number } {
		const b = screen.getDisplayNearestPoint({ x, y }).workArea;
		return {
			x: Math.round(Math.min(Math.max(x, b.x), b.x + b.width - MINI_PLAYER_WIDTH)),
			y: Math.round(Math.min(Math.max(y, b.y), b.y + b.height - MINI_PLAYER_HEIGHT)),
		};
	}

	private async ensureWindow(): Promise<BrowserWindow> {
		const existing = this.getWindow();
		if (existing) return existing;
		if (this._ready) return this._ready;

		this._ready = (async () => {
			const savedX = this.settings.get("miniPlayer.x") as number | undefined;
			const savedY = this.settings.get("miniPlayer.y") as number | undefined;

			const win = await createAppWindow({
				path: "/miniplayer",
				width: MINI_PLAYER_WIDTH,
				height: MINI_PLAYER_HEIGHT,
				minWidth: 320,
				minHeight: 160,
				show: false,
				showTaskBar: true,
				minimizeable: true,
				maximizeable: false,
				devtools: false,
			});

			win.setResizable(true);
			win.setAlwaysOnTop(this._alwaysOnTop, "floating");
			try {
				win.setOpacity(this._opacity);
			} catch {
				/* ignore opacity errors on platforms with limited support */
			}

			if (typeof savedX === "number" && typeof savedY === "number") {
				const clamped = this.clampToVisibleWorkArea(savedX, savedY);
				win.setPosition(clamped.x, clamped.y);
			} else {
				// Default to bottom-right corner of primary display
				const primary = screen.getPrimaryDisplay().workArea;
				const defX = primary.x + primary.width - MINI_PLAYER_WIDTH - 24;
				const defY = primary.y + primary.height - MINI_PLAYER_HEIGHT - 24;
				win.setPosition(defX, defY);
			}

			win.on("move", () => this.persistMoved());
			win.on("moved", () => this.persistMoved());

			win.on("close", (ev) => {
				if (!shouldCancelWindowClose({ quitting: isAppQuitting() })) return;
				ev.preventDefault();
				this.hide();
			});

			win.webContents.on("before-input-event", (_ev, input) => {
				if (input.type === "keyDown" && input.key === "Escape") {
					this.hide();
				}
			});

			this.windowContext.views.miniPlayerWindow = win;
			return win;
		})();

		try {
			return await this._ready;
		} catch (err) {
			this.windowContext.views.miniPlayerWindow = undefined;
			throw err;
		} finally {
			this._ready = null;
		}
	}

	getState(): MiniPlayerState {
		const win = this.getWindow();
		return {
			isVisible: !!win && !win.isDestroyed() && win.isVisible(),
			alwaysOnTop: this._alwaysOnTop,
			opacity: this._opacity,
		};
	}

	private emitState() {
		const state = this.getState();
		this._state$.next(state);
		this.windowContext.sendToAllViews("miniPlayer.state", state);
	}

	subscribeState(): Observable<MiniPlayerState> {
		return this._state$.asObservable();
	}

	async show() {
		const win = await this.ensureWindow();
		if (win.isDestroyed()) return;
		win.setAlwaysOnTop(this._alwaysOnTop, "floating");
		try {
			win.setOpacity(this._opacity);
		} catch {
			/* ignore */
		}
		if (win.isMinimized()) win.restore();
		win.show();
		win.focus();
		this.emitState();
	}

	hide() {
		const win = this.getWindow();
		if (win && !win.isDestroyed() && win.isVisible()) {
			win.hide();
		}
		this.emitState();
	}

	async toggle() {
		const win = this.getWindow();
		if (win && !win.isDestroyed() && win.isVisible()) {
			this.hide();
		} else {
			await this.show();
		}
	}

	setAlwaysOnTop(flag: boolean) {
		this._alwaysOnTop = flag;
		this.settings.set("miniPlayer.alwaysOnTop", flag);
		const win = this.getWindow();
		if (win && !win.isDestroyed()) {
			win.setAlwaysOnTop(flag, "floating");
		}
		this.emitState();
	}

	setOpacity(val: number) {
		const clamped = Math.max(0.2, Math.min(1, val));
		this._opacity = clamped;
		this.settings.set("miniPlayer.opacity", clamped);
		const win = this.getWindow();
		if (win && !win.isDestroyed()) {
			try {
				win.setOpacity(clamped);
			} catch {
				/* ignore */
			}
		}
		this.emitState();
	}

	OnDestroy() {
		const win = this.getWindow();
		if (win && !win.isDestroyed()) {
			win.destroy();
		}
		this.windowContext.views.miniPlayerWindow = undefined;
	}
}
