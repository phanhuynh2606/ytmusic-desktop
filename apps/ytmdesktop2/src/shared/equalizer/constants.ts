export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export interface EqualizerConfig {
	enabled: boolean;
	preset: string;
	gains: number[];
	bassBoost: number;
	preAmp: number;
}

export const DEFAULT_EQUALIZER_CONFIG: EqualizerConfig = {
	enabled: false,
	preset: "flat",
	gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	bassBoost: 0,
	preAmp: 0,
};

export interface EqualizerPresetItem {
	name: string;
	gains: number[];
	bassBoost: number;
}

export const EQUALIZER_PRESETS: Record<string, EqualizerPresetItem> = {
	flat: {
		name: "Flat (Phẳng - Mặc định)",
		gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		bassBoost: 0,
	},
	"bass-boost": {
		name: "Bass Boost (Siêu trầm)",
		gains: [5, 4, 3, 2, 0, 0, 0, 1, 2, 3],
		bassBoost: 75,
	},
	vocal: {
		name: "Vocal Boost (Làm rõ giọng hát)",
		gains: [-1, -2, -1, 1, 3, 4, 3, 1, 0, -1],
		bassBoost: 10,
	},
	rock: {
		name: "Rock",
		gains: [4, 3, 2, 0, -1, 1, 2, 3, 4, 4],
		bassBoost: 40,
	},
	pop: {
		name: "Pop",
		gains: [-1, 1, 2, 3, 3, 1, -1, 1, 2, 3],
		bassBoost: 30,
	},
	classical: {
		name: "Classical (Cổ điển)",
		gains: [3, 2, 1, 1, -1, -1, 0, 2, 3, 3],
		bassBoost: 20,
	},
	acoustic: {
		name: "Acoustic (Nhạc mộc)",
		gains: [3, 2, 1, 1, 2, 2, 3, 3, 2, 1],
		bassBoost: 25,
	},
	electronic: {
		name: "Electronic (EDM / Điện tử)",
		gains: [4, 3, 1, 0, -2, 2, 1, 2, 4, 4],
		bassBoost: 60,
	},
	"hip-hop": {
		name: "Hip-Hop",
		gains: [5, 4, 2, 1, -1, -1, 1, 0, 2, 3],
		bassBoost: 80,
	},
};
