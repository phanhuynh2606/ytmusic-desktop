import {
	RiAppleLine,
	RiCheckLine,
	RiCodeSSlashLine,
	RiDiscLine,
	RiImageLine,
	RiMoonLine,
	RiSparklingLine,
	RiWindowsLine,
} from "@remixicon/react";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsCheckbox } from "@/components/settings-checkbox";
import { SettingsInput } from "@/components/settings-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useSettingsState } from "@/hooks/use-settings";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_settings/appearance/themes")({
	component: ThemesSettingsPage,
});

const WIDGET_STYLES = [
	{
		id: "default",
		label: "Tiêu chuẩn (Full)",
		description: "Đầy đủ thanh tiến trình, ảnh bìa, lời và phím điều khiển",
		badge: "Standard",
	},
	{
		id: "capsule",
		label: "Thanh con nhộng (Capsule)",
		description: "Siêu nhỏ gọn phong cách Dynamic Island, chữ chạy mượt mà",
		badge: "Compact",
	},
	{
		id: "lyrics",
		label: "Tập trung lời (Karaoke)",
		description: "Phóng to lời bài hát đồng bộ ở trung tâm, bìa album mờ ảo",
		badge: "Lyrics",
	},
	{
		id: "vinyl",
		label: "Đĩa than (Vinyl Record)",
		description: "Đĩa than xoay tròn theo điệu nhạc, đậm chất retro chill",
		badge: "Retro",
	},
	{
		id: "circle",
		label: "Đĩa tròn mini (Floating Disc)",
		description: "Đúng 1 hình tròn đĩa than / ảnh bài hát xoay tròn tối giản tuyệt đối",
		badge: "Circle",
	},
] as const;

const CIRCLE_SIZES = [
	{ id: 160, label: "Nhỏ (160px)" },
	{ id: 200, label: "Vừa (200px)" },
	{ id: 260, label: "Lớn (260px)" },
	{ id: 320, label: "Cực lớn (320px)" },
] as const;

const THEME_METADATA: Record<
	string,
	{
		label: string;
		description: string;
		icon: React.ComponentType<{ className?: string }>;
		previewClass: string;
		accentColor: string;
		badge?: string;
	}
> = {
	default: {
		label: "Default Dark",
		description: "Giao diện tối tiêu chuẩn của YouTube Music",
		icon: RiMoonLine,
		previewClass: "bg-neutral-900 border-neutral-700",
		accentColor: "#ff0000",
	},
	oled: {
		label: "OLED Pure Black",
		description: "Nền đen sâu 100%, tăng tương phản & siêu tiết kiệm pin",
		icon: RiMoonLine,
		previewClass: "bg-black border-neutral-800 text-white",
		accentColor: "#ffffff",
		badge: "OLED",
	},
	cyberpunk: {
		label: "Cyberpunk Neon",
		description: "Tông tím hồng neon huyền ảo đồng bộ với logo app",
		icon: RiSparklingLine,
		previewClass: "bg-gradient-to-br from-[#13092b] to-[#090614] border-purple-500/50",
		accentColor: "#ec4899",
		badge: "Neon",
	},
	mica: {
		label: "Windows 11 Mica",
		description: "Kính mờ acrylic Fluent Design sang trọng của Windows 11",
		icon: RiWindowsLine,
		previewClass: "bg-[#181822]/90 border-sky-400/40 backdrop-blur-md",
		accentColor: "#60cdff",
		badge: "Fluent",
	},
	"liquid-glass": {
		label: "iOS Liquid Glass",
		description: "Kính lỏng trong suốt phủ mờ phản xạ ánh sáng phong cách Apple",
		icon: RiAppleLine,
		previewClass: "bg-white/[0.08] border-white/30 backdrop-blur-xl shadow-lg",
		accentColor: "#fa2d48",
		badge: "Liquid Glass",
	},
	custom: {
		label: "Custom Theme",
		description: "Tự viết hoặc nạp file SCSS / CSS riêng của bạn",
		icon: RiCodeSSlashLine,
		previewClass: "bg-neutral-900/80 border-dashed border-neutral-600",
		accentColor: "#10b981",
		badge: "SCSS",
	},
};

