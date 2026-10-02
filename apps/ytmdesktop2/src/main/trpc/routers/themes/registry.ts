import cyberpunkThemeScss from "@main/trpc/routers/themes/assets/cyberpunk.scss?raw";
import defaultThemeScss from "@main/trpc/routers/themes/assets/default.scss?raw";
import liquidGlassThemeScss from "@main/trpc/routers/themes/assets/liquid-glass.scss?raw";
import micaThemeScss from "@main/trpc/routers/themes/assets/mica.scss?raw";
import oledThemeScss from "@main/trpc/routers/themes/assets/oled.scss?raw";
import type { ThemesConfig } from "./types";

export interface BundledTheme {
	id: string;
	name: string;
	description?: string;
	source: string;
	kind: "scss";
}

export interface ThemeListItem {
	id: string;
	name: string;
	description?: string;
	kind: "builtin" | "custom";
}

export type ResolvedThemeSource =
	| { type: "string"; id: string; value: string }
	| { type: "file"; id: "custom"; value: string };

export const BUNDLED_THEMES = {
	default: {
		id: "default",
		name: "Default Dark",
		description: "Giao diện tối mặc định tối ưu",
		source: defaultThemeScss,
		kind: "scss" as const,
	},
	oled: {
		id: "oled",
		name: "OLED Pure Black",
		description: "Nền đen sâu 100%, tăng tương phản và tiết kiệm pin",
		source: oledThemeScss,
		kind: "scss" as const,
	},
	cyberpunk: {
		id: "cyberpunk",
		name: "Cyberpunk Neon",
		description: "Tông tím hồng neon huyền ảo đồng bộ với logo app",
		source: cyberpunkThemeScss,
		kind: "scss" as const,
	},
	mica: {
		id: "mica",
		name: "Windows 11 Mica Glass",
		description: "Kính mờ acrylic Fluent Design của Windows 11",
		source: micaThemeScss,
		kind: "scss" as const,
	},
	"liquid-glass": {
		id: "liquid-glass",
		name: "iOS Liquid Glass",
		description: "Kính lỏng trong suốt phủ mờ phản xạ ánh sáng phong cách iOS",
		source: liquidGlassThemeScss,
		kind: "scss" as const,
	},
} as const satisfies Record<string, BundledTheme>;

export function listThemes(): ThemeListItem[] {
	return [
		...Object.values(BUNDLED_THEMES).map((theme) => ({
			id: theme.id,
			name: theme.name,
			description: theme.description,
			kind: "builtin" as const,
		})),
		{ id: "custom", name: "Custom", description: "Tự viết hoặc nạp file SCSS/CSS tùy chỉnh", kind: "custom" },
	];
}

export function resolveActiveSource(config: ThemesConfig): ResolvedThemeSource | null {
	if (!config.enabled) return null;

	if (config.selected === "custom") {
		if (!config.customFile) return null;
		return { type: "file", id: "custom", value: config.customFile };
	}

	const bundled = BUNDLED_THEMES[config.selected as keyof typeof BUNDLED_THEMES];
	if (!bundled) return null;
	return { type: "string", id: bundled.id, value: bundled.source };
}

export { defaultThemeScss };
