export const AD_HOST_PATTERNS = [
	"doubleclick.net",
	"googleadservices.com",
	"googlesyndication.com",
	"google-analytics.com",
	"googletagmanager.com",
	"googletagservices.com",
	"pagead2.googlesyndication.com",
	"tpc.googlesyndication.com",
	"adservice.google.",
	"ad.youtube.com",
	"fundingchoicesmessages.google.com",
	"adtrafficquality.google",
];

export const AD_PATH_PATTERNS = [
	"/api/stats/ads",
	"/api/stats/atr",
	"/ptracking",
	"/pagead/",
	"/get_midroll_info",
	"/youtubei/v1/player/ad_break",
	"/youtubei/v1/att/get",
	"/youtubei/v1/log_event",
	"/youtubei/v1/feedback",
];

export const AD_QUERY_KEYS = [
	"adformat",
	"ad_type",
	"adunit",
	"ad_flags",
	"ad",
	"oad",
];

export function isAdOrTrackerUrl(rawUrl: string): boolean {
	try {
		const parsed = new URL(rawUrl);
		const host = parsed.hostname.toLowerCase();
		const path = parsed.pathname.toLowerCase();

		// Check telemetry logging endpoints
		if (host.includes("play.google.com") && path.includes("/log")) {
			return true;
		}

		// Check ad host patterns
		for (const pattern of AD_HOST_PATTERNS) {
			if (host === pattern || host.endsWith("." + pattern) || host.includes(pattern)) {
				return true;
			}
		}

		// Check ad path patterns
		for (const pattern of AD_PATH_PATTERNS) {
			if (path.includes(pattern)) {
				return true;
			}
		}

		// Check ad query parameters on videoplayback (streamed ads)
		if (path.includes("videoplayback")) {
			if (
				parsed.searchParams.has("adformat") ||
				parsed.searchParams.has("ad_type") ||
				parsed.searchParams.has("ad_flags") ||
				parsed.searchParams.has("oad") ||
				parsed.searchParams.get("ctier")?.toUpperCase() === "A"
			) {
				return true;
			}
			return false;
		}

		// Check general ad query parameters across other endpoints
		for (const key of AD_QUERY_KEYS) {
			if (parsed.searchParams.has(key)) {
				return true;
			}
		}

		return false;
	} catch {
		return false;
	}
}
