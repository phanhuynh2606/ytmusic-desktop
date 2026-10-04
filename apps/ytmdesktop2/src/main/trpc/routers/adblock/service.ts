import { EventEmitter } from "node:events";
import { AfterInit, BaseProvider, OnDestroy, OnInit } from "@main/core/baseProvider";
import { serverMain } from "@main/ipc/serverEvents";
import { getAppWindows, getYoutubeView } from "@main/lifecycle";
import SettingsProvider from "@main/trpc/routers/settings/service";
import { createAppWindow } from "@main/windows/windowUtils";
import { type App, BrowserWindow, screen, session } from "electron";
import { debounce } from "lodash-es";

import { isAdOrTrackerUrl } from "./engine";

export interface AdblockState {
	enabled: boolean;
	blockedThisPage: number;
	blockedTotal: number;
	domain: string;
}

export { isAdOrTrackerUrl };

export default class AdblockProvider extends BaseProvider implements OnInit, AfterInit, OnDestroy {
	private enabled = true;
	private blockedThisPage = 0;
	private blockedTotal = 0;
	private readonly domain = "music.youtube.com";
	private readonly emitter = new EventEmitter();
	private popupWindow: BrowserWindow | null = null;
	private openingPopup = false;
	private removeIpcHandler: (() => void) | null = null;
	private removeNavListeners: (() => void) | null = null;
	private lastClosedAt = 0;

	private readonly saveTotal = debounce(() => {
		try {
			this.settings.set("adblock.blockedTotal", this.blockedTotal);
		} catch (err) {
			this.logger.error("Failed to save adblock.blockedTotal:", err);
		}
	}, 500);

	private readonly broadcast = debounce(() => {
		const state = this.getState();
		this.emitter.emit("change", state);
		serverMain.emit("adblock.state", null, state);
	}, 100);

	constructor(private electronApp: App) {
		super("adblock");
	}

	private get settings(): SettingsProvider {
		return this.getProvider("settings");
	}

	async OnInit() {
		try {
			this.enabled = !!this.settings.get("adblock.enabled", true);
			this.blockedTotal = Math.max(0, Number(this.settings.get("adblock.blockedTotal", 0)) || 0);
		} catch {
			this.enabled = true;
			this.blockedTotal = 0;
		}

		// Register webRequest network blocker
		session.defaultSession.webRequest.onBeforeRequest(
			{ urls: ["*://*/*"] },
			(details, callback) => {
				if (!this.enabled) {
					callback({ cancel: false });
					return;
				}

				if (isAdOrTrackerUrl(details.url)) {
					this.incrementBlockCount();
					callback({ cancel: true });
					return;
				}

				callback({ cancel: false });
			},
		);

		// Handle dom-blocked reports from renderer plugin
		const onDomBlocked = (_ev: unknown, count?: number) => {
			this.reportDomBlocked(typeof count === "number" ? count : 1);
		};
		serverMain.on("adblock:dom-blocked", onDomBlocked);
		this.removeIpcHandler = () => {
			serverMain.off("adblock:dom-blocked", onDomBlocked);
		};

		this.logger.info(`AdblockProvider initialized (enabled: ${this.enabled}, total blocked: ${this.blockedTotal})`);
	}

	async AfterInit() {
		this.removeNavListeners?.();
		// Hook navigation events on youtubeView to reset blockedThisPage
		const ytView = getYoutubeView();
		if (ytView && !ytView.webContents.isDestroyed()) {
			const onNav = () => {
				this.resetPageCount();
			};
			ytView.webContents.on("did-navigate", onNav);
			ytView.webContents.on("did-navigate-in-page", onNav);
			this.removeNavListeners = () => {
				if (!ytView.webContents.isDestroyed()) {
					ytView.webContents.off("did-navigate", onNav);
					ytView.webContents.off("did-navigate-in-page", onNav);
				}
			};
		}
	}

	async OnDestroy() {
		this.saveTotal.flush();
		try {
			session.defaultSession.webRequest.onBeforeRequest(null as any);
		} catch {}
		this.removeNavListeners?.();
		this.removeIpcHandler?.();
		this.closePopup();
	}

