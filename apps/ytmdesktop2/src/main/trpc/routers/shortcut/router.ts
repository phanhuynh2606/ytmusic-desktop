import { provider } from "@main/trpc/provider";
import { publicProcedure, router } from "@shared/trpc/trpc";
import { z } from "zod";
import type ShortcutService from "./service";
import type { ShortcutBindings } from "./service";

export const shortcutRouter = router({
	getBindings: publicProcedure.query(({ ctx }) => {
		const shortcut = provider(ctx, "shortcut" as any) as ShortcutService;
		return shortcut.getBindings();
	}),
	setEnabled: publicProcedure
		.input(z.object({ enabled: z.boolean() }))
		.mutation(({ ctx, input }) => {
			const shortcut = provider(ctx, "shortcut" as any) as ShortcutService;
			shortcut.setEnabled(input.enabled);
			return shortcut.getBindings();
		}),
	updateBinding: publicProcedure
		.input(
			z.object({
				action: z.enum([
					"playPause",
					"next",
					"prev",
					"volumeUp",
					"volumeDown",
					"mute",
					"like",
					"toggleFloatingLyrics",
				]),
				accelerator: z.string(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const shortcut = provider(ctx, "shortcut" as any) as ShortcutService;
			shortcut.updateBinding(input.action as keyof ShortcutBindings, input.accelerator);
			return shortcut.getBindings();
		}),
	resetDefaults: publicProcedure.mutation(({ ctx }) => {
		const shortcut = provider(ctx, "shortcut" as any) as ShortcutService;
		return shortcut.resetDefaults();
	}),
});
