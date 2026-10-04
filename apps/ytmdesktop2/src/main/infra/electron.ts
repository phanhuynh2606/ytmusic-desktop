import path from "node:path";
import { is } from "@electron-toolkit/utils";
import { Logger, logger } from "@shared/utils/console";
import { ipcPromise } from "@shared/utils/ipcPromise";
import { app, WebContentsView } from "electron";
import { isProduction } from "./devUtils";
import { attachAppLogging } from "./logging";

let isInitialized = false;

export function initializeCustomElectronEnvironment() {
	if (isInitialized) {
		logger.error("app is already initializing");
		app.quit();
		process.exit(0);
	}


	// Optimize CPU, RAM and Audio Process
	app.commandLine.appendSwitch("disk-cache-size", "33554432");
	app.commandLine.appendSwitch("media-cache-size", "33554432");
	app.commandLine.appendSwitch("js-flags", "--max-old-space-size=512");
	app.commandLine.appendSwitch("enable-features", "AudioServiceOutOfProcess,AudioServiceSandbox");
	app.commandLine.appendSwitch("try-supported-channel-layouts");
	app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

	// Isolate dev from installed build - same userData = shared SingleInstanceLock -> silent app.exit().
	if (!isProduction) {
		const appData = app.getPath("appData");
		app.setPath("userData", path.join(appData, "ytmdesktop2-dev"));
		app.commandLine.appendSwitch("disable-web-security");
		app.commandLine.appendSwitch("disable-site-isolation-trials");
		logger.info("dev env", { isDev: is.dev, userData: app.getPath("userData") });
	}
	process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

	const fileLogs = import.meta.env.PROD && !process.env.DEBUG;
	attachAppLogging({ file: fileLogs });
	if (fileLogs) Logger.enableProductionMode();

	process.env.NODE_ENV = import.meta.env.MODE;
	WebContentsView.prototype.invoke = function <T>(channel: string, data: any) {
		return ipcPromise<T>(this, channel, data);
	};
	isInitialized = true;
}
