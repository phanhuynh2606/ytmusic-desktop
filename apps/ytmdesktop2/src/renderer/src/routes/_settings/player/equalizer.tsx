import { RiEqualizerLine, RiRestartLine, RiVolumeUpLine } from "@remixicon/react";
import {
	DEFAULT_EQUALIZER_CONFIG,
	EQ_FREQUENCIES,
	EQUALIZER_PRESETS,
	type EqualizerConfig,
	type EqualizerPresetItem,
} from "@shared/equalizer/constants";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SettingsCheckbox } from "@/components/settings-checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useSettingsState } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_settings/player/equalizer")({
	component: EqualizerSettingsPage,
});

function formatFreq(freq: number): string {
	if (freq >= 1000) {
		return `${freq / 1000}k`;
	}
	return `${freq}`;
}

const PRESET_CATEGORIES: { id: string; label: string; presets: string[] }[] = [
	{
		id: "all",
		label: "Tất cả",
		presets: Object.keys(EQUALIZER_PRESETS),
	},
	{
		id: "popular",
		label: "Phổ biến",
		presets: ["flat", "bass-boost", "pop", "rock", "electronic", "hip-hop"],
	},
	{
		id: "genres",
		label: "Thể loại",
		presets: ["jazz", "acoustic", "classical", "rnb", "dance"],
	},
	{
		id: "special",
		label: "Hiệu ứng đặc biệt",
		presets: ["lofi", "cinema", "treble-boost", "vocal-clarity", "vocal"],
	},
];

