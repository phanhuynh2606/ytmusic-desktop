import { join } from "node:path";
import { AfterInit, BaseProvider, OnDestroy } from "@main/core/baseProvider";
import { isAppQuitting, shouldCancelWindowClose } from "@main/handlers/quitPolicy";
import SettingsProvider from "@main/trpc/routers/settings/service";
import { attachTrpcWindow } from "@main/trpc/handler";
import { loadUrlOfWindow } from "@main/windows/webContentUtils";
import { getAppIconPath } from "@main/windows/windowUtils";
import { type App, BrowserWindow, screen } from "electron";
import { debounce } from "lodash-es";
import { Observable, Subject } from "rxjs";

export interface FloatingLyricsState {
	visible: boolean;
	locked: boolean;
	fontSize: number;
	textColor: "accent" | "white" | "gold" | "cyan" | "green";
	backgroundOpacity: number;
	align: "center" | "left";
}

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 130;

export default class FloatingLyricsProvider extends BaseProvider implements AfterInit, OnDestroy {
	private _window: BrowserWindow | null = null;
	private _ready: Promise<BrowserWindow> | null = null;
	private _state$ = new Subject<FloatingLyricsState>();

	private persistBounds = debounce(() => {
		const win = this.getWindow();
		if (!win || win.isDestroyed()) return;
		const [x, y] = win.getPosition();
		const [width, height] = win.getSize();
		this.settings.set("floatingLyrics.x", x);
		this.settings.set("floatingLyrics.y", y);
		this.settings.set("floatingLyrics.width", width);
		this.settings.set("floatingLyrics.height", height);
	}, 300);

	constructor(_app: App) {
		super("floatingLyrics");
	}

	private get settings(): SettingsProvider {
		return this.getProvider("settings");
	}

	async AfterInit() {
		const enabled = !!this.settings.get("floatingLyrics.enabled", false);
		if (enabled) {
			void this.show();
		}
	}

	private getWindow(): BrowserWindow | null {
		if (!this._window || this._window.isDestroyed()) return null;
		return this._window;
	}

	private clampToVisibleWorkArea(x: number, y: number, w: number, h: number): { x: number; y: number } {
		const b = screen.getDisplayNearestPoint({ x, y }).workArea;
		return {
			x: Math.round(Math.min(Math.max(x, b.x), b.x + b.width - w)),
			y: Math.round(Math.min(Math.max(y, b.y), b.y + b.height - h)),
		};
	}

	private async ensureWindow(): Promise<BrowserWindow> {
		const existing = this.getWindow();
		if (existing) return existing;
		if (this._ready) return this._ready;

		this._ready = (async () => {
			const savedX = this.settings.get("floatingLyrics.x") as number | undefined;
			const savedY = this.settings.get("floatingLyrics.y") as number | undefined;
			const savedW = (this.settings.get("floatingLyrics.width") as number | undefined) ?? DEFAULT_WIDTH;
			const savedH = (this.settings.get("floatingLyrics.height") as number | undefined) ?? DEFAULT_HEIGHT;
			const locked = !!this.settings.get("floatingLyrics.locked", false);

			const win = new BrowserWindow({
				width: savedW,
				height: savedH,
				minWidth: 380,
				minHeight: 70,
				show: false,
				transparent: true,
				frame: false,
				alwaysOnTop: true,
				skipTaskbar: true,
				hasShadow: false,
				resizable: true,
				backgroundColor: "#00000000",
				icon: getAppIconPath(),
				webPreferences: {
					nodeIntegration: import.meta.env.ELECTRON_NODE_INTEGRATION === "true",
					contextIsolation: true,
					sandbox: false,
					preload: join(__dirname, "../preload/api.js"),
				},
			});

			win.setAlwaysOnTop(true, "screen-saver");

			if (typeof savedX === "number" && typeof savedY === "number") {
				const clamped = this.clampToVisibleWorkArea(savedX, savedY, savedW, savedH);
				win.setPosition(clamped.x, clamped.y);
			} else {
				// Default to bottom-center of primary display
				const primary = screen.getPrimaryDisplay().workArea;
				const defX = Math.round(primary.x + (primary.width - savedW) / 2);
				const defY = Math.round(primary.y + primary.height - savedH - 80);
				win.setPosition(defX, defY);
			}

			if (locked) {
				win.setIgnoreMouseEvents(true, { forward: true });
			}

			await loadUrlOfWindow(win, "/floatinglyrics");
			attachTrpcWindow(win);

			win.on("move", this.persistBounds);
			win.on("resize", this.persistBounds);

			win.on("close", (e) => {
				if (!shouldCancelWindowClose({ quitting: isAppQuitting() })) return;
				e.preventDefault();
				win.hide();
				this.settings.set("floatingLyrics.enabled", false);
				this.broadcastState();
			});

			this._window = win;
			return win;
		})();

		try {
			return await this._ready;
		} finally {
			this._ready = null;
		}
	}

