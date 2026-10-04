import type { RendererPluginRegistration } from "./world0/types";

const CSS_HIDE_ADS = `
ytmusic-player-page #ad-slot,
.ytmusic-in-feed-ad-layout,
ytmusic-ad-banner-renderer,
ytd-promoted-sparkles-web-renderer,
ytmusic-mealbar-promo-renderer,
ytmusic-upsell-dialog-renderer,
ytmusic-banner-promo-renderer,
ytmusic-statement-banner-renderer,
.ytp-ad-overlay-container,
.ytp-ad-overlay-slot,
.ytp-ad-image-overlay,
.ytp-ad-text-overlay,
#masthead-ad,
.ytp-ad-message-container,
.ytp-ad-progress-list,
.ytp-ad-preview-container,
tp-yt-paper-dialog:has(ytmusic-mealbar-promo-renderer),
tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer),
tp-yt-paper-dialog:has(ytmusic-banner-promo-renderer),
ytmusic-popup-container ytmusic-mealbar-promo-renderer {
	display: none !important;
}
`;

const SKIP_BUTTON_SELECTORS = [
	".ytp-ad-skip-button",
	".ytp-ad-skip-button-modern",
	".ytp-skip-ad-button",
	".ytp-ad-skip-button-slot button",
	".ytp-ad-skip-button-container button",
	"button.ytp-ad-skip-button-text",
	"button.ytp-ad-skip-button",
	".videoAdUiSkipButton",
	"[id*='skip-button'] button",
	"button.ytp-ad-overlay-close-button",
	"[aria-label='Skip ad']",
	"[aria-label='Bỏ qua quảng cáo']",
	"[aria-label*='Skip']",
	"[aria-label*='Bỏ qua']",
];

// Module-level state accessible by onConfigChange & start hooks
let isEnabled = true;
let styleEl: HTMLStyleElement | null = null;
let lastSkippedTime = 0;
let wasAdShowing = false;
let originalMuted = false;
let originalPlaybackRate = 1;

function applyEnabledState(next: boolean, log?: { info: (...args: any[]) => void }) {
	if (isEnabled === next && styleEl && styleEl.disabled !== !next) {
		styleEl.disabled = !next;
	}
	isEnabled = next;
	if (styleEl) {
		styleEl.disabled = !isEnabled;
	}
	if (!isEnabled) {
		// Adblock turned OFF: restore video playback and unfreeze sound immediately
		const video = document.querySelector<HTMLVideoElement>("video");
		if (video) {
			if (video.playbackRate > 2) video.playbackRate = originalPlaybackRate || 1;
			if (wasAdShowing && video.muted && !originalMuted) video.muted = false;
		}
		wasAdShowing = false;
		log?.info("Adblock disabled: styling and video state restored");
	}
}

