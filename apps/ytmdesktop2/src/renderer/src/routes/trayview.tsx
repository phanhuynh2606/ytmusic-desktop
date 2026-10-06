import { toAppThumbUrl } from "@shared/media/appThumbUrl";
import { createFileRoute } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { intervalToDuration } from "date-fns";
import { clamp } from "lodash-es";
import { ArrowLeftIcon, Disc3Icon, GripVerticalIcon, ImageIcon, PinIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ButtonHTMLAttributes, type MouseEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ApiIcon from "@/assets/icons/chip.svg?react";
import DiscordIcon from "@/assets/icons/discord-rpc.svg?react";
import LastFMIcon from "@/assets/icons/lastfm.svg?react";
import LikeIcon from "@/assets/icons/like.svg?react";
import NextIcon from "@/assets/icons/next.svg?react";
import PauseIcon from "@/assets/icons/pause.svg?react";
import PlayIcon from "@/assets/icons/play.svg?react";
import PrevIcon from "@/assets/icons/prev.svg?react";
import SettingsIcon from "@/assets/icons/settings.svg?react";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDiscord } from "@/hooks/use-discord";
import { useLastFm } from "@/hooks/use-lastfm";
import { useSettingsState } from "@/hooks/use-settings";
import { useTrack, useTrackState } from "@/hooks/use-track";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trayview")({
	component: TrayViewPage,
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

interface PlayState {
	playing: boolean;
	progress: number;
	duration: number;
	liked: boolean;
	disliked: boolean;
}

function patchPlayState(utils: ReturnType<typeof trpc.useUtils>, patch: Partial<PlayState>) {
	utils.track.state.setData(undefined, (prev) => {
		if (!prev) return prev;
		return { ...prev, ...patch };
	});
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

/** Preload image; only expose src once decode-ready. */
function useReadyImage(src: string | null | undefined): string | null {
	const [ready, setReady] = useState<string | null>(null);

	useEffect(() => {
		if (!src) {
			setReady((prev) => (prev === null ? prev : null));
			return;
		}
		let cancelled = false;
		const img = new Image();
		const done = () => {
			if (!cancelled) setReady((prev) => (prev === src ? prev : src));
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

/**
 * Commit art + accent together when the image for `thumbnail` is ready,
 * so cover/bleed fades and color lerps start in the same frame.
 */
function useAlignedArtDisplay(thumbnail: string | null | undefined, liveAccent: string | null): { src: string | null; accent: string | null } {
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
		// Still decoding next cover — keep previous art+accent on screen.
		if (loadedSrc !== thumbnail) return;

		// Accent already known — swap art + color together.
		if (liveAccent) {
			commit(loadedSrc, liveAccent);
			return;
		}

		// Image ready first — brief wait so vibrant/playState accent can catch up.
		const timer = window.setTimeout(() => commit(loadedSrc, liveAccent), 80);
		return () => clearTimeout(timer);
	}, [thumbnail, loadedSrc, liveAccent]);

	return display;
}

function TrayBleedArt({ src, accent }: { src: string | null; accent: string | null }) {
	return (
		<div className="pointer-events-none absolute inset-0" aria-hidden>
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
						<div className="absolute inset-0 scale-125 bg-cover bg-center opacity-70 blur-2xl" style={{ backgroundImage: `url(${src})` }} />
					</motion.div>
				) : (
					<motion.div
						key="empty-bleed"
						className="absolute inset-0 bg-muted/30"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: ART_DURATION, ease: ART_EASE }}
					/>
				)}
			</AnimatePresence>
			{/* Accent wash — same duration/ease as pill; color follows displayAccent */}
			<motion.div
				className="absolute inset-0"
				initial={false}
				animate={{
					backgroundColor: accent ?? "var(--accent)",
					opacity: accent ? 0.25 : 0,
				}}
				transition={{ duration: ART_DURATION, ease: ART_EASE }}
			/>
			<div className="absolute inset-0 bg-background/70" />
		</div>
	);
}

function TrayAccentPill({
	accent,
	drag,
	expanded,
	autoHide,
	contentHovered,
}: {
	accent: string | null;
	drag?: boolean;
	expanded?: boolean;
	autoHide?: boolean;
	contentHovered?: boolean;
}) {
	const [dragLayer, setDragLayer] = useState(false);

	useEffect(() => {
		if (!drag || !expanded) {
			setDragLayer(false);
			return;
		}
		const id = window.setTimeout(() => setDragLayer(true), 200);
		return () => clearTimeout(id);
	}, [drag, expanded]);

	return (
		<div
			className={cn(
				"relative z-10 flex shrink-0 items-stretch justify-center py-2.5 ml-1 no-drag transition-[width,opacity,transform] duration-200 ease-out",
				expanded ? "w-6" : "w-3",
				autoHide && !contentHovered && "opacity-0 pointer-events-none -translate-x-1",
			)}
			aria-hidden={!drag}
			title={drag ? "Drag" : undefined}
		>
			<motion.div
				className={cn(
					"pointer-events-none flex items-center justify-center overflow-hidden rounded-full bg-accent transition-[width] duration-200 ease-out",
					expanded ? "w-4" : "w-1.5",
				)}
				initial={false}
				animate={{ backgroundColor: accent ?? "var(--accent)" }}
				transition={{ duration: ART_DURATION, ease: ART_EASE }}
			>
				<GripVerticalIcon
					className={cn("size-3.5 shrink-0 text-background/80 transition-opacity duration-200", expanded ? "opacity-100" : "opacity-0")}
				/>
			</motion.div>
			{dragLayer ? <div className="drag absolute inset-0 z-10 cursor-grab" /> : null}
		</div>
	);
}

function TrayCoverArt({ src }: { src: string | null }) {
	return (
		<div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted/80 ring-1 ring-border/50 shadow-sm">
			<AnimatePresence mode="wait">
				{src ? (
					<motion.img
						key={src}
						src={src}
						alt=""
						className="no-drag absolute inset-0 size-full object-cover pointer-events-none"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: ART_DURATION, ease: ART_EASE }}
					/>
				) : (
					<motion.div
						key="empty-cover"
						className="no-drag absolute inset-0 flex size-full items-center justify-center text-[9px] font-medium tracking-wide text-muted-foreground"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: ART_DURATION, ease: ART_EASE }}
					>
						YTM
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

const chromeButtonVariants = cva(
	[
		"inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground/70 transition-all duration-150",
		"enabled:hover:bg-foreground/10 enabled:hover:text-foreground enabled:active:scale-90",
		"disabled:pointer-events-none disabled:opacity-40",
		"[&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
	].join(" "),
	{ variants: { variant: { default: "" } }, defaultVariants: { variant: "default" } },
);