	getState(): FloatingLyricsState {
		const win = this.getWindow();
		const visible = !!win && win.isVisible();
		const locked = !!this.settings.get("floatingLyrics.locked", false);
		const fontSize = Number(this.settings.get("floatingLyrics.fontSize", 22)) || 22;
		const textColor = (this.settings.get("floatingLyrics.textColor", "accent") as any) ?? "accent";
		const backgroundOpacity = Number(this.settings.get("floatingLyrics.backgroundOpacity", 25)) ?? 25;
		const align = (this.settings.get("floatingLyrics.align", "center") as any) ?? "center";

		return {
			visible,
			locked,
			fontSize,
			textColor,
			backgroundOpacity,
			align,
		};
	}

	private broadcastState(): void {
		const state = this.getState();
		this._state$.next(state);
		try {
			this.windowContext?.sendToAllViews?.("floatingLyrics.state", state);
		} catch {
			// ignore broadcast errors
		}
	}

	async show(): Promise<void> {
		const win = await this.ensureWindow();
		win.show();
		this.settings.set("floatingLyrics.enabled", true);
		this.broadcastState();
	}

	async hide(): Promise<void> {
		const win = this.getWindow();
		if (win) {
			win.hide();
		}
		this.settings.set("floatingLyrics.enabled", false);
		this.broadcastState();
	}

	async toggle(): Promise<void> {
		const win = this.getWindow();
		if (win && win.isVisible()) {
			await this.hide();
		} else {
			await this.show();
		}
	}

	setLocked(locked: boolean): void {
		this.settings.set("floatingLyrics.locked", locked);
		const win = this.getWindow();
		if (win) {
			if (locked) {
				win.setIgnoreMouseEvents(true, { forward: true });
			} else {
				win.setIgnoreMouseEvents(false);
			}
		}
		this.broadcastState();
	}

	setIgnoreMouseEvents(ignore: boolean): void {
		const win = this.getWindow();
		if (!win) return;
		const isLocked = !!this.settings.get("floatingLyrics.locked", false);
		// Only override if currently locked
		if (isLocked) {
			if (ignore) {
				win.setIgnoreMouseEvents(true, { forward: true });
			} else {
				win.setIgnoreMouseEvents(false);
			}
		}
	}

	updateConfig(config: Partial<Omit<FloatingLyricsState, "visible">>): void {
		if (config.locked !== undefined) {
			this.setLocked(config.locked);
		}
		if (config.fontSize !== undefined) {
			this.settings.set("floatingLyrics.fontSize", config.fontSize);
		}
		if (config.textColor !== undefined) {
			this.settings.set("floatingLyrics.textColor", config.textColor);
		}
		if (config.backgroundOpacity !== undefined) {
			this.settings.set("floatingLyrics.backgroundOpacity", config.backgroundOpacity);
		}
		if (config.align !== undefined) {
			this.settings.set("floatingLyrics.align", config.align);
		}
		this.broadcastState();
	}

	onStateChange(): Observable<FloatingLyricsState> {
		return this._state$.asObservable();
	}

	async OnDestroy(): Promise<void> {
		const win = this.getWindow();
		if (win && !win.isDestroyed()) {
			win.destroy();
			this._window = null;
		}
	}
}
