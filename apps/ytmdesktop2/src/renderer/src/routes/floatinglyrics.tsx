import { toAppThumbUrl } from "@shared/media/appThumbUrl";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlignCenter,
	AlignLeft,
	GripHorizontal,
	Lock,
	Music,
	Pause,
	Play,
	RotateCcw,
	SkipBack,
	SkipForward,
	Unlock,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FloatingLyricsState } from "@main/trpc/routers/floatingLyrics/service";
import { useTrack, useTrackState } from "@/hooks/use-track";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/floatinglyrics")({
	component: FloatingLyricsPage,
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

const TEXT_COLORS: Record<string, { label: string; textClass: string; colorHex?: string }> = {
	accent: { label: "Màu bài hát", textClass: "text-amber-400" },
	white: { label: "Trắng sáng", textClass: "text-white" },
	gold: { label: "Vàng kim", textClass: "text-yellow-300" },
	cyan: { label: "Xanh Cyan", textClass: "text-cyan-300" },
	green: { label: "Xanh lá", textClass: "text-emerald-400" },
};

function FloatingLyricsPage() {
	const utils = trpc.useUtils();
	const track = useTrack();
	const playState = useTrackState();

	const { data: serverState } = trpc.floatingLyrics.state.useQuery();
	const { mutateAsync: setLockedMutation } = trpc.floatingLyrics.setLocked.useMutation();
	const { mutateAsync: setIgnoreMouseEvents } = trpc.floatingLyrics.setIgnoreMouseEvents.useMutation();
	const { mutateAsync: updateConfigMutation } = trpc.floatingLyrics.updateConfig.useMutation();
	const { mutateAsync: hideWindow } = trpc.floatingLyrics.hide.useMutation();

	const { mutateAsync: play } = trpc.track.play.useMutation();
	const { mutateAsync: pause } = trpc.track.pause.useMutation();
	const { mutateAsync: next } = trpc.track.next.useMutation();
	const { mutateAsync: prev } = trpc.track.prev.useMutation();

	const [isHovered, setIsHovered] = useState(false);
	const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
	const [lyricsLoading, setLyricsLoading] = useState(false);
	const lastFetchedIdRef = useRef<string | null>(null);

	// Ensure background is translucent
	useEffect(() => {
		document.documentElement.classList.add("translucent");
		return () => {
			document.documentElement.classList.remove("translucent");
		};
	}, []);

	// Keep local state synced with server
	trpc.floatingLyrics.onState.useSubscription(undefined, {
		onData: (nextState) => {
			if (!nextState) return;
			utils.floatingLyrics.state.setData(undefined, nextState as FloatingLyricsState);
		},
	});

	const locked = serverState?.locked ?? false;
	const fontSize = serverState?.fontSize ?? 22;
	const textColor = serverState?.textColor ?? "accent";
	const bgOpacity = serverState?.backgroundOpacity ?? 30;
	const align = serverState?.align ?? "center";

	const videoId = track?.video?.videoId;
	const rawTitle = track?.video?.title;
	const rawAuthor = track?.video?.author;
	const duration = playState?.duration || Number(track?.meta?.duration) || 0;
	const progressSeconds = playState?.progress ?? 0;
	const playing = !!playState?.playing;
	const progressMs = progressSeconds * 1000;

	// Fetch synced lyrics from LRCLIB
	useEffect(() => {
		if (!rawTitle) {
			setLrcLines([]);
			lastFetchedIdRef.current = null;
			setLyricsLoading(false);
			return;
		}
		if (lastFetchedIdRef.current === videoId && videoId) {
			return;
		}
		lastFetchedIdRef.current = videoId ?? null;
		setLrcLines([]);
		setLyricsLoading(true);

		let cancelled = false;

		const cleanTitle =
			rawTitle.replace(/[\(\[][^\)\]]*(official|video|mv|audio|lyrics?|remix|hd|4k)[^\)\]]*[\)\]]/gi, "").trim() || rawTitle;
		const searchParams = new URLSearchParams({
			track_name: cleanTitle,
			artist_name: rawAuthor || "",
		});
		if (duration > 0) {
			searchParams.set("duration", String(Math.round(duration)));
		}

		const fetchLyrics = async () => {
			try {
				let data: any = null;
				const res = await fetch(`https://lrclib.net/api/get?${searchParams.toString()}`);
				if (res.ok) {
					data = await res.json();
				} else {
					// Fallback 1: search with title and artist
					const fallbackRes = await fetch(
						`https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${rawAuthor || ""}`)}`,
					);
					if (fallbackRes.ok) {
						const hits = await fallbackRes.json();
						if (Array.isArray(hits) && hits.length > 0) {
							data = hits.find((h: any) => h.syncedLyrics) || hits[0];
						}
					}
					// Fallback 2: search with title only if still no syncedLyrics
					if (!data?.syncedLyrics) {
						const fallbackTitleOnly = await fetch(
							`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`,
						);
						if (fallbackTitleOnly.ok) {
							const hits = await fallbackTitleOnly.json();
							if (Array.isArray(hits) && hits.length > 0) {
								const best = hits.find((h: any) => h.syncedLyrics) || hits[0];
								if (best?.syncedLyrics || !data) {
									data = best;
								}
							}
						}
					}
				}

				if (cancelled) return;
				if (data?.syncedLyrics) {
					setLrcLines(parseLrc(data.syncedLyrics));
				} else if (data?.plainLyrics) {
					const lines = (data.plainLyrics as string).split("\n").filter(Boolean);
					setLrcLines(lines.map((text, idx) => ({ timeMs: idx * 4000, text })));
				} else {
					setLrcLines([]);
				}
			} catch {
				if (!cancelled) setLrcLines([]);
			} finally {
				if (!cancelled) setLyricsLoading(false);
			}
		};

		void fetchLyrics();

		return () => {
			cancelled = true;
		};
	}, [videoId, rawTitle, rawAuthor]);

	// Find current line index
	const currentIndex = useMemo(() => {
		if (!lrcLines.length) return -1;
		let idx = -1;
		for (let i = 0; i < lrcLines.length; i++) {
			if (lrcLines[i].timeMs <= progressMs + 200) {
				idx = i;
			} else {
				break;
			}
		}
		return idx;
	}, [lrcLines, progressMs]);

	const currentLine = currentIndex >= 0 ? lrcLines[currentIndex] : null;
	const nextLine = currentIndex + 1 < lrcLines.length ? lrcLines[currentIndex + 1] : null;

	const handleLockToggle = (lockVal: boolean) => {
		void setLockedMutation({ locked: lockVal });
		if (!lockVal) {
			void setIgnoreMouseEvents({ ignore: false });
		}
	};

	// Mouse event forward helpers
	const handleMouseEnterControls = () => {
		if (locked) {
			void setIgnoreMouseEvents({ ignore: false });
		}
		setIsHovered(true);
	};

	const handleMouseLeaveControls = () => {
		if (locked) {
			void setIgnoreMouseEvents({ ignore: true });
		}
		setIsHovered(false);
	};

	const activeColorClass = TEXT_COLORS[textColor]?.textClass ?? "text-amber-400";

	return (
		<div
			className="h-screen w-screen p-2 flex flex-col justify-center items-center select-none overflow-hidden relative"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={handleMouseLeaveControls}
		>
			{/* Main Lyrics Capsule */}
			<div
				className={cn(
					"relative w-full h-full max-w-4xl rounded-2xl px-6 py-2.5 flex flex-col justify-center transition-all duration-300 backdrop-blur-xl border border-white/10 shadow-2xl group",
					locked ? "pointer-events-none" : "hover:border-white/20",
				)}
				style={{
					backgroundColor: `rgba(10, 10, 15, ${bgOpacity / 100})`,
				}}
			>
				{/* Top Controls Overlay (Shown on hover when not locked, or compact unlock trigger when locked) */}
				<div
					className={cn(
						"no-drag absolute top-2 right-3 z-30 flex items-center gap-1.5 transition-opacity duration-200 pointer-events-auto",
						locked ? (isHovered ? "opacity-100" : "opacity-0") : isHovered ? "opacity-100" : "opacity-0",
					)}
					onMouseEnter={handleMouseEnterControls}
					onMouseLeave={handleMouseLeaveControls}
				>
					{/* When locked: Unlock button */}
					{locked ? (
						<button
							type="button"
							onClick={() => handleLockToggle(false)}
							className="size-7 rounded-lg bg-neutral-900/90 text-amber-400 hover:bg-neutral-800 flex items-center justify-center border border-amber-500/40 shadow-lg cursor-pointer"
							title="Mở khóa vị trí thanh lời bài hát"
						>
							<Unlock className="size-3.5" />
						</button>
					) : (
						<>
							{/* Drag handle */}
							<div
								className="drag size-7 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center border border-white/10 cursor-move"
								title="Kéo để di chuyển thanh lời bài hát"
							>
								<GripHorizontal className="size-3.5" />
							</div>

							{/* Mini Player Controls */}
							<button
								type="button"
								onClick={() => void prev()}
								className="size-7 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center border border-white/10 cursor-pointer"
								title="Bài trước"
							>
								<SkipBack className="size-3" />
							</button>

							<button
								type="button"
								onClick={() => (playing ? void pause() : void play())}
								className="size-7 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center border border-white/10 cursor-pointer"
								title={playing ? "Tạm dừng" : "Phát"}
							>
								{playing ? <Pause className="size-3" /> : <Play className="size-3" />}
							</button>

							<button
								type="button"
								onClick={() => void next()}
								className="size-7 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center border border-white/10 cursor-pointer"
								title="Bài kế tiếp"
							>
								<SkipForward className="size-3" />
							</button>

							{/* Align toggle */}
							<button
								type="button"
								onClick={() => void updateConfigMutation({ align: align === "center" ? "left" : "center" })}
								className="size-7 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center border border-white/10 cursor-pointer"
								title={`Căn lề: ${align === "center" ? "Giữa" : "Trái"}`}
							>
								{align === "center" ? <AlignCenter className="size-3.5" /> : <AlignLeft className="size-3.5" />}
							</button>

							{/* Lock Button (Activates Click-through) */}
							<button
								type="button"
								onClick={() => handleLockToggle(true)}
								className="size-7 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 flex items-center justify-center border border-white/10 cursor-pointer"
								title="Khóa vị trí (Chuột sẽ click xuyên qua thanh lời)"
							>
								<Lock className="size-3.5" />
							</button>

							{/* Close / Hide Window */}
							<button
								type="button"
								onClick={() => void hideWindow()}
								className="size-7 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-red-400 hover:bg-neutral-800 flex items-center justify-center border border-white/10 cursor-pointer"
								title="Ẩn lời bài hát nổi"
							>
								<X className="size-3.5" />
							</button>
						</>
					)}
				</div>

				{/* Lyrics Content Display */}
				<div
					className={cn(
						"w-full flex flex-col justify-center gap-1 transition-all duration-200",
						align === "center" ? "items-center text-center" : "items-start text-left",
					)}
				>
					{/* Active / Current Line */}
					<AnimatePresence mode="wait">
						{currentLine ? (
							<motion.div
								key={currentLine.text + currentLine.timeMs}
								initial={{ opacity: 0, y: 8, scale: 0.98 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -8, scale: 0.98 }}
								transition={{ duration: 0.22, ease: "easeOut" }}
								className={cn(
									"font-bold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] max-w-full truncate leading-snug",
									activeColorClass,
								)}
								style={{ fontSize: `${fontSize}px` }}
							>
								{currentLine.text}
							</motion.div>
						) : (
							<motion.div
								key="empty-line"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="flex items-center gap-2 text-neutral-400 font-medium drop-shadow-md"
								style={{ fontSize: `${fontSize - 2}px` }}
							>
								<Music className="size-5 shrink-0 text-amber-400 animate-pulse" />
								<span className="truncate">
									{rawTitle ? `${rawTitle} — ${rawAuthor || ""}` : "Chưa có bài hát nào đang phát"}
								</span>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Next Line Preview */}
					{nextLine ? (
						<div
							className="text-neutral-400/80 font-normal drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] max-w-full truncate leading-tight"
							style={{ fontSize: `${Math.max(13, fontSize - 6)}px` }}
						>
							{nextLine.text}
						</div>
					) : lyricsLoading ? (
						<div className="text-[12px] text-neutral-500 italic">Đang tải lời bài hát...</div>
					) : lrcLines.length > 0 ? (
						<div className="text-[12px] text-neutral-500/70 italic">♪ Nhạc dạo...</div>
					) : (
						<div className="text-[11px] text-neutral-500/60">Không tìm thấy lời bài hát</div>
					)}
				</div>
			</div>
		</div>
	);
}
