import type { SleepTimerState } from "@main/trpc/routers/sleepTimer/service";
import { trpc } from "@/lib/trpc";

export function formatSleepTimerRemaining(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) {
		return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	}
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function useSleepTimer() {
	const utils = trpc.useUtils();
	const { data } = trpc.sleepTimer.state.useQuery();

	trpc.sleepTimer.onStateChange.useSubscription(undefined, {
		onData: (next) => {
			if (!next) return;
			utils.sleepTimer.state.setData(undefined, next as SleepTimerState);
		},
	});

	return (data as SleepTimerState | null | undefined) ?? null;
}
