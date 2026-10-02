import { BaseProvider } from "@main/core/baseProvider";
import { serverMain } from "@main/ipc/serverEvents";
import AppProvider from "@main/trpc/routers/app/service";
import SettingsProvider from "@main/trpc/routers/settings/service";
import { getTranslations } from "@translations/index";
import { Menu, shell } from "electron";

export const createTrayMenu = (provider: BaseProvider) => {
	const settings = provider.getProvider("settings") as SettingsProvider;
	const { instance: sp } = settings;
	const appProvider = provider.getProvider("app") as AppProvider;
	const { app } = appProvider;
	const update = provider.getProvider("update");
	const lang = sp.app.language ?? "vi";
	const t = getTranslations(lang);

	const sleepTimer = (provider.getProvider as any)("sleepTimer");
	const st = sleepTimer?.getState();

	const menu = Menu.buildFromTemplate([
		{
			label: t.appName,
			sublabel: `${t.version}: ${app.getVersion()}`,
			click: () => serverMain.emit("app.trayState", null, "visible"),
		},
		{
			label: update.updateAvailable
				? (update.updateInfo?.version
					? `${t.tray.updateAvailable} - v${update.updateInfo.version}`
					: t.tray.updateAvailable)
				: t.tray.checkUpdates,
			click: () => {
				if (update.updateAvailable) void update.onAutoUpdateRun(null, false);
				else void update.onCheckUpdate({ forceDialog: true });
			},
		},
		{
			type: "separator",
		},
		{
			label: t.tray.autoStartup,
			type: "checkbox",
			checked: sp.app.autostart,
			click: (item) => {
				settings.set("app.autostart", item.checked);
			},
		},
		{
			label: t.tray.autoUpdate,
			type: "checkbox",
			checked: sp.app.autoupdate,
			click: (item) => {
				settings.set("app.autoupdate", item.checked);
			},
		},
		{
			label: t.tray.quitToTray,
			type: "checkbox",
			checked: sp.app.minimizeTrayOverride,
			click: (item) => {
				settings.set("app.minimizeTrayOverride", item.checked);
			},
		},
		{
			type: "separator",
		},
		{
			label: t.tray.settings,
			click: () => {
				void appProvider.openSettingsWindow();
			},
		},
		{
			type: "separator",
		},
		{
			type: "submenu",
			label: t.tray.discord,
			submenu: [
				{
					label: t.tray.showPresence,
					type: "checkbox",
					checked: sp.discord.enabled,
					click: (item) => {
						settings.set("discord.enabled", item.checked);
					},
				},
				{
					label: t.tray.showButtons,
					type: "checkbox",
					checked: sp.discord.buttons,
					click: (item) => {
						settings.set("discord.buttons", item.checked);
					},
				},
			],
		},
		{
			type: "separator",
		},
		{
			type: "submenu",
			label: t.tray.themes,
			submenu: [
				{
					label: t.tray.enableThemes,
					type: "checkbox",
					checked: sp.themes.enabled,
					click: (item) => {
						settings.set("themes.enabled", item.checked);
					},
				},
				{
					label: t.tray.openCustomTheme,
					enabled: sp.themes.enabled && sp.themes.selected === "custom" && !!sp.themes.customFile,
					click: (item) => {
						if (item.enabled && sp.themes?.customFile) void shell.openPath(sp.themes.customFile!);
					},
				},
				{
					label: t.tray.changeTheme,
					enabled: sp.themes.enabled,
					click: (item) => {
						if (item.enabled) void appProvider.openSettingsWindow();
					},
				},
			],
		},
		{
			type: "separator",
		},
		{
			type: "submenu",
			label: "⏰ Hẹn giờ tắt nhạc (Sleep Timer)",
			submenu: [
				...(st?.active
					? [
							{
								label: `⏳ Đang đếm: ${
									st.trackEnd
										? "Hết bài hiện tại"
										: `${Math.floor((st.remainingSeconds ?? 0) / 60)}:${((st.remainingSeconds ?? 0) % 60).toString().padStart(2, "0")}`
								}`,
								enabled: false,
							},
							{
								label: "❌ Hủy hẹn giờ",
								click: () => {
									sleepTimer?.cancelTimer();
								},
							},
							{ type: "separator" as const },
						]
					: []),
				{
					label: "Hết bài hát hiện tại",
					type: "checkbox",
					checked: !!st?.active && !!st?.trackEnd,
					click: () => {
						sleepTimer?.setTimer({ trackEnd: true, mode: st?.mode ?? "pause" });
					},
				},
				{
					label: "15 phút",
					type: "checkbox",
					checked: !!st?.active && st?.targetDurationMinutes === 15,
					click: () => {
						sleepTimer?.setTimer({ durationMinutes: 15, mode: st?.mode ?? "pause" });
					},
				},
				{
					label: "30 phút",
					type: "checkbox",
					checked: !!st?.active && st?.targetDurationMinutes === 30,
					click: () => {
						sleepTimer?.setTimer({ durationMinutes: 30, mode: st?.mode ?? "pause" });
					},
				},
				{
					label: "45 phút",
					type: "checkbox",
					checked: !!st?.active && st?.targetDurationMinutes === 45,
					click: () => {
						sleepTimer?.setTimer({ durationMinutes: 45, mode: st?.mode ?? "pause" });
					},
				},
				{
					label: "1 giờ",
					type: "checkbox",
					checked: !!st?.active && st?.targetDurationMinutes === 60,
					click: () => {
						sleepTimer?.setTimer({ durationMinutes: 60, mode: st?.mode ?? "pause" });
					},
				},
			],
		},
		{
			type: "separator",
		},
		{
			label: "🪟 Cửa sổ Mini Player nổi",
			click: () => {
				const miniPlayer = (provider.getProvider as any)("miniPlayer");
				void miniPlayer?.toggle();
			},
		},
		{
			type: "separator",
		},
		{
			label: t.tray.quit,
			click: () => serverMain.emit("app.quit", null, true),
		},
	]);
	return menu;
};
