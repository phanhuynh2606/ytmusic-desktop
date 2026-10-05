import { AfterInit, BaseProvider, OnDestroy } from "@main/core/baseProvider";
import SettingsProvider from "@main/trpc/routers/settings/service";
import { trackService } from "@main/trpc/routers/track";
import { type App, globalShortcut } from "electron";

export interface ShortcutBindings {
	playPause: string;
	next: string;
	prev: string;
	volumeUp: string;
	volumeDown: string;
	mute: string;
	like: string;
	toggleFloatingLyrics: string;
}

export const DEFAULT_SHORTCUTS: ShortcutBindings = {
	playPause: "Shift+Alt+Space",
	next: "Shift+Alt+Right",
	prev: "Shift+Alt+Left",
	volumeUp: "Shift+Alt+Up",
	volumeDown: "Shift+Alt+Down",
	mute: "Shift+Alt+M",
	like: "Shift+Alt+L",
	toggleFloatingLyrics: "Shift+Alt+K",
};

export default class ShortcutService extends BaseProvider implements AfterInit, OnDestroy {
	private isMuted = false;
	private lastVolume = 50;
	private registeredAccelerators: string[] = [];

	constructor(private app: App) {
		super("shortcut");
	}

	private get settings(): SettingsProvider {
		return this.getProvider("settings");
	}

	async AfterInit() {
		this.registerAllShortcuts();

		this.settings.onSettingChange(["shortcuts", "shortcuts.enabled", "shortcuts.bindings"], () => {
			this.registerAllShortcuts();
		});
	}

	private getActionHandler(actionName: keyof ShortcutBindings): (() => Promise<void>) | null {
		switch (actionName) {
			case "playPause":
				return async () => {
					this.logger.info("Shortcut: toggle play/pause");
					await trackService.toggleTrackPlayback();
				};
			case "next":
				return async () => {
					this.logger.info("Shortcut: next track");
					await trackService.nextTrack();
				};
			case "prev":
				return async () => {
					this.logger.info("Shortcut: prev track");
					await trackService.prevTrack();
				};
			case "volumeUp":
				return async () => {
					this.logger.info("Shortcut: volume up");
					const res = await trackService.volumeUpTrack({ amount: 5 });
					if (res && typeof res.volume === "number" && res.volume > 0) {
						this.lastVolume = res.volume;
						this.isMuted = false;
					}
				};
			case "volumeDown":
				return async () => {
					this.logger.info("Shortcut: volume down");
					const res = await trackService.volumeDownTrack({ amount: 5 });
					if (res && typeof res.volume === "number") {
						if (res.volume > 0) {
							this.lastVolume = res.volume;
							this.isMuted = false;
						} else {
							this.isMuted = true;
						}
					}
				};
			case "mute":
				return async () => {
					if (this.isMuted) {
						this.logger.info(`Shortcut: unmute -> ${this.lastVolume}`);
						await trackService.volumeTrack({ volume: this.lastVolume || 50 });
						this.isMuted = false;
					} else {
						try {
							const current = await trackService.volumeTrack();
							if (current && typeof current.volume === "number" && current.volume > 0) {
								this.lastVolume = current.volume;
							}
						} catch (err) {
							this.logger.warn("Could not query current volume before muting:", err);
						}
						this.logger.info(`Shortcut: mute (saving volume ${this.lastVolume})`);
						await trackService.volumeTrack({ volume: 0 });
						this.isMuted = true;
					}
				};
			case "like":
				return async () => {
					const liked = !!trackService.trackState?.liked;
					this.logger.info(`Shortcut: toggle like (was ${liked})`);
					await trackService.postTrackLike(!liked);
				};
			case "toggleFloatingLyrics":
				return async () => {
					this.logger.info("Shortcut: toggle floating lyrics");
					const fl = (this.getProvider as any)("floatingLyrics");
					await fl?.toggle();
				};
			default:
				return null;
		}
	}

	private unregisterAll(): void {
		for (const acc of this.registeredAccelerators) {
			try {
				globalShortcut.unregister(acc);
			} catch {
				// ignore unregister errors
			}
		}
		this.registeredAccelerators = [];
	}

	registerAllShortcuts(): void {
		this.unregisterAll();

		const enabled = !!this.settings.get("shortcuts.enabled", true);
		if (!enabled) {
			this.logger.debug("Shortcuts are disabled in settings");
			return;
		}

		const bindings = (this.settings.get("shortcuts.bindings") as ShortcutBindings) || DEFAULT_SHORTCUTS;

		for (const [actionName, accelerator] of Object.entries(bindings)) {
			if (!accelerator || typeof accelerator !== "string") continue;
			const handler = this.getActionHandler(actionName as keyof ShortcutBindings);
			if (!handler) continue;

			try {
				const success = globalShortcut.register(accelerator, () => {
					handler().catch((err) => {
						this.logger.error(`Error running shortcut action ${actionName}:`, err);
					});
				});

				if (success) {
					this.registeredAccelerators.push(accelerator);
					this.logger.debug(`Registered shortcut [${accelerator}] -> ${actionName}`);
				} else {
					this.logger.warn(`Failed to register shortcut [${accelerator}] -> ${actionName} (may conflict with OS/other app)`);
				}
			} catch (err) {
				this.logger.error(`Invalid accelerator string [${accelerator}]:`, err);
			}
		}
	}

	getBindings(): { enabled: boolean; bindings: ShortcutBindings } {
		const enabled = !!this.settings.get("shortcuts.enabled", true);
		const bindings = { ...DEFAULT_SHORTCUTS, ...((this.settings.get("shortcuts.bindings") as any) || {}) };
		return { enabled, bindings };
	}

	setEnabled(enabled: boolean): void {
		this.settings.set("shortcuts.enabled", enabled);
		this.registerAllShortcuts();
	}

	updateBinding(action: keyof ShortcutBindings, accelerator: string): void {
		const current = this.getBindings().bindings;
		current[action] = accelerator;
		this.settings.set("shortcuts.bindings", current);
		this.registerAllShortcuts();
	}

	resetDefaults(): { enabled: boolean; bindings: ShortcutBindings } {
		this.settings.set("shortcuts.enabled", true);
		this.settings.set("shortcuts.bindings", DEFAULT_SHORTCUTS);
		this.registerAllShortcuts();
		return { enabled: true, bindings: DEFAULT_SHORTCUTS };
	}

	async OnDestroy(): Promise<void> {
		this.unregisterAll();
	}
}