const playerButtonVariants = cva(
	[
		"inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-[transform,background-color,color] duration-100",
		"enabled:hover:bg-foreground/10 enabled:active:scale-95",
		"disabled:pointer-events-none disabled:opacity-50",
		"[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
		"data-[active=true]:text-accent",
	].join(" "),
	{
		variants: {
			variant: {
				default: "",
				hero: "size-9 bg-foreground/10 [&_svg]:size-[1.125rem]",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

const controlToggleVariants = cva(
	[
		"relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-[transform,background-color,color,opacity] duration-100",
		"enabled:hover:bg-accent/15 enabled:hover:text-foreground enabled:active:scale-95",
		"disabled:pointer-events-none disabled:opacity-40",
		"[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
		"data-[on=true]:bg-accent/20 data-[on=true]:text-foreground",
	].join(" "),
	{ variants: { variant: { default: "" } }, defaultVariants: { variant: "default" } },
);

function ChromeButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
	return <button type={type} className={cn(chromeButtonVariants(), className)} {...props} />;
}

function PlayerButton({
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

function ControlToggle({
	className,
	active,
	busy,
	type = "button",
	children,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; busy?: boolean }) {
	return (
		<button type={type} data-on={active ? "true" : undefined} className={cn(controlToggleVariants(), className)} {...props}>
			{children}
			{busy ? (
				<span className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-muted">
					<Spinner className="size-2" />
				</span>
			) : active ? (
				<span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-2 ring-background" />
			) : null}
		</button>
	);
}

function pointerInsideWindow(ev: { clientX: number; clientY: number }): boolean {
	return ev.clientX >= 0 && ev.clientY >= 0 && ev.clientX < window.innerWidth && ev.clientY < window.innerHeight;
}

function AudioEqualizer({ playing, color }: { playing: boolean; color?: string | null }) {
	return (
		<div className="flex items-end gap-0.5 h-3.5 px-0.5" aria-hidden>
			<motion.span
				className="w-0.5 rounded-full bg-accent"
				style={color ? { backgroundColor: color } : undefined}
				animate={playing ? { height: ["25%", "100%", "45%", "25%"] } : { height: "25%" }}
				transition={playing ? { repeat: Infinity, duration: 0.6, ease: "easeInOut" } : { duration: 0.2 }}
			/>
			<motion.span
				className="w-0.5 rounded-full bg-accent"
				style={color ? { backgroundColor: color } : undefined}
				animate={playing ? { height: ["70%", "30%", "95%", "70%"] } : { height: "45%" }}
				transition={playing ? { repeat: Infinity, duration: 0.5, ease: "easeInOut" } : { duration: 0.2 }}
			/>
			<motion.span
				className="w-0.5 rounded-full bg-accent"
				style={color ? { backgroundColor: color } : undefined}
				animate={playing ? { height: ["90%", "40%", "70%", "90%"] } : { height: "30%" }}
				transition={playing ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" } : { duration: 0.2 }}
			/>
		</div>
	);
}

function VinylDisc({
	artSrc,
	playing,
	displayAccent,
}: {
	artSrc: string | null;
	playing: boolean;
	displayAccent: string | null;
}) {
	return (
		<div className="relative size-28 shrink-0 flex items-center justify-center select-none">
			{/* Vinyl Disc Body with Grooves */}
			<motion.div
				className="relative size-28 rounded-full border-2 border-neutral-700/80 shadow-2xl flex items-center justify-center overflow-hidden"
				style={{
					background: "radial-gradient(circle, #222 0%, #161616 45%, #0f0f0f 75%, #050505 100%)",
					boxShadow: "0 6px 20px rgba(0,0,0,0.6), inset 0 0 8px rgba(255,255,255,0.06)",
				}}
				animate={playing ? { rotate: 360 } : undefined}
				transition={playing ? { repeat: Infinity, duration: 8, ease: "linear" } : undefined}
			>
				{/* Concentric Grooves */}
				<div className="pointer-events-none absolute inset-2.5 rounded-full border border-white/5" />
				<div className="pointer-events-none absolute inset-5 rounded-full border border-white/5" />
				<div className="pointer-events-none absolute inset-7.5 rounded-full border border-white/5" />
				<div className="pointer-events-none absolute inset-10 rounded-full border border-white/5" />

				{/* Vinyl Sheen Reflex */}
				<div
					className="pointer-events-none absolute inset-0 rounded-full opacity-25"
					style={{
						background:
							"conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.3) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.3) 225deg, transparent 270deg)",
					}}
				/>

				{/* Center Label (Album Cover) */}
				<div
					className="relative size-12 rounded-full overflow-hidden border-2 border-neutral-800 shadow-md flex items-center justify-center"
					style={displayAccent ? { borderColor: displayAccent } : undefined}
				>
					{artSrc ? (
						<img src={artSrc} alt="" className="size-full object-cover pointer-events-none" />
					) : (
						<div className="size-full bg-neutral-800 flex items-center justify-center text-[9px] font-bold text-neutral-400">
							YTM
						</div>
					)}
					{/* Spindle hole */}
					<div className="absolute size-2 rounded-full bg-neutral-950 ring-1 ring-white/40" />
				</div>
			</motion.div>

			{/* Turntable Stylus / Tone Arm Hint */}
			<div
				className={cn(
					"pointer-events-none absolute -top-1 right-0 w-6 h-10 border-r-2 border-t-2 border-neutral-400/80 rounded-tr-lg transition-transform duration-300 origin-top-right",
					playing ? "rotate-6 translate-x-0" : "-rotate-12 translate-x-1 opacity-70",
				)}
			>
				<div className="absolute -bottom-1 -left-1 size-2 bg-accent rounded-sm shadow-sm" />
			</div>
		</div>
	);
}

interface CircleDiscWidgetProps {
	artSrc: string | null;
	playing: boolean;
	title: string;
	artist?: string | null;
	time: { current: string; end: string; pct: number } | null;
	displayAccent: string | null;
	pinned: boolean;
	discType: "vinyl" | "art";
	onToggleDiscType: () => void;
	onPlayPause: () => void;
	onPrev: () => void;
	onNext: () => void;
	onPinToggle: () => void;
	onOpenMain: () => void;
	onSettings: () => void;
}

function CircleDiscWidget({
	artSrc,
	playing,
	title,
	artist,
	time,
	displayAccent,
	pinned,
	discType,
	onToggleDiscType,
	onPlayPause,
	onPrev,
	onNext,
	onPinToggle,
	onOpenMain,
	onSettings,
}: CircleDiscWidgetProps) {
	return (
		<div className="group drag relative size-full aspect-square flex items-center justify-center select-none p-1">
			{/* Outer Circular Progress Ring */}
			<svg className="pointer-events-none absolute inset-0 size-full -rotate-90 z-10" viewBox="0 0 100 100">
				<circle
					cx="50"
					cy="50"
					r="48.5"
					stroke="rgba(255,255,255,0.12)"
					strokeWidth="2.5"
					fill="none"
				/>
				<circle
					cx="50"
					cy="50"
					r="48.5"
					stroke={displayAccent ?? "var(--accent)"}
					strokeWidth="2.5"
					fill="none"
					strokeDasharray="100 100"
					pathLength={100}
					strokeDashoffset={100 - (time?.pct ?? 0)}
					strokeLinecap="round"
					className="transition-[stroke-dashoffset] duration-300"
				/>
			</svg>

			{/* Disc Core */}
			<div
				className="drag relative size-full rounded-full overflow-hidden shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing"
				style={{
					boxShadow: displayAccent
						? `0 10px 32px -4px ${displayAccent}50, 0 4px 16px rgba(0,0,0,0.85)`
						: "0 10px 32px -4px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.75)",
				}}
			>
				{/* 360 Spin Animation */}
				<motion.div
					className="relative size-full rounded-full overflow-hidden flex items-center justify-center pointer-events-none"
					animate={playing ? { rotate: 360 } : undefined}
					transition={playing ? { repeat: Infinity, duration: 10, ease: "linear" } : undefined}
				>
					{discType === "vinyl" ? (
						/* Vinyl Mode */
						<div
							className="size-full flex items-center justify-center relative rounded-full"
							style={{
								background: "radial-gradient(circle, #242424 0%, #151515 35%, #0e0e0e 70%, #050505 100%)",
							}}
						>
							{/* Concentric Grooves */}
							<div className="pointer-events-none absolute inset-2 rounded-full border border-white/[0.08]" />
							<div className="pointer-events-none absolute inset-3.5 rounded-full border border-white/[0.05]" />
							<div className="pointer-events-none absolute inset-5 rounded-full border border-white/[0.05]" />
							<div className="pointer-events-none absolute inset-6.5 rounded-full border border-white/[0.04]" />

							{/* Conic Sheen Reflex */}
							<div
								className="pointer-events-none absolute inset-0 rounded-full opacity-30"
								style={{
									background:
										"conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.35) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.35) 225deg, transparent 270deg)",
								}}
							/>

							{/* Center Label (Album Art) ~65% size */}
							<div
								className="relative size-[64%] rounded-full overflow-hidden border-2 border-neutral-700/80 shadow-md flex items-center justify-center"
								style={displayAccent ? { borderColor: displayAccent } : undefined}
							>
								{artSrc ? (
									<img src={artSrc} alt={title || "Album Art"} className="size-full object-cover pointer-events-none select-none" />
								) : (
									<div className="size-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400">
										YTM
									</div>
								)}
								{/* Spindle hole */}
								<div className="absolute size-3.5 rounded-full bg-neutral-950 ring-1 ring-white/60 shadow-inner" />
							</div>
						</div>
					) : (
						/* Full Cover Art Mode */
						<div className="size-full flex items-center justify-center relative rounded-full overflow-hidden">
							{artSrc ? (
								<img src={artSrc} alt={title || "Album Art"} className="size-full object-cover pointer-events-none select-none" />
							) : (
								<div className="size-full bg-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-400">
									YTM
								</div>
							)}
							{/* Radial Vignette & Edge Grooves */}
							<div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_22px_rgba(0,0,0,0.6)] border border-white/20" />
							<div className="pointer-events-none absolute inset-2.5 rounded-full border border-white/10" />
							<div className="pointer-events-none absolute inset-5 rounded-full border border-white/10" />

							{/* Conic Sheen Reflex */}
							<div
								className="pointer-events-none absolute inset-0 rounded-full opacity-25"
								style={{
									background:
										"conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.4) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.4) 225deg, transparent 270deg)",
								}}
							/>

							{/* Spindle hole in center */}
							<div className="absolute size-4 rounded-full bg-neutral-950/90 ring-1.5 ring-white/70 shadow-md flex items-center justify-center">
								<div className="size-1 rounded-full bg-white/50" />
							</div>
						</div>
					)}
				</motion.div>
			</div>

			{/* Hover Action Overlay */}
			<div className="drag pointer-events-none group-hover:pointer-events-auto absolute inset-0 rounded-full bg-black/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-between p-2.5 sm:p-3 select-none z-20 shadow-2xl">
				{/* Top Row: Switch Type, Drag Handle, Pin, Settings */}
				<div className="flex items-center justify-between w-full px-1">
					<button
						type="button"
						onClick={onToggleDiscType}
						aria-label={discType === "vinyl" ? "Đổi sang Ảnh bìa tròn" : "Đổi sang Đĩa than cổ điển"}
						className="no-drag size-6 rounded-full bg-white/15 hover:bg-white/30 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
						title={discType === "vinyl" ? "Đổi sang Ảnh bìa tròn" : "Đổi sang Đĩa than cổ điển"}
					>
						{discType === "vinyl" ? <ImageIcon className="size-3.5" /> : <Disc3Icon className="size-3.5" />}
					</button>

					{/* Center Drag Grip Handle */}
					<div
						className="drag size-6 rounded-full bg-white/15 hover:bg-white/30 text-white/90 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm"
						title="Kéo để di chuyển widget"
					>
						<GripVerticalIcon className="size-3.5" />
					</div>

					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={onPinToggle}
							aria-label={pinned ? "Bỏ ghim" : "Ghim"}
							className={cn(
								"no-drag size-6 rounded-full bg-white/15 hover:bg-white/30 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm",
								pinned && "text-accent bg-accent/25",
							)}
							title={pinned ? "Bỏ ghim" : "Ghim"}
						>
							<PinIcon className={cn("size-3", pinned && "rotate-45 fill-current")} />
						</button>
						<button
							type="button"
							onClick={onSettings}
							aria-label="Cài đặt"
							className="no-drag size-6 rounded-full bg-white/15 hover:bg-white/30 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
							title="Cài đặt"
						>
							<SettingsIcon className="size-3" />
						</button>
					</div>
				</div>

				{/* Center Row: Controls */}
				<div className="no-drag flex items-center justify-center gap-2">
					<button
						type="button"
						onClick={onPrev}
						aria-label="Bài trước"
						className="no-drag size-7 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
						title="Bài trước"
					>
						<PrevIcon className="size-3.5" />
					</button>
					<button
						type="button"
						onClick={onPlayPause}
						aria-label={playing ? "Tạm dừng" : "Phát"}
						className="no-drag size-10 rounded-full bg-primary hover:scale-105 active:scale-95 text-primary-foreground shadow-lg flex items-center justify-center transition-transform cursor-pointer"
						title={playing ? "Tạm dừng" : "Phát"}
						style={displayAccent ? { backgroundColor: displayAccent } : undefined}
					>
						{playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
					</button>
					<button
						type="button"
						onClick={onNext}
						aria-label="Bài tiếp theo"
						className="no-drag size-7 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
						title="Bài tiếp theo"
					>
						<NextIcon className="size-3.5" />
					</button>
				</div>

				{/* Bottom Row: Title + Time */}
				<div className="no-drag flex flex-col items-center justify-center w-full px-2 text-center pb-0.5">
					<p className="w-full truncate text-[10px] font-semibold text-white/95 leading-tight">{title}</p>
					<p className="text-[9px] text-white/70 font-mono mt-0.5">{time ? `${time.current} / ${time.end}` : "--:--"}</p>
				</div>
			</div>
		</div>
	);
}

interface TrayProgressBarProps {
	time: { current: string; end: string; pct: number } | null;
	durationSec: number;
	displayAccent: string | null;
	disabled?: boolean;
	onSeek: (timeMs: number) => void;
	compact?: boolean;
}

function TrayProgressBar({
	time,
	durationSec,
	displayAccent,
	disabled = false,
	onSeek,
	compact = false,
}: TrayProgressBarProps) {
	const [seekHovering, setSeekHovering] = useState(false);
	const durationSecRef = useRef(durationSec);
	durationSecRef.current = durationSec;
	const currentTimeLabel = time?.current ?? "0:00";

	const seekTrackRef = useRef<HTMLDivElement>(null);
	const seekHoverFillRef = useRef<HTMLDivElement>(null);
	const seekThumbRef = useRef<HTMLDivElement>(null);
	const seekTipRef = useRef<HTMLDivElement>(null);
	const seekTimeRef = useRef<HTMLSpanElement>(null);
	const seekHoveringRef = useRef(false);

	useEffect(() => {
		if (seekHoveringRef.current) return;
		if (seekTimeRef.current) seekTimeRef.current.textContent = currentTimeLabel;
	}, [currentTimeLabel]);

	function syncSeekHover(clientX: number) {
		const trackEl = seekTrackRef.current;
		if (!trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		if (rect.width <= 0) return;
		const pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
		const pctStr = `${pct}%`;
		if (seekHoverFillRef.current) seekHoverFillRef.current.style.width = pctStr;
		if (seekThumbRef.current) seekThumbRef.current.style.left = pctStr;
		if (seekTipRef.current) seekTipRef.current.style.left = pctStr;
		const dur = durationSecRef.current;
		const label = dur > 0 ? formatTime((pct / 100) * dur) : "0:00";
		if (seekTipRef.current) seekTipRef.current.textContent = label;
		if (seekTimeRef.current) seekTimeRef.current.textContent = label;
	}

	function handleSeekHover(ev: MouseEvent<HTMLDivElement>) {
		syncSeekHover(ev.clientX);
	}

	function handleSeekEnter(ev: MouseEvent<HTMLDivElement>) {
		seekHoveringRef.current = true;
		setSeekHovering(true);
		requestAnimationFrame(() => syncSeekHover(ev.clientX));
	}

	function clearSeekHover() {
		seekHoveringRef.current = false;
		setSeekHovering(false);
		if (seekTimeRef.current) seekTimeRef.current.textContent = currentTimeLabel;
	}

	function handleClick(ev: MouseEvent<HTMLDivElement>) {
		if (disabled) return;
		const el = ev.currentTarget;
		const rect = el.getBoundingClientRect();
		const percSelected = (ev.clientX - rect.left) / rect.width;
		const dur = durationSecRef.current;
		if (dur <= 0) return;
		const seekTime = clamp(dur * percSelected, 0, dur) * 1000;
		onSeek(seekTime);
	}

	return (
		<div className={cn("flex items-center gap-2", compact ? "mt-1.5" : "mt-3")}>
			<span
				ref={seekTimeRef}
				className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground/50"
			/>
			<div
				ref={seekTrackRef}
				className={cn(
					"group relative h-1.5 min-w-0 flex-1 cursor-pointer rounded-full bg-muted/80",
					disabled && "pointer-events-none opacity-40",
				)}
				onClick={handleClick}
				onMouseMove={handleSeekHover}
				onMouseEnter={handleSeekEnter}
				onMouseLeave={clearSeekHover}
				role="slider"
				aria-label="Seek"
				aria-valuenow={time?.pct ?? 0}
				aria-valuemin={0}
				aria-valuemax={100}
				tabIndex={0}
			>
				{/* Played */}
				<div
					className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-100 ease-out"
					style={{
						width: `${time?.pct ?? 0}%`,
						...(displayAccent ? { backgroundColor: displayAccent } : {}),
					}}
				/>
				{/* Hover preview */}
				<div
					ref={seekHoverFillRef}
					className={cn("absolute inset-y-0 left-0 rounded-full bg-foreground/25", !seekHovering && "hidden")}
					style={{ width: 0 }}
				/>
				{/* Scrubber thumb + tip */}
				<div
					ref={seekThumbRef}
					className={cn(
						"pointer-events-none absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm ring-2 ring-background",
						!seekHovering && "hidden",
					)}
					style={{ left: 0 }}
				/>
				<div
					ref={seekTipRef}
					className={cn(
						"pointer-events-none absolute bottom-full z-20 mb-1.5 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-background shadow-sm",
						!seekHovering && "hidden",
					)}
					style={{ left: 0 }}
				/>
			</div>
			<span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{time?.end ?? "0:00"}</span>
		</div>
	);
}

interface TrayTransportDockProps {
	playing: boolean;
	trackBusy: boolean;
	disabled: boolean;
	hasLike: boolean;
	hasDislike: boolean;
	liked?: boolean;
	disliked?: boolean;
	displayAccent: string | null;
	onPlayPause: () => void;
	onPrev: () => void;
	onNext: () => void;
	onLike?: () => void;
	onDislike?: () => void;
	compact?: boolean;
}

function TrayTransportDock({
	playing,
	trackBusy,
	disabled,
	hasLike,
	hasDislike,
	liked,
	disliked,
	displayAccent,
	onPlayPause,
	onPrev,
	onNext,
	onLike,
	onDislike,
}: TrayTransportDockProps) {
	return (
		<div className="flex items-center gap-0.5 rounded-full border border-border/50 bg-background/50 p-1 shadow-sm backdrop-blur-md">
			{hasLike && onLike ? (
				<PlayerButton
					active={!!liked}
					disabled={trackBusy || disabled}
					aria-label="Like"
					style={liked && displayAccent ? { color: displayAccent } : undefined}
					onClick={onLike}
				>
					<LikeIcon />
				</PlayerButton>
			) : null}
			<PlayerButton disabled={trackBusy || disabled} aria-label="Previous" onClick={onPrev}>
				<PrevIcon />
			</PlayerButton>
			<PlayerButton
				variant="hero"
				disabled={trackBusy || disabled}
				aria-label={playing ? "Pause" : "Play"}
				style={
					displayAccent
						? {
								backgroundColor: `color-mix(in oklab, ${displayAccent} 28%, transparent)`,
								color: displayAccent,
							}
						: undefined
				}
				onClick={onPlayPause}
			>
				{playing ? <PauseIcon /> : <PlayIcon />}
			</PlayerButton>
			<PlayerButton disabled={trackBusy || disabled} aria-label="Next" onClick={onNext}>
				<NextIcon />
			</PlayerButton>
			{hasDislike && onDislike ? (
				<PlayerButton
					active={!!disliked}
					disabled={trackBusy || disabled}
					aria-label="Dislike"
					style={disliked && displayAccent ? { color: displayAccent } : undefined}
					onClick={onDislike}
				>
					<LikeIcon className="rotate-180" />
				</PlayerButton>
			) : null}
		</div>
	);
}

function TrayViewPage() {
	const utils = trpc.useUtils();
	const track = useTrack();
	const playState = useTrackState();
	const [trackBusy, setTrackBusy] = useState(false);
	const [trackAccent, setTrackAccent] = useState<string | null>(null);
	const playStateRef = useRef(playState);
	playStateRef.current = playState;

	const { enabled: lastFmEnabled, toggleLastFM, lastFM, lastFMLoading, isBusy: lastFmBusy } = useLastFm();
	const { enabled: discordEnabled, toggle: toggleDiscord, loading: discordLoading, connected: discordConnected, error: discordError } = useDiscord();
	const [apiEnabled, setApiEnabled] = useSettingsState<boolean>("api.enabled", false);
	const [widgetStyle] = useSettingsState<"default" | "capsule" | "lyrics" | "vinyl" | "circle">("trayView.widgetStyle", "default");
	const [circleDiscType, setCircleDiscType] = useSettingsState<"vinyl" | "art">("trayView.circleDiscType", "vinyl");
	const [autoHideControls] = useSettingsState<boolean>("trayView.autoHideControls", false);
	const [activeTheme] = useSettingsState<string>("themes.selected", "default");
	const { data: pinned = false } = trpc.trayView.pinned.useQuery();
	const [contentHovered, setContentHovered] = useState(false);
	const [leftThirdHovered, setLeftThirdHovered] = useState(false);
	const [chromeTooltipOpen, setChromeTooltipOpen] = useState(false);
	/** Only show chrome buttons when user hovers over the tray widget (or tooltip open) */
	const chromeVisible = contentHovered || chromeTooltipOpen;

	const { mutateAsync: next } = trpc.track.next.useMutation();
	const { mutateAsync: prev } = trpc.track.prev.useMutation();
	const { mutateAsync: pause } = trpc.track.pause.useMutation();
	const { mutateAsync: play } = trpc.track.play.useMutation();
	const { mutateAsync: seek } = trpc.track.seek.useMutation();
	const { mutateAsync: like } = trpc.track.like.useMutation();
	const { mutateAsync: dislike } = trpc.track.dislike.useMutation();
	const { mutateAsync: hideTrayView } = trpc.trayView.hide.useMutation();
	const { mutateAsync: openMain } = trpc.trayView.openMain.useMutation();
	const { mutateAsync: toggleTrayPin } = trpc.trayView.togglePinned.useMutation();
	const { mutateAsync: openSettings } = trpc.app.openSettings.useMutation();

	useEffect(() => {
		document.title = "YouTube Music - Tray";
		document.documentElement.classList.add("translucent");
		return () => {
			document.documentElement.classList.remove("translucent");
		};
	}, []);

	useEffect(() => {
		const collapse = (ev: { clientX: number; clientY: number }) => {
			if (pointerInsideWindow(ev)) return;
			setLeftThirdHovered(false);
		};
		const onBlur = () => setLeftThirdHovered(false);
		const root = document.documentElement;
		root.addEventListener("mouseleave", collapse);
		window.addEventListener("blur", onBlur);
		return () => {
			root.removeEventListener("mouseleave", collapse);
			window.removeEventListener("blur", onBlur);
		};
	}, []);

	trpc.trayView.onState.useSubscription(undefined, {
		onData: (state) => {
			if (typeof state?.pinned === "boolean") utils.trayView.pinned.setData(undefined, state.pinned);
		},
	});

	const thumbnail = toAppThumbUrl(track?.meta?.thumbnail);
	const playing = !!playState?.playing;
	const title = track?.video?.title ?? "Nothing playing";
	const artist = track?.video?.author ?? "";
	const hasLike = typeof playState?.liked === "boolean";
	const hasDislike = typeof playState?.disliked === "boolean";
	const liveAccent = trackAccent || playState?.accent || null;
	const { src: artSrc, accent: displayAccent } = useAlignedArtDisplay(thumbnail, liveAccent);

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
		// utils.track.accent identity churns every render — only re-fetch on thumbnail.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
	}, [thumbnail]);

	const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
	const [lyricsLoading, setLyricsLoading] = useState(false);
	const lastFetchedIdRef = useRef<string | null>(null);

	const videoId = track?.video?.videoId;
	const duration = playState?.duration || Number(track?.meta?.duration) || 0;
	const progress = playState?.progress ?? 0;
	const rawTitle = track?.video?.title;
	const rawAuthor = track?.video?.author;

	// Fetch lyrics when track changes
	useEffect(() => {
		if (!rawTitle) {
			setLrcLines([]);
			lastFetchedIdRef.current = null;
			return;
		}
		if (lastFetchedIdRef.current === videoId && videoId) {
			return;
		}
		lastFetchedIdRef.current = videoId ?? null;
		setLrcLines([]);
		setLyricsLoading(true);

		let cancelled = false;

		const cleanTitle = rawTitle.replace(/[\(\[][^\)\]]*(official|video|mv|audio|lyrics?)[^\)\]]*[\)\]]/gi, "").trim() || rawTitle;
		const searchParams = new URLSearchParams({
			track_name: cleanTitle,
			artist_name: rawAuthor || "",
		});
		if (duration > 0) {
			searchParams.set("duration", String(Math.round(duration)));
		}

		fetch(`https://lrclib.net/api/get?${searchParams.toString()}`)
			.then(async (res) => {
				if (!res.ok) {
					const fallbackRes = await fetch(
						`https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${rawAuthor || ""}`)}`,
					);
					let result: any = null;
					if (fallbackRes.ok) {
						const hits = await fallbackRes.json();
						if (Array.isArray(hits) && hits.length > 0) {
							result = hits.find((h: any) => h.syncedLyrics) || hits[0];
						}
					}
					if (!result?.syncedLyrics) {
						const titleOnlyRes = await fetch(
							`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`,
						);
						if (titleOnlyRes.ok) {
							const hits = await titleOnlyRes.json();
							if (Array.isArray(hits) && hits.length > 0) {
								const best = hits.find((h: any) => h.syncedLyrics) || hits[0];
								if (best?.syncedLyrics || !result) result = best;
							}
						}
					}
					return result;
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
	}, [videoId, rawTitle, rawAuthor]);

	// Current, previous and next lyric lines
	const { currentLine, prevLine, nextLine } = useMemo(() => {
		if (!lrcLines.length) return { currentLine: null, prevLine: null, nextLine: null };
		const curMs = progress * 1000;
		if (lrcLines[0] && curMs + 200 < lrcLines[0].timeMs) {
			return { currentLine: null, prevLine: null, nextLine: lrcLines[0]?.text || null };
		}
		let idx = -1;
		for (let i = 0; i < lrcLines.length; i++) {
			if (lrcLines[i].timeMs <= curMs + 200) {
				idx = i;
			} else {
				break;
			}
		}
		return {
			currentLine: idx >= 0 ? lrcLines[idx]?.text || null : null,
			prevLine: idx > 0 ? lrcLines[idx - 1]?.text || null : null,
			nextLine: idx >= 0 && idx + 1 < lrcLines.length ? lrcLines[idx + 1]?.text || null : null,
		};
	}, [lrcLines, progress]);

	const time = useMemo((): { current: string; end: string; pct: number } | null => {
		const progress = playState?.progress;
		const duration = playState?.duration || Number(track?.meta?.duration) || 0;
		if (typeof progress !== "number" || duration <= 0) return null;
		const elapsed = clamp(progress, 0, duration);
		return {
			current: formatTime(elapsed),
			end: formatTime(duration),
			pct: clamp((elapsed / duration) * 100, 0, 100),
		};
	}, [playState?.progress, playState?.duration, track?.meta?.duration]);

	function handleNext() {
		setTrackBusy(true);
		return next()
			.finally(() => setTrackBusy(false))
			.then(() => {
				if (playStateRef.current) patchPlayState(utils, { progress: 0 });
			});
	}

	function handlePrev() {
		setTrackBusy(true);
		return prev().finally(() => {
			setTrackBusy(false);
			if (playStateRef.current) patchPlayState(utils, { progress: 0 });
		});
	}

	function likeToggle() {
		if (typeof playStateRef.current?.liked !== "boolean") return;
		const next = !playStateRef.current.liked;
		patchPlayState(utils, { liked: next, ...(next ? { disliked: false } : {}) });
		setTrackBusy(true);
		return like({ liked: next })
			.then((liked) => {
				if (typeof liked === "boolean") {
					patchPlayState(utils, { liked, ...(liked ? { disliked: false } : {}) });
				}
			})
			.finally(() => setTrackBusy(false));
	}

	function dislikeToggle() {
		if (typeof playStateRef.current?.disliked !== "boolean") return;
		const next = !playStateRef.current.disliked;
		patchPlayState(utils, { disliked: next, ...(next ? { liked: false } : {}) });
		setTrackBusy(true);
		return dislike({ disliked: next })
			.then((disliked) => {
				if (typeof disliked === "boolean") {
					patchPlayState(utils, { disliked, ...(disliked ? { liked: false } : {}) });
				}
			})
			.finally(() => setTrackBusy(false));
	}

	async function handleSettings() {
		await hideTrayView();
		await openSettings();
	}

	async function handlePinToggle() {
		try {
			const applied = await toggleTrayPin();
			utils.trayView.pinned.setData(undefined, applied);
		} catch {
			/* keep last known pin */
		}
	}

	const durationSec = playState?.duration || Number(track?.meta?.duration) || 0;

	function handleSeek(seekTimeMs: number) {
		if (trackBusy) return;
		const current = playStateRef.current;
		if (!current) return;
		const dur = current.duration || Number(track?.meta?.duration) || 0;
		if (dur <= 0) return;
		setTrackBusy(true);
		void seek({ time: seekTimeMs, type: "seek" })
			.then(() => {
				patchPlayState(utils, { progress: seekTimeMs / 1000, duration: dur });
			})
			.finally(() => setTrackBusy(false));
	}

	const themeContainerClass = useMemo(() => {
		switch (activeTheme) {
			case "oled":
				return "bg-black text-white border-neutral-800 shadow-2xl";
			case "cyberpunk":
				return "bg-[#0b001a] text-cyan-200 border-pink-500/40 shadow-[0_0_25px_rgba(236,72,153,0.2)]";
			case "mica":
				return "bg-background/60 backdrop-blur-2xl border-white/20 shadow-xl";
			case "liquid-glass":
				return "bg-background/40 backdrop-blur-3xl border-white/25 shadow-2xl";
			default:
				return "bg-background text-foreground border-border shadow-sm";
		}
	}, [activeTheme]);

	if (widgetStyle === "circle") {
		return (
			<div className="absolute inset-0 flex items-center justify-center p-1 bg-transparent select-none overflow-hidden">
				<CircleDiscWidget
					artSrc={artSrc}
					playing={playing}
					title={title}
					artist={artist}
					time={time}
					displayAccent={displayAccent}
					pinned={pinned}
					discType={circleDiscType || "vinyl"}
					onToggleDiscType={() => setCircleDiscType((prev) => (prev === "art" ? "vinyl" : "art"))}
					onPlayPause={() => void (!playing ? play() : pause())}
					onPrev={handlePrev}
					onNext={handleNext}
					onPinToggle={() => void handlePinToggle()}
					onOpenMain={() => void openMain()}
					onSettings={() => void handleSettings()}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn("absolute inset-0 flex overflow-hidden border rounded-2xl", themeContainerClass)}
			onMouseEnter={(ev) => {
				setContentHovered(true);
				const { left, width } = ev.currentTarget.getBoundingClientRect();
				if (width <= 0) return;
				setLeftThirdHovered((ev.clientX - left) / width < 1 / 3);
			}}
			onMouseMove={(ev) => {
				const { left, width } = ev.currentTarget.getBoundingClientRect();
				if (width <= 0) return;
				const inLeftThird = (ev.clientX - left) / width < 1 / 3;
				setLeftThirdHovered((prev) => (prev === inLeftThird ? prev : inLeftThird));
			}}
			onMouseLeave={(ev) => {
				setContentHovered(false);
				if (pointerInsideWindow(ev)) return;
				setLeftThirdHovered(false);
			}}
		>
			<TrayBleedArt src={artSrc} accent={displayAccent} />
			<TrayAccentPill
				accent={displayAccent}
				drag={pinned}
				expanded={pinned && leftThirdHovered}
				autoHide={autoHideControls}
				contentHovered={contentHovered}
			/>

			<div className="no-drag relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
				<div className="relative z-10 flex min-h-0 flex-1">
					{/* Player column */}
					<div className="relative flex min-w-0 flex-1 flex-col px-3 pt-3 pb-2">
						{/* Chrome: sleek ghost buttons, only fade in when hovered */}
						<div
							className={cn(
								"no-drag absolute top-1.5 right-2 z-30 flex items-center gap-1",
								"transition-all duration-150 ease-out",
								chromeVisible
									? "pointer-events-auto translate-y-0 opacity-100"
									: "pointer-events-none -translate-y-1 opacity-0",
							)}
						>
							<Tooltip onOpenChange={setChromeTooltipOpen}>
								<TooltipTrigger
									render={
										<ChromeButton
											aria-label={pinned ? "Unpin" : "Pin"}
											aria-pressed={pinned}
											data-active={pinned ? "true" : undefined}
											onPointerDown={(ev) => {
												if (ev.button !== 0) return;
												ev.preventDefault();
												ev.stopPropagation();
												void handlePinToggle();
											}}
											className={cn("no-drag", pinned && "text-accent hover:text-accent/80")}
										>
											<PinIcon className={cn("size-3.5", pinned && "fill-current rotate-45")} />
										</ChromeButton>
									}
								/>
								<TooltipContent side="bottom">{pinned ? "Bỏ ghim" : "Ghim"}</TooltipContent>
							</Tooltip>
							<Tooltip onOpenChange={setChromeTooltipOpen}>
								<TooltipTrigger
									render={
										<ChromeButton aria-label="Back to app" onClick={() => void openMain()}>
											<ArrowLeftIcon className="size-3.5" />
										</ChromeButton>
									}
								/>
								<TooltipContent side="bottom">Mở ứng dụng</TooltipContent>
							</Tooltip>
							<Tooltip onOpenChange={setChromeTooltipOpen}>
								<TooltipTrigger
									render={
										<ChromeButton aria-label="Settings" onClick={() => void handleSettings()}>
											<SettingsIcon className="size-3.5" />
										</ChromeButton>
									}
								/>
								<TooltipContent side="bottom">Cài đặt</TooltipContent>
							</Tooltip>
						</div>

						{/* Capsule / Dynamic Island Mode */}
						{widgetStyle === "capsule" && (
							<div className="flex flex-col h-full justify-between">
								<div className="flex items-center gap-2.5 rounded-2xl bg-background/50 border border-border/40 p-2 shadow-sm backdrop-blur-md pr-16">
									<div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-border/60 shadow-sm">
										{artSrc ? (
											<motion.img
												key={artSrc}
												src={artSrc}
												alt=""
												className="size-full object-cover pointer-events-none select-none"
												animate={playing ? { rotate: 360 } : undefined}
												transition={playing ? { repeat: Infinity, duration: 12, ease: "linear" } : undefined}
											/>
										) : (
											<div className="size-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
												YTM
											</div>
										)}
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<p className="truncate text-sm font-semibold leading-tight">{title}</p>
											<AudioEqualizer playing={playing} color={displayAccent} />
										</div>
										{artist ? <p className="truncate text-xs text-muted-foreground mt-0.5">{artist}</p> : null}
									</div>

									{hasLike && (
										<PlayerButton
											active={!!playState?.liked}
											disabled={trackBusy || !track}
											aria-label="Like"
											style={playState?.liked && displayAccent ? { color: displayAccent } : undefined}
											onClick={likeToggle}
											className="size-7"
										>
											<LikeIcon className="size-3.5" />
										</PlayerButton>
									)}
								</div>

								<TrayProgressBar
									time={time}
									durationSec={durationSec}
									displayAccent={displayAccent}
									disabled={trackBusy || !track}
									onSeek={handleSeek}
									compact
								/>

								<div className="flex justify-center pb-1">
									<TrayTransportDock
										playing={playing}
										trackBusy={trackBusy}
										disabled={!track}
										hasLike={false}
										hasDislike={false}
										displayAccent={displayAccent}
										onPlayPause={() => void (!playing ? play() : pause())}
										onPrev={handlePrev}
										onNext={handleNext}
									/>
								</div>
							</div>
						)}

						{/* Lyrics / Karaoke Mode */}
						{widgetStyle === "lyrics" && (
							<div className="flex flex-col h-full justify-between">
								<div className="flex items-center gap-2 pr-20">
									<div className="size-6 shrink-0 rounded-md overflow-hidden ring-1 ring-border/50">
										{artSrc ? (
											<img src={artSrc} alt="" className="size-full object-cover pointer-events-none" />
										) : (
											<div className="size-full bg-muted flex items-center justify-center text-[8px]">YTM</div>
										)}
									</div>
									<div className="min-w-0 flex-1 truncate text-xs font-medium">
										<span className="text-foreground font-semibold">{title}</span>
										{artist ? <span className="text-muted-foreground ml-1">· {artist}</span> : null}
									</div>
								</div>

								<div className="my-auto flex flex-col items-center justify-center text-center px-2 py-1 select-none">
									{currentLine ? (
										<>
											<p className="w-full truncate text-[11px] font-normal text-muted-foreground/50 transition-all duration-200">
												{prevLine ?? "..."}
											</p>
											<motion.p
												key={currentLine}
												initial={{ opacity: 0, y: 3, scale: 0.98 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												transition={{ duration: 0.2 }}
												className="w-full truncate text-sm font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.35)] py-1 tracking-wide"
												style={displayAccent ? { color: displayAccent, textShadow: `0 0 10px ${displayAccent}60` } : undefined}
											>
												♪ {currentLine}
											</motion.p>
											<p className="w-full truncate text-[11px] font-normal text-muted-foreground/60 transition-all duration-200">
												{nextLine ?? "..."}
											</p>
										</>
									) : lyricsLoading ? (
										<div className="flex items-center gap-2 text-xs text-muted-foreground/70 italic py-2">
											<Spinner className="size-3" />
											<span>Đang tìm lời bài hát…</span>
										</div>
									) : lrcLines.length > 0 ? (
										<div className="flex flex-col items-center justify-center text-center py-1">
											<p className="text-xs italic text-muted-foreground/50">♪ Nhạc dạo...</p>
											{nextLine ? (
												<p className="w-full truncate text-[11px] font-normal text-muted-foreground/60 mt-0.5">
													{nextLine}
												</p>
											) : null}
										</div>
									) : (
										<div className="text-center py-2">
											<p className="text-[11px] text-muted-foreground/60">Không tìm thấy lời bài hát</p>
										</div>
									)}
								</div>

								<div>
									<TrayProgressBar
										time={time}
										durationSec={durationSec}
										displayAccent={displayAccent}
										disabled={trackBusy || !track}
										onSeek={handleSeek}
										compact
									/>
									<div className="flex justify-center pt-1 pb-1">
										<TrayTransportDock
											playing={playing}
											trackBusy={trackBusy}
											disabled={!track}
											hasLike={hasLike}
											hasDislike={hasDislike}
											liked={playState?.liked}
											disliked={playState?.disliked}
											displayAccent={displayAccent}
											onPlayPause={() => void (!playing ? play() : pause())}
											onPrev={handlePrev}
											onNext={handleNext}
											onLike={likeToggle}
											onDislike={dislikeToggle}
										/>
									</div>
								</div>
							</div>
						)}

						{/* Vinyl Record Player Mode */}
						{widgetStyle === "vinyl" && (
							<div className="flex items-center gap-3 h-full">
								<VinylDisc artSrc={artSrc} playing={playing} displayAccent={displayAccent} />

								<div className="min-w-0 flex-1 flex flex-col justify-between h-full py-0.5 pr-14">
									<div>
										<p className="truncate text-base font-semibold leading-tight">{title}</p>
										{artist ? <p className="truncate text-xs text-muted-foreground mt-0.5">{artist}</p> : null}
										{currentLine ? (
											<p className="mt-1 truncate text-xs font-medium text-emerald-400 flex items-center gap-1">
												<span>♪</span>
												<span className="truncate">{currentLine}</span>
											</p>
										) : null}
									</div>

									<TrayProgressBar
										time={time}
										durationSec={durationSec}
										displayAccent={displayAccent}
										disabled={trackBusy || !track}
										onSeek={handleSeek}
										compact
									/>

									<div className="flex items-center justify-start gap-2 pt-1">
										<TrayTransportDock
											playing={playing}
											trackBusy={trackBusy}
											disabled={!track}
											hasLike={hasLike}
											hasDislike={false}
											liked={playState?.liked}
											displayAccent={displayAccent}
											onPlayPause={() => void (!playing ? play() : pause())}
											onPrev={handlePrev}
											onNext={handleNext}
											onLike={likeToggle}
										/>
									</div>
								</div>
							</div>
						)}

						{/* Default Mode */}
						{(widgetStyle === "default" || !widgetStyle) && (
							<div className="flex flex-col h-full justify-between">
								<div className="flex items-start gap-2.5 pr-16">
									<TrayCoverArt src={artSrc} />

									<div className="min-w-0 flex-1 pt-0.5">
										<p className="truncate text-base leading-tight font-semibold">{title}</p>
										{artist ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{artist}</p> : null}
										{currentLine ? (
											<p className="mt-1 truncate text-xs font-semibold text-emerald-400 flex items-center gap-1.5 drop-shadow-sm">
												<span className="shrink-0 text-[11px]">♪</span>
												<span className="truncate">{currentLine}</span>
											</p>
										) : lyricsLoading ? (
											<p className="mt-1 truncate text-[11px] text-muted-foreground/60 italic flex items-center gap-1">
												<span className="shrink-0 text-[10px]">♪</span>
												<span>Đang tìm lời bài hát…</span>
											</p>
										) : null}
									</div>
								</div>

								<TrayProgressBar
									time={time}
									durationSec={durationSec}
									displayAccent={displayAccent}
									disabled={trackBusy || !track}
									onSeek={handleSeek}
								/>

								<div className="flex justify-center pt-2">
									<TrayTransportDock
										playing={playing}
										trackBusy={trackBusy}
										disabled={!track}
										hasLike={hasLike}
										hasDislike={hasDislike}
										liked={playState?.liked}
										disliked={playState?.disliked}
										displayAccent={displayAccent}
										onPlayPause={() => void (!playing ? play() : pause())}
										onPrev={handlePrev}
										onNext={handleNext}
										onLike={likeToggle}
										onDislike={dislikeToggle}
									/>
								</div>
							</div>
						)}
					</div>

					{/* Control center column */}
					<div
						className={cn(
							"relative z-10 flex w-12 shrink-0 flex-col items-center justify-center gap-1.5 border-l border-border/60 bg-background/40 px-1.5 py-2 backdrop-blur-sm",
							"transition-all duration-200 ease-out",
							autoHideControls && !contentHovered && "opacity-0 pointer-events-none translate-x-2",
						)}
					>
						<Tooltip>
							<TooltipTrigger
								render={
									<ControlToggle
										active={lastFmEnabled}
										busy={lastFmBusy || lastFMLoading}
										aria-label={lastFmEnabled ? "Disable Last.fm" : "Enable Last.fm"}
										onClick={() => void toggleLastFM(!lastFmEnabled)}
									>
										<LastFMIcon
											className={cn(
												lastFmEnabled && lastFM.error && "text-red-500",
												lastFmEnabled && lastFM.connected && !lastFM.error && "text-green-500",
											)}
										/>
									</ControlToggle>
								}
							/>
							<TooltipContent side="left">
								{lastFmEnabled ? (lastFM.name ? `Last.fm · ${lastFM.name}` : "Last.fm on") : "Last.fm off"}
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger
								render={
									<ControlToggle
										active={discordEnabled}
										busy={discordLoading}
										aria-label={discordEnabled ? "Disable Discord" : "Enable Discord"}
										onClick={toggleDiscord}
									>
										<DiscordIcon className={cn(discordEnabled && discordError && "text-red-500")} />
									</ControlToggle>
								}
							/>
							<TooltipContent side="left">
								{discordError && discordEnabled
									? `Discord · ${discordError}`
									: discordEnabled
										? discordConnected
											? "Discord on"
											: "Discord connecting…"
										: "Discord off"}
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger
								render={
									<ControlToggle
										active={apiEnabled}
										aria-label={apiEnabled ? "Disable Local API" : "Enable Local API"}
										onClick={() => setApiEnabled((prev) => !prev)}
									>
										<ApiIcon />
									</ControlToggle>
								}
							/>
							<TooltipContent side="left">{apiEnabled ? "Local API on" : "Local API off"}</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	);
}
