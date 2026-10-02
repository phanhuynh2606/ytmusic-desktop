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
			label: t.tray.quit,
			click: () => serverMain.emit("app.quit", null, true),
		},
	]);
	return menu;
};
