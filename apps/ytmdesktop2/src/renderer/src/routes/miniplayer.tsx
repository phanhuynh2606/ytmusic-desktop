import { toAppThumbUrl } from "@shared/media/appThumbUrl";
import { createFileRoute } from "@tanstack/react-router";
import { intervalToDuration } from "date-fns";
import { clamp } from "lodash-es";
import {
	Maximize2,
	Minimize2,
	Pause,
	Pin,
	PinOff,
	Play,
	SkipBack,
	SkipForward,
	Sliders,
	Volume2,
	VolumeX,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTrack, useTrackState } from "@/hooks/use-track";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/miniplayer")({
	component: MiniPlayerPage,
});

interface LrcLine {
	timeMs: number;
	text: string;
}

function parseLrc(lrcText: string): LrcLine[] {
	const lines = lrcText.split("\n");
	const result: LrcLine[] = [];
	const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;
		const matches = [...line.matchAll(timeReg)];
		if (!matches.length) continue;
		const text = line.replace(timeReg, "").trim();
		if (!text) continue;

		for (const match of matches) {
			const min = Number.parseInt(match[1], 10);
			const sec = Number.parseInt(match[2], 10);
			const msPart = match[3];
			const ms = msPart.length === 2 ? Number.parseInt(msPart, 10) * 10 : Number.parseInt(msPart, 10);
			const timeMs = min * 60 * 1000 + sec * 1000 + ms;
			result.push({ timeMs, text });
		}
	}

	result.sort((a, b) => a.timeMs - b.timeMs);
	return result;
}

const zeroPad = (num: number | undefined): string => String(num ?? 0).padStart(2, "0");

function formatTime(seconds: number): string {
	const elapsed = Math.max(0, Math.floor(seconds));
	const { hours, minutes, seconds: secs } = intervalToDuration({ start: 0, end: elapsed * 1000 });
	const parts = [hours, minutes, secs].filter((p, i) => (i === 0 ? Boolean(p) : true)).map(zeroPad);
	return parts.join(":");
}

const OPACITY_STEPS = [1, 0.85, 0.7, 0.5];

