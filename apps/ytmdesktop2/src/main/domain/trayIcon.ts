import { platform } from "@electron-toolkit/utils";
import { createLogger } from "@shared/utils/console";
import { NativeImage, nativeImage, nativeTheme } from "electron";
import { existsSync, readFileSync } from "fs";
import trayIconIco from "~/build/favicon.ico?asset";
import trayIconIcoLight from "~/build/favicon-light.ico?asset";
import trayIconIcns from "~/src/renderer/src/assets/icons/mac/icon.icns?asset";
import trayIconIcnsLight from "~/src/renderer/src/assets/icons/mac/icon-light.icns?asset";
import trayIconPng from "~/src/renderer/src/assets/icons/png/32x32.png?asset";
import trayIconPngLight from "~/src/renderer/src/assets/icons/png/32x32-light.png?asset";

const log = createLogger("trayIcon");

/** Prefer asar.unpacked so createFromPath works in packaged builds. */
function resolveAssetPath(assetPath: string): string {
	if (!assetPath) return assetPath;
	if (assetPath.includes("app.asar.unpacked")) return assetPath;
	if (assetPath.includes("app.asar")) return assetPath.replace("app.asar", "app.asar.unpacked");
	return assetPath;
}

function candidatePaths(assetPath: string): string[] {
	const unpacked = resolveAssetPath(assetPath);
	return unpacked !== assetPath ? [unpacked, assetPath] : [assetPath];
}

/**
 * ICNS must be loaded from a real file path (NSImage); createFromBuffer often fails.
 * PNG/ICO can use buffer (works inside asar) with path fallback.
 */
function loadTrayImage(assetPath: string): NativeImage {
	if (!assetPath) return nativeImage.createEmpty();

	const isIcns = /\.icns$/i.test(assetPath);

	for (const candidate of candidatePaths(assetPath)) {
		if (isIcns) {
			try {
				if (!existsSync(candidate)) continue;
				const img = nativeImage.createFromPath(candidate);
				if (!img.isEmpty()) return img;
				log.warn("tray icns decoded empty", candidate);
			} catch (err) {
				log.warn("tray icns path load failed", candidate, err);
			}
			continue;
		}

		try {
			if (!existsSync(candidate)) continue;
			const img = nativeImage.createFromBuffer(readFileSync(candidate));
			if (!img.isEmpty()) return img;
			log.warn("tray asset decoded empty", candidate);
		} catch (err) {
			log.warn("tray asset buffer load failed", candidate, err);
		}
		try {
			const img = nativeImage.createFromPath(candidate);
			if (!img.isEmpty()) return img;
		} catch (err) {
			log.warn("tray asset path load failed", candidate, err);
		}
	}

	return nativeImage.createEmpty();
}

function sizeForTray(img: NativeImage): NativeImage {
	if (img.isEmpty()) return img;

	if (platform.isMacOS) {
		// Menu bar expects ~16pt. A bare 32×32 NativeImage is treated as 32pt and fills the bar.
		const oneX = img.resize({ width: 16, height: 16 });
		const twoX = img.resize({ width: 32, height: 32 });
		try {
			oneX.addRepresentation({ scaleFactor: 2, buffer: twoX.toPNG() });
		} catch (err) {
			log.warn("tray @2x representation failed", err);
		}
		return oneX;
	}

	return img.resize({ width: 24, height: 24 });
}

/**
 * Tray / menu-bar icon.
 * Windows: ICO. macOS: ICNS then PNG. Linux: PNG.
 */
export function createTrayNativeImage(): NativeImage {
	const isDark = nativeTheme.shouldUseDarkColors;
	const icoPath = isDark ? trayIconIco : trayIconIcoLight;
	const icnsPath = isDark ? trayIconIcns : trayIconIcnsLight;
	const pngPath = isDark ? trayIconPng : trayIconPngLight;

	if (platform.isWindows) {
		const ico = loadTrayImage(icoPath);
		if (!ico.isEmpty()) return ico;
	}

	if (platform.isMacOS) {
		const icns = loadTrayImage(icnsPath);
		if (!icns.isEmpty()) return sizeForTray(icns);
	}

	const png = loadTrayImage(pngPath);
	if (!png.isEmpty()) return sizeForTray(png);

	// Last resort — build/ favicon / 32x32 if assets path missing in some builds.
	return sizeForTray(loadTrayImage(icoPath));
}
