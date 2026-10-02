import {
	DEFAULT_EQUALIZER_CONFIG,
	type EqualizerConfig,
} from "./resources/equalizer/constants";
import { equalizerEngine } from "./resources/equalizer/engine";
import type { RendererPluginRegistration } from "./world0/types";

const SETTING_KEY = "equalizer";

const equalizerRenderer: RendererPluginRegistration = {
	id: "equalizer",
	enabled: true,
	async start(ctx) {
		let currentConfig: EqualizerConfig = { ...DEFAULT_EQUALIZER_CONFIG };

		// Thử kết nối ngay nếu thẻ video đã có sẵn
		equalizerEngine.init();

		// Theo dõi DOM phòng trường hợp thẻ video được tạo muộn
		const observer = new MutationObserver(() => {
			const video = document.querySelector<HTMLVideoElement>("video");
			if (video) {
				const connected = equalizerEngine.init(video);
				if (connected) {
					equalizerEngine.applyConfig(currentConfig);
				}
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });

		// Lắng nghe thay đổi cấu hình từ Settings
		const offSettings = ctx.ytmd?.on("settingsProvider.change", (key, value) => {
			if (key === SETTING_KEY && value && typeof value === "object") {
				currentConfig = { ...DEFAULT_EQUALIZER_CONFIG, ...(value as EqualizerConfig) };
				equalizerEngine.applyConfig(currentConfig);
			} else if (typeof key === "string" && key.startsWith("equalizer.")) {
				void ctx.ytmd?.settings.get(SETTING_KEY).then((v) => {
					if (v && typeof v === "object") {
						currentConfig = { ...DEFAULT_EQUALIZER_CONFIG, ...(v as EqualizerConfig) };
						equalizerEngine.applyConfig(currentConfig);
					}
				});
			}
		});

		// Nạp cấu hình ban đầu
		try {
			const saved = await ctx.ytmd?.settings.get(SETTING_KEY);
			if (saved && typeof saved === "object") {
				currentConfig = { ...DEFAULT_EQUALIZER_CONFIG, ...(saved as EqualizerConfig) };
				equalizerEngine.applyConfig(currentConfig);
			}
		} catch {
			/* ignore */
		}

		return () => {
			observer.disconnect();
			offSettings?.();
			equalizerEngine.destroy();
		};
	},
	onPlayerApiReady(_playerApi, ctx) {
		equalizerEngine.init();
		void ctx.ytmd?.settings.get(SETTING_KEY).then((v) => {
			if (v && typeof v === "object") {
				equalizerEngine.applyConfig({ ...DEFAULT_EQUALIZER_CONFIG, ...(v as EqualizerConfig) });
			}
		});
	},
};

export default equalizerRenderer;