function MiniPlayerPage() {
	const track = useTrack();
	const playState = useTrackState();
	const utils = trpc.useUtils();

	const { data: playerState } = trpc.miniPlayer.state.useQuery();
	const { mutateAsync: hideMiniPlayer } = trpc.miniPlayer.hide.useMutation();
	const { mutateAsync: setAlwaysOnTop } = trpc.miniPlayer.setAlwaysOnTop.useMutation({
		onSuccess: () => void utils.miniPlayer.state.invalidate(),
	});
	const { mutateAsync: setOpacity } = trpc.miniPlayer.setOpacity.useMutation({
		onSuccess: () => void utils.miniPlayer.state.invalidate(),
	});

	const { mutateAsync: play } = trpc.track.play.useMutation();
	const { mutateAsync: pause } = trpc.track.pause.useMutation();
	const { mutateAsync: next } = trpc.track.next.useMutation();
	const { mutateAsync: prev } = trpc.track.prev.useMutation();
	const { mutateAsync: seek } = trpc.track.seek.useMutation();

	// Lyrics state
	const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
	const [lyricsLoading, setLyricsLoading] = useState(false);
	const lastFetchedIdRef = useRef<string | null>(null);

	const title = track?.video?.title ?? "Chưa phát nhạc";
	const artist = track?.video?.author ?? "Music Desktop App";
	const thumbnail = toAppThumbUrl(track?.meta?.thumbnail);
	const playing = !!playState?.playing;
	const duration = playState?.duration || Number(track?.meta?.duration) || 0;
	const progress = playState?.progress ?? 0;

	const alwaysOnTop = playerState?.alwaysOnTop ?? true;
	const currentOpacity = playerState?.opacity ?? 0.95;

	// Cycle opacity
	const handleCycleOpacity = () => {
		const currentIdx = OPACITY_STEPS.findIndex((s) => Math.abs(s - currentOpacity) < 0.08);
		const nextIdx = (currentIdx + 1) % OPACITY_STEPS.length;
		void setOpacity({ opacity: OPACITY_STEPS[nextIdx] });
	};

	// Fetch lyrics when track changes
	const videoId = track?.video?.videoId;
	useEffect(() => {
		if (!track?.video?.title) {
			setLrcLines([]);
			return;
		}
		if (lastFetchedIdRef.current === videoId && lrcLines.length > 0) {
			return;
		}
		lastFetchedIdRef.current = videoId ?? null;

		let cancelled = false;
		setLyricsLoading(true);

		const searchParams = new URLSearchParams({
			track_name: track.video.title,
			artist_name: track.video.author || "",
		});
		if (duration > 0) {
			searchParams.set("duration", String(Math.round(duration)));
		}

		fetch(`https://lrclib.net/api/get?${searchParams.toString()}`)
			.then(async (res) => {
				if (!res.ok) {
					// Fallback search
					const fallbackRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${track.video.title} ${track.video.author || ""}`)}`);
					if (!fallbackRes.ok) return null;
					const hits = await fallbackRes.json();
					return Array.isArray(hits) && hits.length > 0 ? hits[0] : null;
				}
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				if (data?.syncedLyrics) {
					setLrcLines(parseLrc(data.syncedLyrics));
				} else if (data?.plainLyrics) {
					const lines = (data.plainLyrics as string).split("\n").filter(Boolean);
					setLrcLines(lines.map((text, idx) => ({ timeMs: idx * 4000, text })));
				} else {
					setLrcLines([]);
				}
			})
			.catch(() => {
				if (!cancelled) setLrcLines([]);
			})
			.finally(() => {
				if (!cancelled) setLyricsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [videoId, track?.video?.title, track?.video?.author, duration]);

	// Current lyric line
	const currentLine = useMemo(() => {
		if (!lrcLines.length) return null;
		const curMs = progress * 1000;
		let line = lrcLines[0];
		for (let i = 0; i < lrcLines.length; i++) {
			if (lrcLines[i].timeMs <= curMs + 300) {
				line = lrcLines[i];
			} else {
				break;
			}
		}
		return line?.text || null;
	}, [lrcLines, progress]);

	// Progress percentage
	const progressPercent = duration > 0 ? clamp((progress / duration) * 100, 0, 100) : 0;

	return (
		<div
			className="drag h-screen w-screen p-2.5 flex flex-col justify-between overflow-hidden bg-neutral-950/90 text-white select-none backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl transition-opacity duration-200"
		>
			{/* Top Header: Controls (drag region / no-drag buttons) */}
			<div className="flex items-center justify-between text-xs text-neutral-400 pb-1.5 border-b border-white/5">
				<div className="flex items-center gap-1.5 font-medium tracking-wide text-[11px] text-neutral-300">
					<span className="inline-block size-2 rounded-full bg-red-500 animate-pulse" />
					<span>Mini Player</span>
				</div>

				<div className="no-drag flex items-center gap-1">
					{/* Opacity button */}
					<button
						type="button"
						onClick={handleCycleOpacity}
						title={`Độ mờ: ${Math.round(currentOpacity * 100)}% (Bấm để đổi)`}
						className="size-6 flex items-center justify-center rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-[10px] font-mono"
					>
						{Math.round(currentOpacity * 100)}%
					</button>

					{/* Pin Always on Top */}
					<button
						type="button"
						onClick={() => void setAlwaysOnTop({ alwaysOnTop: !alwaysOnTop })}
						title={alwaysOnTop ? "Đang ghim trên cùng (Click để bỏ ghim)" : "Ghim cửa sổ trên cùng"}
						className={cn(
							"size-6 flex items-center justify-center rounded-md transition-colors cursor-pointer",
							alwaysOnTop ? "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30" : "hover:bg-white/10 hover:text-white",
						)}
					>
						{alwaysOnTop ? <Pin className="size-3" /> : <PinOff className="size-3" />}
					</button>

					{/* Close Mini Player */}
					<button
						type="button"
						onClick={() => void hideMiniPlayer()}
						title="Đóng Mini Player"
						className="size-6 flex items-center justify-center rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
					>
						<X className="size-3.5" />
					</button>
				</div>
			</div>

			{/* Main Body: Cover art + Info + Synced Lyrics */}
			<div className="flex items-center gap-3 py-1">
				{/* Cover Thumbnail */}
				<div className="relative size-14 shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shadow-md">
					{thumbnail ? (
						<img src={thumbnail} alt={title} className="size-full object-cover pointer-events-none" />
					) : (
						<div className="size-full flex items-center justify-center text-xs font-semibold text-neutral-600">
							YTM
						</div>
					)}
				</div>

				{/* Title, Artist and Lyrics */}
				<div className="flex-1 min-w-0 flex flex-col justify-center">
					<div className="font-semibold text-xs text-white truncate drop-shadow-sm" title={title}>
						{title}
					</div>
					<div className="text-[11px] text-neutral-400 truncate mt-0.5" title={artist}>
						{artist}
					</div>

					{/* Mini Lyrics Line */}
					<div className="mt-1 h-4 flex items-center overflow-hidden">
						{currentLine ? (
							<span className="text-[11px] font-medium text-emerald-400 truncate animate-in fade-in duration-300">
								🎵 {currentLine}
							</span>
						) : lyricsLoading ? (
							<span className="text-[10px] text-neutral-500 italic">Đang tải lời bài hát...</span>
						) : (
							<span className="text-[10px] text-neutral-500 italic">Music Desktop App</span>
						)}
					</div>
				</div>
			</div>

			{/* Bottom: Progress bar + Playback Controls */}
			<div className="no-drag flex flex-col gap-1.5">
				{/* Progress bar */}
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
						{formatTime(progress)}
					</span>
					<div
						className="relative flex-1 h-1.5 bg-neutral-800 rounded-full cursor-pointer overflow-hidden group"
						onClick={(e) => {
							if (duration <= 0) return;
							const rect = e.currentTarget.getBoundingClientRect();
							const clickX = e.clientX - rect.left;
							const pct = clamp(clickX / rect.width, 0, 1);
							void seek({ time: pct * duration });
						}}
					>
						<div
							className="h-full bg-red-500 group-hover:bg-red-400 rounded-full transition-all duration-100"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<span className="text-[10px] font-mono text-neutral-400 w-8">
						{formatTime(duration)}
					</span>
				</div>

				{/* Controls */}
				<div className="flex items-center justify-center gap-4 pt-0.5">
					<button
						type="button"
						disabled={!track}
						onClick={() => void prev()}
						title="Bài trước"
						className="size-7 flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
					>
						<SkipBack className="size-3.5 fill-current" />
					</button>

					<button
						type="button"
						disabled={!track}
						onClick={() => void (playing ? pause() : play())}
						title={playing ? "Tạm dừng" : "Phát"}
						className="size-8 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 disabled:opacity-40 shadow-lg transition-all cursor-pointer"
					>
						{playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
					</button>

					<button
						type="button"
						disabled={!track}
						onClick={() => void next()}
						title="Bài tiếp theo"
						className="size-7 flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
					>
						<SkipForward className="size-3.5 fill-current" />
					</button>
				</div>
			</div>
		</div>
	);
}
