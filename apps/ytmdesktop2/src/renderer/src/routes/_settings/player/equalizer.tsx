import { RiEqualizerLine, RiRestartLine, RiVolumeUpLine } from "@remixicon/react";
import {
	DEFAULT_EQUALIZER_CONFIG,
	EQ_FREQUENCIES,
	EQUALIZER_PRESETS,
	type EqualizerConfig,
	type EqualizerPresetItem,
} from "@shared/equalizer/constants";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SettingsCheckbox } from "@/components/settings-checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useSettingsState } from "@/hooks/use-settings";

export const Route = createFileRoute("/_settings/player/equalizer")({
	component: EqualizerSettingsPage,
});

function formatFreq(freq: number): string {
	if (freq >= 1000) {
		return `${freq / 1000}kHz`;
	}
	return `${freq}Hz`;
}

function EqualizerSettingsPage() {
	const [config, setConfig, { isPending }] = useSettingsState<EqualizerConfig>(
		"equalizer",
		DEFAULT_EQUALIZER_CONFIG,
	);

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

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<CardTitle className="flex items-center gap-2">
								<RiEqualizerLine className="size-5 text-primary" />
								<span>Bộ Cân Chỉnh Âm Thanh (10-Band EQ & Bass Boost)</span>
							</CardTitle>
							<CardDescription>
								Tinh chỉnh dải tần số âm thanh và tăng cường âm trầm theo gu âm nhạc của bạn qua Web Audio API.
							</CardDescription>
						</div>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={handleReset}
							className="flex items-center gap-1.5"
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
					{/* Presets Grid */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">Cấu hình âm thanh có sẵn (Presets)</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{Object.entries(EQUALIZER_PRESETS).map(([key, item]: [string, EqualizerPresetItem]) => {
									const isSelected = currentPreset === key;
									return (
										<Button
											key={key}
											type="button"
											size="sm"
											variant={isSelected ? "default" : "outline"}
											onClick={() => handlePresetChange(key)}
											className="text-xs"
										>
											{item.name}
										</Button>
									);
								})}
								{currentPreset === "custom" && (
									<Badge variant="outline" className="px-3 py-1 text-xs border-primary text-primary">
										Tùy chỉnh cá nhân (Custom)
									</Badge>
								)}
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
							<div className="grid grid-cols-5 sm:grid-cols-10 gap-3 pt-2 pb-1">
								{EQ_FREQUENCIES.map((freq, index) => {
									const gain = currentGains[index] ?? 0;
									return (
										<div
											key={freq}
											className="flex flex-col items-center justify-between bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80 min-h-[220px]"
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
													className="cursor-pointer accent-primary"
												/>
											</div>

											{/* Frequency Label */}
											<div className="text-center mt-1">
												<span className="text-[11px] font-medium text-muted-foreground">
													{formatFreq(freq)}
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