	getState(): AdblockState {
		return {
			enabled: this.enabled,
			blockedThisPage: this.blockedThisPage,
			blockedTotal: this.blockedTotal,
			domain: this.domain,
		};
	}

	onStateChange(listener: (state: AdblockState) => void): () => void {
		this.emitter.on("change", listener);
		return () => {
			this.emitter.off("change", listener);
		};
	}

	incrementBlockCount(count = 1): void {
		if (!this.enabled) return;
		const validCount = Math.max(1, Math.min(100, Math.floor(Number(count) || 1)));
		this.blockedThisPage += validCount;
		this.blockedTotal += validCount;
		this.saveTotal();
		this.broadcast();
	}

	reportDomBlocked(count = 1): AdblockState {
		this.incrementBlockCount(count);
		return this.getState();
	}

	resetPageCount(): void {
		this.blockedThisPage = 0;
		this.broadcast();
	}

	setEnabled(enabled: boolean): AdblockState {
		this.enabled = enabled;
		try {
			this.settings.set("adblock.enabled", enabled);
		} catch (err) {
			this.logger.error("Failed to save adblock.enabled setting:", err);
		}
		this.broadcast();
		return this.getState();
	}

	toggle(): AdblockState {
		return this.setEnabled(!this.enabled);
	}

	reloadPage(): void {
		const ytView = getYoutubeView();
		if (ytView && !ytView.webContents.isDestroyed()) {
			ytView.webContents.reload();
		}
	}

	async openPopup(coords?: { x?: number; y?: number }) {
		if (this.openingPopup) {
			return;
		}

		if (this.popupWindow && !this.popupWindow.isDestroyed()) {
			this.closePopup();
			return;
		}

		// Prevent re-opening immediately if it was just closed via blur (e.g. click on shield button)
		if (Date.now() - this.lastClosedAt < 250) {
			return;
		}

		this.openingPopup = true;
		try {
			const width = 320;
			const height = 380;

			let targetX: number | undefined;
			let targetY: number | undefined;

			if (typeof coords?.x === "number" && typeof coords?.y === "number") {
				const display = screen.getDisplayNearestPoint({ x: coords.x, y: coords.y });
				const workArea = display.workArea;

				targetX = Math.round(coords.x - width / 2);
				targetY = Math.round(coords.y);

				// Clamp to work area
				targetX = Math.max(workArea.x + 8, Math.min(targetX, workArea.x + workArea.width - width - 8));
				targetY = Math.max(workArea.y + 8, Math.min(targetY, workArea.y + workArea.height - height - 8));
			}

			this.popupWindow = await createAppWindow({
				path: "/adblock",
				width,
				height,
				minWidth: width,
				minHeight: height,
				maxWidth: width,
				maxHeight: height,
				show: false,
				showTaskBar: false,
				minimizeable: false,
				maximizeable: false,
				devtools: false,
			});

			if (targetX !== undefined && targetY !== undefined) {
				this.popupWindow.setPosition(targetX, targetY);
			} else {
				const mainWin =
					this.windowContext?.main ||
					getAppWindows()?.main ||
					BrowserWindow.getAllWindows().find((w) => w !== this.popupWindow);
				if (mainWin && !mainWin.isDestroyed()) {
					const bounds = mainWin.getBounds();
					this.popupWindow.setPosition(
						Math.round(bounds.x + bounds.width - width - 24),
						Math.round(bounds.y + 40),
					);
				}
			}

			this.popupWindow.setResizable(false);
			this.popupWindow.setAlwaysOnTop(true, "floating");
			this.popupWindow.show();
			this.popupWindow.focus();

			this.popupWindow.on("blur", () => {
				this.closePopup();
			});

			this.popupWindow.on("closed", () => {
				this.popupWindow = null;
			});
		} finally {
			this.openingPopup = false;
		}
	}

	closePopup() {
		this.lastClosedAt = Date.now();
		if (this.popupWindow && !this.popupWindow.isDestroyed()) {
			this.popupWindow.close();
			this.popupWindow = null;
		}
	}
}
