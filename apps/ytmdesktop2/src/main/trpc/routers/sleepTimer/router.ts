import { provider } from "@main/trpc/provider";
import { publicProcedure, router } from "@shared/trpc/trpc";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import type SleepTimerProvider from "./service";
import type { SleepTimerState } from "./service";

const sleepTimerModeEnum = z.enum(["pause", "quit", "lock", "sleep", "shutdown"]);

const setTimerInput = z.object({
	durationMinutes: z.number().positive().max(720).optional(),
	trackEnd: z.boolean().optional(),
	mode: sleepTimerModeEnum.optional(),
});

export const sleepTimerRouter = router({
	state: publicProcedure.query(({ ctx }) => {
		const sleepTimer = provider(ctx, "sleepTimer" as any) as SleepTimerProvider;
		return sleepTimer.getState();
	}),
	set: publicProcedure.input(setTimerInput).mutation(({ ctx, input }) => {
		const sleepTimer = provider(ctx, "sleepTimer" as any) as SleepTimerProvider;
		return sleepTimer.setTimer(input);
	}),
	setMode: publicProcedure.input(sleepTimerModeEnum).mutation(({ ctx, input }) => {
		const sleepTimer = provider(ctx, "sleepTimer" as any) as SleepTimerProvider;
		return sleepTimer.setMode(input);
	}),
	cancel: publicProcedure.mutation(({ ctx }) => {
		const sleepTimer = provider(ctx, "sleepTimer" as any) as SleepTimerProvider;
		return sleepTimer.cancelTimer();
	}),
	openDialog: publicProcedure.mutation(({ ctx }) => {
		const sleepTimer = provider(ctx, "sleepTimer" as any) as SleepTimerProvider;
		return sleepTimer.openDialog();
	}),
	closeDialog: publicProcedure.mutation(({ ctx }) => {
		const sleepTimer = provider(ctx, "sleepTimer" as any) as SleepTimerProvider;
		return sleepTimer.closeDialog();
	}),
	onStateChange: publicProcedure.subscription(({ ctx }) => {
		const sleepTimer = provider(ctx, "sleepTimer" as any) as SleepTimerProvider;
		return observable<SleepTimerState>((emit) => {
			emit.next(sleepTimer.getState());
			const unsubscribe = sleepTimer.onStateChange((state) => emit.next(state));
			return () => unsubscribe();
		});
	}),
});
