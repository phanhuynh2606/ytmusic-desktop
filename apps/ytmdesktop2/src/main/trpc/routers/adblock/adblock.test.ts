import { describe, expect, it } from "vitest";
import { isAdOrTrackerUrl } from "./engine";

describe("Adblock URL Detection Engine (isAdOrTrackerUrl)", () => {
	it("blocks Google Ads & DoubleClick networks and anti-adblock domains", () => {
		expect(isAdOrTrackerUrl("https://googleads.g.doubleclick.net/pagead/id")).toBe(true);
		expect(isAdOrTrackerUrl("https://securepubads.g.doubleclick.net/gampad/ads")).toBe(true);
		expect(isAdOrTrackerUrl("https://ad.doubleclick.net/ddm/trackclk/123")).toBe(true);
		expect(isAdOrTrackerUrl("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")).toBe(true);
		expect(isAdOrTrackerUrl("https://tpc.googlesyndication.com/sodar/sodar2.js")).toBe(true);
		expect(isAdOrTrackerUrl("https://www.googleadservices.com/pagead/conversion/123/")).toBe(true);
		expect(isAdOrTrackerUrl("https://adservice.google.com/adsid/google/ui")).toBe(true);
		expect(isAdOrTrackerUrl("https://adservice.google.com.vn/ads")).toBe(true);
		expect(isAdOrTrackerUrl("https://ad.youtube.com/pagead/123")).toBe(true);
		expect(isAdOrTrackerUrl("https://fundingchoicesmessages.google.com/f/id")).toBe(true);
		expect(isAdOrTrackerUrl("https://ep1.adtrafficquality.google/verify")).toBe(true);
	});

	it("blocks telemetry, metrics, and tracking scripts", () => {
		expect(isAdOrTrackerUrl("https://www.google-analytics.com/analytics.js")).toBe(true);
		expect(isAdOrTrackerUrl("https://www.googletagmanager.com/gtm.js?id=GTM-123")).toBe(true);
		expect(isAdOrTrackerUrl("https://www.googletagservices.com/tag/js/gpt.js")).toBe(true);
		expect(isAdOrTrackerUrl("https://play.google.com/log?format=json&hasfast=true")).toBe(true);
	});

	it("blocks YouTube Music ad endpoints and ad stats", () => {
		expect(isAdOrTrackerUrl("https://music.youtube.com/api/stats/ads?v=dQw4w9WgXcQ")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/api/stats/atr?v=dQw4w9WgXcQ")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/ptracking?v=dQw4w9WgXcQ")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/pagead/parallel_ad_stream")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/get_midroll_info?v=dQw4w9WgXcQ")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/youtubei/v1/player/ad_break")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/youtubei/v1/att/get")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/youtubei/v1/log_event")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/youtubei/v1/feedback")).toBe(true);
	});

	it("blocks ad query parameters regardless of parameter position", () => {
		expect(isAdOrTrackerUrl("https://music.youtube.com/api/stats/watchtime?adformat=2_1_1")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/api/playback?ad_type=video_preroll")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/custom_path?adunit=banner_top")).toBe(true);
		// Crucial edge cases: first query param (?ad_flags=1, ?ad=1) without leading '&'
		expect(isAdOrTrackerUrl("https://music.youtube.com/some_service?ad_flags=1")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/some_service?&ad_flags=1")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/some_service?ad=true")).toBe(true);
		expect(isAdOrTrackerUrl("https://music.youtube.com/some_service?foo=bar&ad=1")).toBe(true);
	});

	it("blocks ad video playback when flagged with ad parameters", () => {
		const adPlaybackUrl1 =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?expire=1710000000&id=ad123&itag=140&adformat=1_2_1";
		expect(isAdOrTrackerUrl(adPlaybackUrl1)).toBe(true);

		// First param is ad_type
		const adPlaybackUrl2 =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?ad_type=1&id=ad123&itag=140";
		expect(isAdOrTrackerUrl(adPlaybackUrl2)).toBe(true);

		// Audio ad stream parameter (oad)
		const adPlaybackUrl3 =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?oad=1&id=ad123";
		expect(isAdOrTrackerUrl(adPlaybackUrl3)).toBe(true);

		// Commercial ad tier parameter (ctier=A and case-insensitive ctier=a)
		const adPlaybackUrl4 =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?expire=1710000000&id=ad123&ctier=A";
		expect(isAdOrTrackerUrl(adPlaybackUrl4)).toBe(true);

		const adPlaybackUrl5 =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?expire=1710000000&id=ad123&ctier=a";
		expect(isAdOrTrackerUrl(adPlaybackUrl5)).toBe(true);

		// Stream with ad_flags parameter
		const adPlaybackUrl6 =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?expire=1710000000&id=ad123&ad_flags=1";
		expect(isAdOrTrackerUrl(adPlaybackUrl6)).toBe(true);
	});

	it("allows legitimate music streaming and YouTube Music app pages", () => {
		// Main user navigation pages
		expect(isAdOrTrackerUrl("https://music.youtube.com/")).toBe(false);
		expect(isAdOrTrackerUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
		expect(isAdOrTrackerUrl("https://music.youtube.com/explore")).toBe(false);
		expect(isAdOrTrackerUrl("https://music.youtube.com/library/playlists")).toBe(false);

		// Music audio / video streaming playback URL (MUST NOT BE BLOCKED)
		const normalPlaybackUrl =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?expire=1710000000&id=789abc&itag=140&source=youtube&range=0-1000000";
		expect(isAdOrTrackerUrl(normalPlaybackUrl)).toBe(false);

		// Licensed music track with ctier=L (MUST NOT BE BLOCKED)
		const licensedPlaybackUrl =
			"https://rr1---sn-nx5e6nzs.googlevideo.com/videoplayback?expire=1710000000&id=789abc&ctier=L&itag=140";
		expect(isAdOrTrackerUrl(licensedPlaybackUrl)).toBe(false);

		// Album artwork
		expect(isAdOrTrackerUrl("https://lh3.googleusercontent.com/some_album_art_hash=w120-h120-l90-rj")).toBe(false);
	});

	it("handles malformed or empty inputs gracefully without throwing", () => {
		expect(isAdOrTrackerUrl("")).toBe(false);
		expect(isAdOrTrackerUrl("not-a-valid-url")).toBe(false);
		expect(isAdOrTrackerUrl("javascript:void(0)")).toBe(false);
	});
});