function EqFrequencyCurve({ gains }: { gains: number[] }) {
	const svgWidth = 800;
	const svgHeight = 120;
	const padX = 40;
	const padY = 16;
	const usableW = svgWidth - padX * 2;
	const usableH = svgHeight - padY * 2;

	// Calculate points for the 10 bands
	const points = gains.map((gain, i) => {
		const x = padX + (i / (gains.length - 1)) * usableW;
		// gain is -12 to +12, normalize to 0..1 (top is +12, bottom is -12)
		const normY = (12 - gain) / 24;
		const y = padY + normY * usableH;
		return { x, y };
	});

	// Build smooth SVG curve path
	let pathD = `M ${points[0].x} ${points[0].y}`;
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i === 0 ? i : i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

		// Tension cubic control points
		const cp1x = p1.x + (p2.x - p0.x) / 6;
		const cp1y = p1.y + (p2.y - p0.y) / 6;
		const cp2x = p2.x - (p3.x - p1.x) / 6;
		const cp2y = p2.y - (p3.y - p1.y) / 6;

		pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
	}

	const areaPathD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - padY} L ${points[0].x} ${svgHeight - padY} Z`;
	const zeroLineY = padY + 0.5 * usableH;

	return (
		<div className="w-full bg-neutral-950/70 rounded-xl p-3 border border-neutral-800/80 shadow-inner">
			<div className="flex items-center justify-between mb-1 px-1">
				<span className="text-[11px] font-medium text-neutral-400">Đường cong tần số (Frequency Response Curve)</span>
				<div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500">
					<span>+12 dB</span>
					<span>0 dB</span>
					<span>-12 dB</span>
				</div>
			</div>

			<svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 overflow-visible">
				<defs>
					<linearGradient id="eqAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="var(--accent, #f59e0b)" stopOpacity="0.45" />
						<stop offset="60%" stopColor="var(--accent, #f59e0b)" stopOpacity="0.1" />
						<stop offset="100%" stopColor="var(--accent, #f59e0b)" stopOpacity="0" />
					</linearGradient>
					<linearGradient id="eqLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#818cf8" />
						<stop offset="50%" stopColor="#f59e0b" />
						<stop offset="100%" stopColor="#06b6d4" />
					</linearGradient>
				</defs>

				{/* 0dB Reference Line */}
				<line
					x1={padX}
					y1={zeroLineY}
					x2={svgWidth - padX}
					y2={zeroLineY}
					stroke="rgba(255,255,255,0.12)"
					strokeDasharray="4 4"
					strokeWidth="1"
				/>

				{/* Vertical guide lines at each band */}
				{points.map((pt, idx) => (
					<line
						key={idx}
						x1={pt.x}
						y1={padY}
						x2={pt.x}
						y2={svgHeight - padY}
						stroke="rgba(255,255,255,0.04)"
						strokeWidth="1"
					/>
				))}

				{/* Area under curve */}
				<path d={areaPathD} fill="url(#eqAreaGrad)" />

				{/* Curve Line */}
				<path
					d={pathD}
					fill="none"
					stroke="url(#eqLineGrad)"
					strokeWidth="2.5"
					strokeLinecap="round"
					className="transition-all duration-150"
				/>

				{/* Dots at frequencies */}
				{points.map((pt, idx) => (
					<g key={idx}>
						<circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" className="transition-all duration-150" />
						<circle
							cx={pt.x}
							cy={pt.y}
							r="2"
							fill="var(--accent, #f59e0b)"
							className="transition-all duration-150"
						/>
					</g>
				))}
			</svg>
		</div>
	);
}

function EqualizerSettingsPage() {
	const [config, setConfig, { isPending }] = useSettingsState<EqualizerConfig>(
		"equalizer",
		DEFAULT_EQUALIZER_CONFIG,
	);

	const [activeCategory, setActiveCategory] = useState("all");

	const isEnabled = config?.enabled ?? false;
	const currentGains = useMemo(() => config?.gains ?? DEFAULT_EQUALIZER_CONFIG.gains, [config?.gains]);
	const bassBoost = config?.bassBoost ?? 0;
	const preAmp = config?.preAmp ?? 0;
	const currentPreset = config?.preset ?? "flat";

	const handlePresetChange = (presetKey: string) => {
		const preset = EQUALIZER_PRESETS[presetKey];
		if (!preset) return;
		setConfig((prev) => ({
			...prev,
			preset: presetKey,
			gains: [...preset.gains],
			bassBoost: preset.bassBoost,
		}));
	};

	const handleGainChange = (index: number, value: number) => {
		const nextGains = [...currentGains];
		nextGains[index] = value;
		setConfig((prev) => ({
			...prev,
			preset: "custom",
			gains: nextGains,
		}));
	};

	const handleBassBoostChange = (value: number) => {
		setConfig((prev) => ({
			...prev,
			preset: "custom",
			bassBoost: value,
		}));
	};

	const handlePreAmpChange = (value: number) => {
		setConfig((prev) => ({
			...prev,
			preset: "custom",
			preAmp: value,
		}));
	};

	const handleReset = () => {
		setConfig({
			...DEFAULT_EQUALIZER_CONFIG,
			enabled: isEnabled,
		});
	};

	const displayedPresets = useMemo(() => {
		const cat = PRESET_CATEGORIES.find((c) => c.id === activeCategory);
		return cat ? cat.presets : Object.keys(EQUALIZER_PRESETS);
	}, [activeCategory]);

	return (
		<div className="space-y-4 max-w-4xl">
			{/* Master Equalizer Switch Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<CardTitle className="flex items-center gap-2">
								<RiEqualizerLine className="size-5 text-amber-400" />
								<span>Bộ Cân Chỉnh Âm Thanh (10-Band EQ & Presets)</span>
							</CardTitle>
							<CardDescription>
								Cân bằng tần số âm thanh chuyên nghiệp, làm rõ giọng hát hoặc tăng cường lực đánh âm trầm siêu sâu.
							</CardDescription>
						</div>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={handleReset}
							className="flex items-center gap-1.5 cursor-pointer"
						>
							<RiRestartLine className="size-4" />
							<span>Đặt lại</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsCheckbox
							configKey="equalizer.enabled"
							description="Bật/Tắt hiệu ứng cân bằng âm thanh và tăng âm trầm trên YouTube Music."
						>
							Kích hoạt Equalizer (Enable EQ)
						</SettingsCheckbox>
					</FieldGroup>
				</CardContent>
			</Card>

			{isEnabled && !isPending && (
				<>
					{/* Interactive Frequency Curve */}
					<Card>
						<CardContent className="pt-5">
							<EqFrequencyCurve gains={currentGains} />
						</CardContent>
					</Card>

					{/* Presets Grid with Categories */}
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm">Cấu hình âm thanh có sẵn (Presets)</CardTitle>
								{currentPreset === "custom" && (
									<Badge variant="outline" className="px-2.5 py-0.5 text-[11px] border-amber-500/50 text-amber-400">
										Tùy chỉnh cá nhân (Custom)
									</Badge>
								)}
							</div>
							{/* Category Filter Tabs */}
							<div className="flex items-center gap-1.5 pt-2">
								{PRESET_CATEGORIES.map((cat) => (
									<button
										key={cat.id}
										type="button"
										onClick={() => setActiveCategory(cat.id)}
										className={cn(
											"px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer",
											activeCategory === cat.id
												? "bg-neutral-800 text-white font-medium"
												: "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900",
										)}
									>
										{cat.label}
									</button>
								))}
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2 pt-1">
								{displayedPresets.map((key) => {
									const item = EQUALIZER_PRESETS[key];
									if (!item) return null;
									const isSelected = currentPreset === key;
									return (
										<Button
											key={key}
											type="button"
											size="sm"
											variant={isSelected ? "default" : "outline"}
											onClick={() => handlePresetChange(key)}
											className={cn("text-xs cursor-pointer", isSelected && "ring-1 ring-amber-400")}
										>
											{item.name}
										</Button>
									);
								})}
							</div>
						</CardContent>
					</Card>

					{/* Bass Boost & Pre-Amp */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm flex items-center gap-1.5">
										<RiVolumeUpLine className="size-4 text-purple-400" />
										<span>Bass Boost (Siêu trầm)</span>
									</CardTitle>
									<span className="text-xs font-mono font-bold text-purple-400">{bassBoost}%</span>
								</div>
								<CardDescription className="text-xs">
									Tăng cường độ sâu và lực đánh của dải âm trầm siêu thấp (80Hz).
								</CardDescription>
							</CardHeader>
							<CardContent>
								<input
									type="range"
									min={0}
									max={100}
									step={1}
									value={bassBoost}
									onChange={(e) => handleBassBoostChange(Number(e.target.value))}
									className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Pre-Amp (Âm lượng đầu vào)</CardTitle>
									<span className="text-xs font-mono font-bold">
										{preAmp > 0 ? `+${preAmp}` : preAmp} dB
									</span>
								</div>
								<CardDescription className="text-xs">
									Cân bằng âm lượng tổng thể để chống vỡ tiếng (clipping) khi tăng nhiều dải tần.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<input
									type="range"
									min={-12}
									max={12}
									step={0.5}
									value={preAmp}
									onChange={(e) => handlePreAmpChange(Number(e.target.value))}
									className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
								/>
							</CardContent>
						</Card>
					</div>

					{/* 10-Band Sliders Grid */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm">10 Dải tần số âm thanh (10-Band EQ)</CardTitle>
								<div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
									<span>+12 dB</span>
									<span>0 dB</span>
									<span>-12 dB</span>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5 pt-2 pb-1">
								{EQ_FREQUENCIES.map((freq, index) => {
									const gain = currentGains[index] ?? 0;
									return (
										<div
											key={freq}
											className="flex flex-col items-center justify-between bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/80 min-h-[220px]"
										>
											{/* Value display */}
											<span className="text-[11px] font-mono font-semibold text-foreground">
												{gain > 0 ? `+${gain}` : gain}
												<span className="text-[9px] text-muted-foreground ml-0.5">dB</span>
											</span>

											{/* Vertical Range Slider */}
											<div className="flex-1 flex items-center justify-center py-2">
												<input
													type="range"
													min={-12}
													max={12}
													step={0.5}
													value={gain}
													onChange={(e) => handleGainChange(index, Number(e.target.value))}
													style={{
														writingMode: "vertical-lr",
														direction: "rtl",
														width: "8px",
														height: "130px",
													}}
													className="cursor-pointer accent-amber-400"
												/>
											</div>

											{/* Frequency Label */}
											<div className="text-center mt-1">
												<span className="text-[11px] font-medium text-muted-foreground">
													{formatFreq(freq)}Hz
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
