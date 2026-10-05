import { fromIpcEvent } from "@main/trpc/fromIpcEvent";
import { provider } from "@main/trpc/provider";
import { publicProcedure, router } from "@shared/trpc/trpc";
import { z } from "zod";
import type { FloatingLyricsState } from "./service";
import type FloatingLyricsProvider from "./service";

export const floatingLyricsRouter = router({
	state: publicProcedure.query(({ ctx }) => {
		const fl = provider(ctx, "floatingLyrics" as any) as FloatingLyricsProvider;
		return fl.getState();
	}),
	show: publicProcedure.mutation(({ ctx }) => {
		const fl = provider(ctx, "floatingLyrics" as any) as FloatingLyricsProvider;
		return fl.show();
	}),
	hide: publicProcedure.mutation(({ ctx }) => {
		const fl = provider(ctx, "floatingLyrics" as any) as FloatingLyricsProvider;
		return fl.hide();
	}),
	toggle: publicProcedure.mutation(({ ctx }) => {
		const fl = provider(ctx, "floatingLyrics" as any) as FloatingLyricsProvider;
		return fl.toggle();
	}),
	setLocked: publicProcedure
		.input(z.object({ locked: z.boolean() }))
		.mutation(({ ctx, input }) => {
			const fl = provider(ctx, "floatingLyrics" as any) as FloatingLyricsProvider;
			fl.setLocked(input.locked);
		}),
	setIgnoreMouseEvents: publicProcedure
		.input(z.object({ ignore: z.boolean() }))
		.mutation(({ ctx, input }) => {
			const fl = provider(ctx, "floatingLyrics" as any) as FloatingLyricsProvider;
			fl.setIgnoreMouseEvents(input.ignore);
		}),
	updateConfig: publicProcedure
		.input(
			z.object({
				fontSize: z.number().min(12).max(40).optional(),
				textColor: z.enum(["accent", "white", "gold", "cyan", "green"]).optional(),
				backgroundOpacity: z.number().min(0).max(100).optional(),
				align: z.enum(["center", "left"]).optional(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const fl = provider(ctx, "floatingLyrics" as any) as FloatingLyricsProvider;
			fl.updateConfig(input);
		}),
	onState: publicProcedure.subscription(() => fromIpcEvent<FloatingLyricsState>("floatingLyrics.state")),
});