const adblockRenderer: RendererPluginRegistration = {
	id: "adblock",
	enabled: true,
	start(ctx) {
		// Load initial enabled setting
		ctx.ytmd?.settings
			?.get("adblock.enabled")
			.then((val) => {
				if (typeof val === "boolean") {
					applyEnabledState(val, ctx.log);
				}
			})
			.catch(() => {});

		// 1. Inject CSS to hide banner ads & promo popups
		const existingStyle = document.getElementById("ytmd-adblock-styles");
		if (existingStyle && existingStyle.parentNode) {
			existingStyle.parentNode.removeChild(existingStyle);
		}
		styleEl = document.createElement("style");
		styleEl.id = "ytmd-adblock-styles";
		styleEl.textContent = CSS_HIDE_ADS;
		styleEl.disabled = !isEnabled;
		(document.head || document.documentElement).appendChild(styleEl);

		// Listen to settingsProvider changes directly
		const offSettings = ctx.ytmd?.on("settingsProvider.change", (key, value) => {
			if (key === "adblock.enabled") {
				applyEnabledState(Boolean(value), ctx.log);
			} else if (key === "adblock" && value && typeof value === "object") {
				applyEnabledState((value as { enabled?: boolean }).enabled !== false, ctx.log);
			}
		});

		// 2. Intercept window.fetch to strip player ads in page world
		const originalFetch = window.fetch;
		window.fetch = async function (...args: Parameters<typeof originalFetch>) {
			const res = await originalFetch.apply(this, args);
			try {
				if (!isEnabled || !res.ok) return res;
				const input = args[0];
				const url =
					typeof input === "string"
						? input
						: input instanceof Request
							? input.url
							: input instanceof URL
								? input.href
								: String(input || "");
				if (url.includes("/youtubei/v1/player")) {
					const clone = res.clone();
					const data = await clone.json();
					if (
						data &&
						(data.adPlacements ||
							data.adSlots ||
							data.playerAds ||
							data.adBreakHeartbeatParams ||
							data.adConfig)
					) {
						delete data.adPlacements;
						delete data.adSlots;
						delete data.playerAds;
						delete data.adBreakHeartbeatParams;
						delete data.adConfig;
						ctx.log.info("Ad placements stripped from /youtubei/v1/player payload");
						ctx.ytmd?.emit("adblock:dom-blocked", 1);
						const newHeaders = new Headers(res.headers);
						newHeaders.delete("content-encoding");
						newHeaders.delete("content-length");
						return new Response(JSON.stringify(data), {
							status: res.status,
							statusText: res.statusText,
							headers: newHeaders,
						});
					}
				}
			} catch {
				// Fallback to original response on parsing error
			}
			return res;
		};

		// 3. Auto-skip video ads fallback with accurate state restoration
		const checkAndSkipAd = () => {
			const video = document.querySelector<HTMLVideoElement>("video");

			if (!isEnabled) {
				if (wasAdShowing) {
					wasAdShowing = false;
					if (video) {
						if (video.playbackRate > 2) video.playbackRate = originalPlaybackRate || 1;
						if (video.muted && !originalMuted) video.muted = false;
					}
				}
				return;
			}

			const moviePlayer = document.getElementById("movie_player") as { getAdState?: () => number } | null;
			const isPlayerAd = typeof moviePlayer?.getAdState === "function" && moviePlayer.getAdState() > 0;
			const isAdShowing =
				isPlayerAd ||
				document.querySelector(
					".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-preview-text, .ytp-ad-skip-button-slot, .video-ads .ytp-ad-module > *",
				) !== null;

			if (!isAdShowing) {
				// Ad ended or no ad: restore regular music playback rate and unmuted audio
				if (wasAdShowing) {
					wasAdShowing = false;
					if (video) {
						if (video.playbackRate > 2) video.playbackRate = originalPlaybackRate || 1;
						if (video.muted && !originalMuted) video.muted = false;
					}
					ctx.log.info("Ad ended: restored regular playback rate and unmuted");
				} else if (video && video.playbackRate > 2) {
					// Guard against dangling 16x speed
					video.playbackRate = 1;
				}
				return;
			}

			// Ad is actively displaying!
			if (!wasAdShowing) {
				wasAdShowing = true;
				originalMuted = video?.muted ?? false;
				originalPlaybackRate = video && video.playbackRate <= 2 ? video.playbackRate : 1;
			}

			if (video) {
				// Mute audio instantly to prevent ad noise
				video.muted = true;
				// Fast-forward at 16x speed
				video.playbackRate = 16;
				// Jump to end of ad video once if duration is available (avoid repeated seeking thrashing)
				if (Number.isFinite(video.duration) && video.duration > 0 && video.duration - video.currentTime > 0.5) {
					video.currentTime = video.duration;
				}
			}

			// Click skip button immediately
			for (const sel of SKIP_BUTTON_SELECTORS) {
				const skipBtn = document.querySelector<HTMLElement>(sel);
				if (skipBtn) {
					skipBtn.click();
					break;
				}
			}

			// Dismiss promo dialogs if present
			const dismissBtns = document.querySelectorAll<HTMLElement>(
				"ytmusic-mealbar-promo-renderer #dismiss-button button, ytmusic-upsell-dialog-renderer #dismiss-button button, ytmusic-mealbar-promo-renderer [aria-label='Dismiss'], ytmusic-upsell-dialog-renderer [aria-label='Dismiss']",
			);
			for (const btn of dismissBtns) {
				btn.click();
			}

			const now = Date.now();
			if (now - lastSkippedTime > 1500) {
				lastSkippedTime = now;
				ctx.ytmd?.emit("adblock:dom-blocked", 1);
				ctx.log.info("Video ad detected & auto-skipped");
			}
		};

		const observer = new MutationObserver(() => {
			checkAndSkipAd();
		});

		observer.observe(document.body || document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"],
		});

		const intervalId = window.setInterval(checkAndSkipAd, 150);

		return () => {
			observer.disconnect();
			window.clearInterval(intervalId);
			offSettings?.();
			if (styleEl?.parentNode) {
				styleEl.parentNode.removeChild(styleEl);
				styleEl = null;
			}
			window.fetch = originalFetch;
		};
	},
	onConfigChange(key, value, ctx) {
		if (key === "adblock.enabled") {
			applyEnabledState(Boolean(value), ctx?.log);
		} else if (key === "adblock" && value && typeof value === "object") {
			applyEnabledState((value as { enabled?: boolean }).enabled !== false, ctx?.log);
		}
	},
};

export default adblockRenderer;
