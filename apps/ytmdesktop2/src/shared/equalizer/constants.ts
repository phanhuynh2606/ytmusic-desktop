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
	pop: {
		name: "Pop",
		gains: [-1, 1, 2, 3, 3, 1, -1, 1, 2, 3],
		bassBoost: 30,
	},
	rock: {
		name: "Rock",
		gains: [4, 3, 2, 0, -1, 1, 2, 3, 4, 4],
		bassBoost: 40,
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
	dance: {
		name: "Dance / Club (Sôi động)",
		gains: [5, 4, 2, 0, -1, 0, 2, 3, 4, 3],
		bassBoost: 70,
	},
	rnb: {
		name: "R&B / Soul (Trầm sâu)",
		gains: [4, 5, 3, 1, 0, 1, 2, 3, 3, 2],
		bassBoost: 65,
	},
	acoustic: {
		name: "Acoustic (Nhạc mộc)",
		gains: [3, 2, 1, 1, 2, 2, 3, 3, 2, 1],
		bassBoost: 25,
	},
	classical: {
		name: "Classical (Cổ điển)",
		gains: [3, 2, 1, 1, -1, -1, 0, 2, 3, 3],
		bassBoost: 20,
	},
	jazz: {
		name: "Jazz & Blues (Ấm áp, chi tiết)",
		gains: [3, 4, 2, 1, 2, 2, 1, 2, 3, 2],
		bassBoost: 30,
	},
	lofi: {
		name: "Lo-Fi (Vintage Vinyl / Hoài niệm)",
		gains: [2, 3, 3, 2, 1, 0, -1, -2, -3, -4],
		bassBoost: 25,
	},
	"vocal-clarity": {
		name: "Vocal Clarity (Lọc giọng / Podcast)",
		gains: [-4, -3, -1, 1, 3, 5, 4, 2, 0, -1],
		bassBoost: 0,
	},
	vocal: {
		name: "Vocal Boost (Làm rõ giọng hát)",
		gains: [-1, -2, -1, 1, 3, 4, 3, 1, 0, -1],
		bassBoost: 10,
	},
	"treble-boost": {
		name: "Treble Booster (Sáng tiếng, tí tách)",
		gains: [-2, -2, -1, 0, 1, 2, 4, 6, 7, 8],
		bassBoost: 0,
	},
	cinema: {
		name: "Cinema & MV Surround (Âm vòm)",
		gains: [6, 5, 2, 0, -1, 0, 2, 4, 5, 6],
		bassBoost: 50,
	},
};
