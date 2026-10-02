import { fromIpcEvent } from "@main/trpc/fromIpcEvent";
import { provider } from "@main/trpc/provider";
import { publicProcedure, router } from "@shared/trpc/trpc";
import { z } from "zod";
import type { MiniPlayerState } from "./service";

export const miniPlayerRouter = router({
	toggle: publicProcedure.mutation(({ ctx }) => provider(ctx, "miniPlayer").toggle()),
	show: publicProcedure.mutation(({ ctx }) => provider(ctx, "miniPlayer").show()),
	hide: publicProcedure.mutation(({ ctx }) => provider(ctx, "miniPlayer").hide()),
	state: publicProcedure.query(({ ctx }) => provider(ctx, "miniPlayer").getState()),
	setAlwaysOnTop: publicProcedure
		.input(z.object({ alwaysOnTop: z.boolean() }))
		.mutation(({ ctx, input }) => provider(ctx, "miniPlayer").setAlwaysOnTop(input.alwaysOnTop)),
	setOpacity: publicProcedure
		.input(z.object({ opacity: z.number().min(0.2).max(1) }))
		.mutation(({ ctx, input }) => provider(ctx, "miniPlayer").setOpacity(input.opacity)),
	onState: publicProcedure.subscription(() => fromIpcEvent<MiniPlayerState>("miniPlayer.state")),
});
