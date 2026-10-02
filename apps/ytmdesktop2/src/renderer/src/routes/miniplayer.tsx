import { toAppThumbUrl } from "@shared/media/appThumbUrl";
import { createFileRoute } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { intervalToDuration } from "date-fns";
import { clamp } from "lodash-es";
import { Pin, PinOff, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type ButtonHTMLAttributes,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import LikeIcon from "@/assets/icons/like.svg?react";
import NextIcon from "@/assets/icons/next.svg?react";
import PauseIcon from "@/assets/icons/pause.svg?react";
import PlayIcon from "@/assets/icons/play.svg?react";
import PrevIcon from "@/assets/icons/prev.svg?react";
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

const ART_EASE = [0.16, 1, 0.3, 1] as const;
const ART_DURATION = 0.28;

function useReadyImage(src: string | null | undefined): string | null {
	const [ready, setReady] = useState<string | null>(null);

	useEffect(() => {
		if (!src) {
			setReady(null);
			return;
		}
		let cancelled = false;
		const img = new Image();
		const done = () => {
			if (!cancelled) setReady(src);
		};
		img.onload = done;
		img.onerror = done;
		img.src = src;
		if (img.complete) done();
		return () => {
			cancelled = true;
			img.onload = null;
			img.onerror = null;
		};
	}, [src]);

	return ready;
}

function useAlignedArtDisplay(thumbnail: string | null | undefined, liveAccent: string | null) {
	const loadedSrc = useReadyImage(thumbnail);
	const [display, setDisplay] = useState<{ src: string | null; accent: string | null }>({ src: null, accent: null });

	useLayoutEffect(() => {
		const commit = (src: string | null, accent: string | null) => {
			setDisplay((prev) => (prev.src === src && prev.accent === accent ? prev : { src, accent }));
		};

		if (!thumbnail) {
			commit(null, null);
			return;
		}
		if (loadedSrc !== thumbnail) return;

		if (liveAccent) {
			commit(loadedSrc, liveAccent);
			return;
		}

		const timer = window.setTimeout(() => commit(loadedSrc, liveAccent), 80);
		return () => clearTimeout(timer);
	}, [thumbnail, loadedSrc, liveAccent]);

	return display;
}

function BleedArtBackground({ src, accent }: { src: string | null; accent: string | null }) {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
			<AnimatePresence mode="wait">
				{src ? (
					<motion.div
						key={src}
						className="absolute inset-0"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: ART_DURATION, ease: ART_EASE }}
					>
						<div className="absolute inset-0 scale-110 bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
						<div className="absolute inset-0 scale-125 bg-cover bg-center opacity-75 blur-2xl" style={{ backgroundImage: `url(${src})` }} />
					</motion.div>
				) : (
					<motion.div
						key="empty-bleed"
						className="absolute inset-0 bg-neutral-900"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: ART_DURATION, ease: ART_EASE }}
					/>
				)}
			</AnimatePresence>
			<motion.div
				className="absolute inset-0"
				initial={false}
				animate={{
					backgroundColor: accent ?? "var(--accent, #6366f1)",
					opacity: accent ? 0.28 : 0,
				}}
				transition={{ duration: ART_DURATION, ease: ART_EASE }}
			/>
			<div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-md" />
		</div>
	);
}

