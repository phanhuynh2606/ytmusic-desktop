import {
	DEFAULT_EQUALIZER_CONFIG,
	EQ_FREQUENCIES,
	type EqualizerConfig,
} from "./constants";

class EqualizerEngine {
	private audioCtx: AudioContext | null = null;
	private sourceNode: MediaElementAudioSourceNode | null = null;
	private filters: BiquadFilterNode[] = [];
	private bassBoostFilter: BiquadFilterNode | null = null;
	private preAmpNode: GainNode | null = null;
	private currentVideo: HTMLVideoElement | null = null;
	private lastConfig: EqualizerConfig = { ...DEFAULT_EQUALIZER_CONFIG };

	init(videoElement?: HTMLVideoElement | null): boolean {
		const video = videoElement ?? document.querySelector<HTMLVideoElement>("video");
		if (!video) return false;

		// Tránh khởi tạo lại trên cùng một video element đã kết nối
		if (this.currentVideo === video && this.sourceNode) {
			return true;
		}

		try {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			if (!AudioContextClass) return false;

			if (!this.audioCtx) {
				this.audioCtx = new AudioContextClass();
			}

			// Resume AudioContext nếu bị suspend do chính sách của Chrome
			const ensureRunning = () => {
				if (this.audioCtx && this.audioCtx.state === "suspended") {
					void this.audioCtx.resume();
				}
			};
			video.addEventListener("play", ensureRunning);
			video.addEventListener("playing", ensureRunning);
			ensureRunning();

			// Chỉ gọi createMediaElementSource 1 lần duy nhất cho mỗi phần tử video
			const existingSource = (video as any).__ytmdAudioSource as MediaElementAudioSourceNode | undefined;
			if (existingSource) {
				this.sourceNode = existingSource;
			} else {
				this.sourceNode = this.audioCtx.createMediaElementSource(video);
				(video as any).__ytmdAudioSource = this.sourceNode;
			}

			this.currentVideo = video;

			// Tạo Pre-Amp Node
			this.preAmpNode = this.audioCtx.createGain();

			// Tạo Bass Boost LowShelf Filter tại 80Hz
			this.bassBoostFilter = this.audioCtx.createBiquadFilter();
			this.bassBoostFilter.type = "lowshelf";
			this.bassBoostFilter.frequency.value = 80;
			this.bassBoostFilter.gain.value = 0;

			// Tạo chuỗi 10 BiquadFilterNode
			this.filters = EQ_FREQUENCIES.map((freq, index) => {
				const filter = this.audioCtx!.createBiquadFilter();
				filter.frequency.value = freq;
				if (index === 0) {
					filter.type = "lowshelf";
				} else if (index === EQ_FREQUENCIES.length - 1) {
					filter.type = "highshelf";
				} else {
					filter.type = "peaking";
					filter.Q.value = 1.4;
				}
				filter.gain.value = 0;
				return filter;
			});

			// Nối chuỗi âm thanh:
			// Source -> PreAmp -> BassBoost -> Filter[0] -> ... -> Filter[9] -> Destination
			let currentConnection: AudioNode = this.sourceNode;

			currentConnection.connect(this.preAmpNode);
			currentConnection = this.preAmpNode;

			currentConnection.connect(this.bassBoostFilter);
			currentConnection = this.bassBoostFilter;

			for (const filter of this.filters) {
				currentConnection.connect(filter);
				currentConnection = filter;
			}

			currentConnection.connect(this.audioCtx.destination);

			// Áp dụng cấu hình gần nhất
			this.applyConfig(this.lastConfig);
			return true;
		} catch (error) {
			console.error("[EqualizerEngine] Failed to initialize Web Audio graph:", error);
			return false;
		}
	}

	applyConfig(config: EqualizerConfig): void {
		this.lastConfig = { ...config };
		if (!this.audioCtx) return;

		const currentTime = this.audioCtx.currentTime;
		const smoothTime = 0.04; // 40ms chuyển mượt chống tiếng lộp độp (pop/click)

		if (!config.enabled) {
			// Bypass mượt mà bằng cách đưa toàn bộ gain về 0 dB
			if (this.preAmpNode) {
				this.preAmpNode.gain.setTargetAtTime(1.0, currentTime, smoothTime);
			}
			if (this.bassBoostFilter) {
				this.bassBoostFilter.gain.setTargetAtTime(0, currentTime, smoothTime);
			}
			for (const filter of this.filters) {
				filter.gain.setTargetAtTime(0, currentTime, smoothTime);
			}
			return;
		}

		// Áp dụng Pre-Amp (dB sang linear gain)
		if (this.preAmpNode) {
			const preAmpLinear = 10 ** ((config.preAmp ?? 0) / 20);
			this.preAmpNode.gain.setTargetAtTime(preAmpLinear, currentTime, smoothTime);
		}

		// Áp dụng Bass Boost (0 - 100% sang 0 - 15dB)
		if (this.bassBoostFilter) {
			const boostDb = ((config.bassBoost ?? 0) / 100) * 15;
			this.bassBoostFilter.gain.setTargetAtTime(boostDb, currentTime, smoothTime);
		}

		// Áp dụng 10 dải tần
		for (let i = 0; i < this.filters.length; i++) {
			const gainVal = config.gains?.[i] ?? 0;
			this.filters[i].gain.setTargetAtTime(gainVal, currentTime, smoothTime);
		}
	}

	destroy(): void {
		if (this.audioCtx && this.audioCtx.state !== "closed") {
			void this.audioCtx.close();
		}
		this.audioCtx = null;
		this.sourceNode = null;
		this.filters = [];
		this.bassBoostFilter = null;
		this.preAmpNode = null;
		this.currentVideo = null;
	}
}

export const equalizerEngine = new EqualizerEngine();