function ThemesSettingsPage() {
	const { mutateAsync: reload } = trpc.themes.reload.useMutation();
	const [enabled, , { isPending: enabledPending }] = useSettingsState("themes.enabled", false);
	const [selected, setSelected, { isPending: selectedPending }] = useSettingsState("themes.selected", "default", {
		onPersisted: () => {
			void reload();
		},
	});
	const [customFile, , { isPending: pathPending }] = useSettingsState("themes.customFile", "");
	const [widgetStyle, setWidgetStyle] = useSettingsState<string>("trayView.widgetStyle", "default");
	const [circleDiscType, setCircleDiscType] = useSettingsState<"vinyl" | "art">("trayView.circleDiscType", "vinyl");
	const [circleSize, setCircleSize] = useSettingsState<number>("trayView.circleSize", 200);
	const { data: themes } = trpc.themes.list.useQuery();
	const { mutateAsync: openFile } = trpc.app.openFile.useMutation();

	const isCustom = selected === "custom";

	const availableThemes = themes ?? [
		{ id: "default", name: "Default Dark", kind: "builtin" },
		{ id: "oled", name: "OLED Pure Black", kind: "builtin" },
		{ id: "cyberpunk", name: "Cyberpunk Neon", kind: "builtin" },
		{ id: "mica", name: "Windows 11 Mica Glass", kind: "builtin" },
		{ id: "liquid-glass", name: "iOS Liquid Glass", kind: "builtin" },
		{ id: "custom", name: "Custom", kind: "custom" },
	];

	return (
		<div className="space-y-6">
			<Card>
			<CardHeader>
				<CardTitle>Themes & Giao diện</CardTitle>
				<CardDescription>
					Chọn một trong các bộ giao diện độc quyền hoặc tự nạp file SCSS/CSS tùy chỉnh vào YouTube Music.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<SettingsCheckbox configKey="themes.enabled">Bật Giao diện tùy biến (Enable Themes)</SettingsCheckbox>
					<SettingsCheckbox configKey="themes.thumbnailBackground">
						Hiển thị ảnh nền mờ theo bài hát (Thumbnail Background)
					</SettingsCheckbox>
					<SettingsCheckbox
						configKey="themes.blur"
						description="Hiệu ứng kính mờ (Backdrop Blur) trên thanh điều khiển và danh sách phát. Tắt để tăng hiệu năng máy yếu."
					>
						Hiệu ứng kính mờ (Enable Blur)
					</SettingsCheckbox>

					{enabled && !enabledPending && (
						<div className="space-y-4 pt-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-foreground">Chọn Theme (Presets)</span>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => void reload()}
								>
									Tải lại Theme (Reload)
								</Button>
							</div>

							{/* Theme Cards Grid */}
							<div role="radiogroup" aria-label="Bộ chọn giao diện" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{availableThemes.map((theme) => {
									const meta = THEME_METADATA[theme.id] ?? {
										label: theme.name,
										description: (theme as any).description ?? "Giao diện tùy chỉnh",
										icon: RiMoonLine,
										previewClass: "bg-neutral-900 border-neutral-700",
										accentColor: "#ffffff",
									};
									const isSelected = selected === theme.id;
									const Icon = meta.icon;

									return (
										<button
											key={theme.id}
											type="button"
											role="radio"
											aria-checked={isSelected}
											disabled={selectedPending}
											onClick={() => {
												setSelected(theme.id);
											}}
											className={`relative flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
												isSelected
													? "border-primary ring-2 ring-primary/40 bg-accent/40 shadow-md"
													: "border-border/60 hover:border-border hover:bg-accent/20"
											}`}
										>
											{/* Theme Color Preview Strip */}
											<div
												className={`h-12 w-full rounded-lg mb-3 border p-2 flex items-center justify-between relative overflow-hidden ${meta.previewClass}`}
											>
												<div className="flex items-center gap-1.5 z-10">
													<div
														className="w-2.5 h-2.5 rounded-full"
														style={{ backgroundColor: meta.accentColor }}
													/>
													<div className="w-12 h-1.5 rounded-full bg-white/20" />
												</div>
												{meta.badge && (
													<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-black/40 border-white/20 text-white font-mono z-10">
														{meta.badge}
													</Badge>
												)}
											</div>

											{/* Info */}
											<div className="flex items-center justify-between gap-1 w-full">
												<div className="flex items-center gap-1.5">
													<Icon className="w-4 h-4 text-muted-foreground" />
													<span className="font-semibold text-sm text-foreground">{meta.label}</span>
												</div>
												{isSelected && (
													<span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
														<RiCheckLine className="w-3.5 h-3.5" />
													</span>
												)}
											</div>

											<p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
												{meta.description}
											</p>
										</button>
									);
								})}
							</div>

							{/* Custom Theme File Section */}
							{isCustom && !selectedPending && (
								<div className="mt-4 p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
									<SettingsCheckbox
										configKey="themes.watching"
										description="Tự động biên dịch lại và tiêm CSS ngay khi bạn lưu file trên máy tính."
									>
										Tự động cập nhật khi file thay đổi (Update on Changes)
									</SettingsCheckbox>
									<SettingsInput
										configKey="themes.customFile"
										type="file"
										accept=".scss,.sass,.css"
										label="Đường dẫn file SCSS/CSS tùy chỉnh"
										hint={
											<div className="mt-2 flex justify-end gap-2">
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={pathPending}
													onClick={() => void reload()}
												>
													Biên dịch lại
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={pathPending || !customFile}
													onClick={() => {
														if (customFile) void openFile(customFile);
													}}
												>
													Mở file
												</Button>
											</div>
										}
									/>
								</div>
							)}
						</div>
					)}
				</FieldGroup>
			</CardContent>
		</Card>

		<Card className="mt-6">
			<CardHeader>
				<CardTitle>Kiểu dáng Widget (Mini Player)</CardTitle>
				<CardDescription>
					Tùy biến phong cách hiển thị của Mini Player nổi trên màn hình theo sở thích của bạn.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
					{WIDGET_STYLES.map((ws) => {
						const isSelected = (widgetStyle || "default") === ws.id;
						return (
							<button
								key={ws.id}
								type="button"
								onClick={() => setWidgetStyle(ws.id)}
								className={cn(
									"group relative flex flex-col p-4 rounded-xl border text-left transition-all duration-200",
									"hover:border-primary/50 hover:bg-muted/40",
									isSelected
										? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
										: "border-border/60 bg-card/60",
								)}
							>
								<div className="flex items-center justify-between w-full mb-2">
									<Badge variant={isSelected ? "default" : "outline"} className="text-[10px] font-medium">
										{ws.badge}
									</Badge>
									{isSelected && (
										<div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
											<RiCheckLine className="size-3.5" />
										</div>
									)}
								</div>
								<span className="font-semibold text-sm text-foreground">{ws.label}</span>
								<p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ws.description}</p>
							</button>
						);
					})}
				</div>

				{widgetStyle === "circle" && (
					<div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
						<div>
							<span className="text-xs font-semibold text-foreground">Kiểu hiển thị đĩa tròn:</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
								<button
									type="button"
									onClick={() => setCircleDiscType("vinyl")}
									className={cn(
										"flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg border text-left transition-all cursor-pointer",
										(circleDiscType || "vinyl") === "vinyl"
											? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
											: "border-border/60 hover:bg-muted/40 text-muted-foreground",
									)}
								>
									<RiDiscLine className="size-4 shrink-0 text-primary" />
									<div>
										<div className="font-medium text-foreground">Đĩa than cổ điển (Vinyl Record)</div>
										<div className="text-[10px] text-muted-foreground">Rãnh đĩa đen + bìa album ở giữa</div>
									</div>
								</button>
								<button
									type="button"
									onClick={() => setCircleDiscType("art")}
									className={cn(
										"flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg border text-left transition-all cursor-pointer",
										circleDiscType === "art"
											? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
											: "border-border/60 hover:bg-muted/40 text-muted-foreground",
									)}
								>
									<RiImageLine className="size-4 shrink-0 text-primary" />
									<div>
										<div className="font-medium text-foreground">Ảnh bài hát xoay tròn (Full Cover Art)</div>
										<div className="text-[10px] text-muted-foreground">Ảnh bìa toàn khung tròn + ánh phản chiếu</div>
									</div>
								</button>
							</div>
						</div>

						<div className="pt-2 border-t border-border/40">
							<span className="text-xs font-semibold text-foreground">Kích thước đĩa tròn (Size):</span>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
								{CIRCLE_SIZES.map((sz) => (
									<button
										key={sz.id}
										type="button"
										onClick={() => setCircleSize(sz.id)}
										className={cn(
											"px-2.5 py-1.5 text-xs rounded-lg border text-center transition-all cursor-pointer font-medium",
											(circleSize || 200) === sz.id
												? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
												: "border-border/60 hover:bg-muted/40 text-muted-foreground",
										)}
									>
										{sz.label}
									</button>
								))}
							</div>
							<p className="text-[11px] text-muted-foreground mt-1.5">
								Bạn cũng có thể kéo các góc của cửa sổ widget trên màn hình desktop để co giãn kích thước tự do.
							</p>
						</div>
					</div>
				)}

				<div className="mt-4 pt-4 border-t border-border/60">
					<SettingsCheckbox
						configKey="trayView.autoHideControls"
						description="Tự động ẩn thanh di chuyển bên trái và phím tắt kết nối bên phải khi không rê chuột vào widget để giao diện luôn sạch sẽ."
					>
						Tự động ẩn thanh điều khiển (Auto-hide Chrome)
					</SettingsCheckbox>
				</div>
			</CardContent>
		</Card>
	</div>
);
}