const playerButtonVariants = cva(
	[
		"inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-[transform,background-color,color] duration-100",
		"enabled:hover:bg-foreground/10 enabled:active:scale-95",
		"disabled:pointer-events-none disabled:opacity-50",
		"[&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
		"data-[active=true]:text-accent",
	].join(" "),
	{
		variants: {
			variant: {
				default: "",
				hero: "size-8.5 bg-foreground/10 [&_svg]:size-4",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

function PlayerBtn({
	className,
	variant,
	active,
	type = "button",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "hero"; active?: boolean }) {
	return (
		<button type={type} data-active={active ? "true" : undefined} className={cn(playerButtonVariants({ variant }), className)} {...props} />
	);
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
	const { mutateAsync: like } = trpc.track.like.useMutation();
	const { mutateAsync: dislike } = trpc.track.dislike.useMutation();

	const [trackAccent, setTrackAccent] = useState<string | null>(null);
	const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
	const [lyricsLoading, setLyricsLoading] = useState(false);
	const lastFetchedIdRef = useRef<string | null>(null);

	const title = track?.video?.title ?? "Chưa phát bài hát";
	const artist = track?.video?.author ?? "YouTube Music";
	const thumbnail = toAppThumbUrl(track?.meta?.thumbnail);
	const playing = !!playState?.playing;
	const duration = playState?.duration || Number(track?.meta?.duration) || 0;
	const progress = playState?.progress ?? 0;
	const hasLike = typeof playState?.liked === "boolean";
	const hasDislike = typeof playState?.disliked === "boolean";

	const liveAccent = trackAccent || playState?.accent || null;
	const { src: artSrc, accent: displayAccent } = useAlignedArtDisplay(thumbnail, liveAccent);

	const alwaysOnTop = playerState?.alwaysOnTop ?? true;
	const currentOpacity = playerState?.opacity ?? 0.95;

	// Fetch track accent
	useEffect(() => {
		if (!thumbnail) {
			setTrackAccent(null);
			return;
		}
		let cancelled = false;
		void utils.track.accent
			.fetch()
			.then((clr) => {
				if (!cancelled) setTrackAccent(clr || null);
			})
			.catch(() => {
				if (!cancelled) setTrackAccent(null);
			});
		return () => {
			cancelled = true;
		};
	}, [thumbnail, utils.track.accent]);

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
			if (lrcLines[i].timeMs <= curMs + 200) {
				line = lrcLines[i];
			} else {
				break;
			}
		}
		return line?.text || null;
	}, [lrcLines, progress]);

	const progressPercent = duration > 0 ? clamp((progress / duration) * 100, 0, 100) : 0;

	const handleCycleOpacity = () => {
		const currentIdx = OPACITY_STEPS.findIndex((s) => Math.abs(s - currentOpacity) < 0.08);
		const nextIdx = (currentIdx + 1) % OPACITY_STEPS.length;
		void setOpacity({ opacity: OPACITY_STEPS[nextIdx] });
	};

	return (
		<div className="drag relative h-screen w-screen overflow-hidden rounded-2xl border border-white/15 shadow-2xl select-none flex">
			{/* Dynamic Bleed Art (Đồng bộ hiệu ứng nền mờ sang trọng như System Tray) */}
			<BleedArtBackground src={artSrc} accent={displayAccent} />

			{/* Left Accent Pill */}
			<div className="relative z-10 flex shrink-0 items-stretch py-2.5 pl-2.5 pr-1" aria-hidden>
				<motion.div
					className="w-1.5 rounded-full"
					initial={false}
					animate={{ backgroundColor: displayAccent ?? "var(--accent, #f43f5e)" }}
					transition={{ duration: ART_DURATION, ease: ART_EASE }}
				/>
			</div>

			{/* Content Area */}
			<div className="relative z-10 flex flex-1 flex-col justify-between p-2.5 pl-1.5">
				{/* Header: Track Info + Pin/Opacity Controls */}
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2.5 min-w-0 flex-1">
						{/* Cover Art bo góc cao cấp */}
						<div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-800/80 ring-1 ring-white/10 shadow-sm">
							{artSrc ? (
								<img src={artSrc} alt="" className="size-full object-cover pointer-events-none" />
							) : (
								<div className="flex size-full items-center justify-center text-[10px] font-bold text-neutral-400">
									YTM
								</div>
							)}
						</div>

						{/* Title & Artist & Synced Lyrics */}
						<div className="flex-1 min-w-0">
							<div className="text-xs font-semibold text-foreground truncate leading-tight drop-shadow-sm" title={title}>
								{title}
							</div>
							<div className="text-[11px] text-muted-foreground truncate mt-0.5" title={artist}>
								{artist}
							</div>

							{/* Synced Lyrics Line (Phát sáng đồng bộ màu) */}
							<div className="h-4 flex items-center overflow-hidden mt-0.5">
								{currentLine ? (
									<span
										className="text-[11px] font-medium truncate drop-shadow"
										style={{ color: displayAccent ?? "#10b981" }}
									>
										🎵 {currentLine}
									</span>
								) : lyricsLoading ? (
									<span className="text-[10px] text-muted-foreground/70 italic">Đang tải lời bài hát...</span>
								) : (
									<span className="text-[10px] text-muted-foreground/60 italic">Music Desktop App</span>
								)}
							</div>
						</div>
					</div>

					{/* Header Actions (no-drag) */}
					<div className="no-drag flex items-center gap-1 shrink-0 bg-background/40 backdrop-blur-md rounded-lg p-0.5 border border-white/10">
						{/* Opacity */}
						<button
							type="button"
							onClick={handleCycleOpacity}
							title={`Độ mờ: ${Math.round(currentOpacity * 100)}% (Bấm để đổi)`}
							className="size-5.5 flex items-center justify-center rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer transition-colors"
						>
							{Math.round(currentOpacity * 100)}%
						</button>

						{/* Pin Always on top */}
						<button
							type="button"
							onClick={() => void setAlwaysOnTop({ alwaysOnTop: !alwaysOnTop })}
							title={alwaysOnTop ? "Đang ghim trên cùng (Click để bỏ ghim)" : "Ghim cửa sổ trên cùng"}
							className={cn(
								"size-5.5 flex items-center justify-center rounded cursor-pointer transition-colors",
								alwaysOnTop ? "text-amber-400 bg-amber-500/20" : "text-muted-foreground hover:text-foreground hover:bg-white/10",
							)}
						>
							{alwaysOnTop ? <Pin className="size-3" /> : <PinOff className="size-3" />}
						</button>

						{/* Close */}
						<button
							type="button"
							onClick={() => void hideMiniPlayer()}
							title="Đóng Mini Player"
							className="size-5.5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/15 cursor-pointer transition-colors"
						>
							<X className="size-3" />
						</button>
					</div>
				</div>

				{/* Progress Scrubber (Thanh tua nhạc mỏng tinh tế) */}
				<div className="no-drag flex items-center gap-2 pt-1">
					<span className="w-8 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
						{formatTime(progress)}
					</span>
					<div
						className="relative flex-1 h-1 bg-foreground/15 rounded-full cursor-pointer overflow-hidden group hover:h-1.5 transition-all"
						onClick={(e) => {
							if (duration <= 0) return;
							const rect = e.currentTarget.getBoundingClientRect();
							const clickX = e.clientX - rect.left;
							const pct = clamp(clickX / rect.width, 0, 1);
							void seek({ time: pct * duration });
						}}
					>
						<div
							className="h-full rounded-full transition-[width] duration-100"
							style={{
								width: `${progressPercent}%`,
								backgroundColor: displayAccent ?? "var(--accent, #f43f5e)",
							}}
						/>
					</div>
					<span className="w-8 font-mono text-[10px] tabular-nums text-muted-foreground">
						{formatTime(duration)}
					</span>
				</div>

				{/* Transport Controls (Segmented Dock y hệt System Tray) */}
				<div className="no-drag flex justify-center pt-0.5">
					<div className="flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-2 py-0.5 shadow-sm backdrop-blur-md">
						{hasLike && (
							<PlayerBtn
								active={!!playState?.liked}
								disabled={!track}
								aria-label="Like"
								style={playState?.liked && displayAccent ? { color: displayAccent } : undefined}
								onClick={() => void like({ liked: !playState?.liked })}
							>
								<LikeIcon />
							</PlayerBtn>
						)}

						<PlayerBtn disabled={!track} aria-label="Previous" onClick={() => void prev()}>
							<PrevIcon />
						</PlayerBtn>

						<PlayerBtn
							variant="hero"
							disabled={!track}
							aria-label={playing ? "Pause" : "Play"}
							style={
								displayAccent
									? {
											backgroundColor: `color-mix(in oklab, ${displayAccent} 28%, transparent)`,
											color: displayAccent,
										}
									: undefined
							}
							onClick={() => void (!playing ? play() : pause())}
						>
							{playing ? <PauseIcon /> : <PlayIcon />}
						</PlayerBtn>

						<PlayerBtn disabled={!track} aria-label="Next" onClick={() => void next()}>
							<NextIcon />
						</PlayerBtn>

						{hasDislike && (
							<PlayerBtn
								active={!!playState?.disliked}
								disabled={!track}
								aria-label="Dislike"
								style={playState?.disliked && displayAccent ? { color: displayAccent } : undefined}
								onClick={() => void dislike({ disliked: !playState?.disliked })}
							>
								<LikeIcon className="rotate-180" />
							</PlayerBtn>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
