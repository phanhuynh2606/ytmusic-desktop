import { provider } from "@main/trpc/provider";
import { publicProcedure, router } from "@shared/trpc/trpc";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import type AdblockProvider from "./service";
import type { AdblockState } from "./service";

const setEnabledInput = z.object({
	enabled: z.boolean(),
});

const openPopupInput = z
	.object({
		x: z.number().optional(),
		y: z.number().optional(),
	})
	.optional();

const reportDomInput = z
	.object({
		count: z.number().int().positive().max(100).optional(),
	})
	.optional();

export const adblockRouter = router({
	state: publicProcedure.query(({ ctx }) => {
		const adblock = provider(ctx, "adblock");
		return adblock.getState();
	}),
	toggle: publicProcedure.mutation(({ ctx }) => {
		const adblock = provider(ctx, "adblock");
		return adblock.toggle();
	}),
	setEnabled: publicProcedure.input(setEnabledInput).mutation(({ ctx, input }) => {
		const adblock = provider(ctx, "adblock");
		return adblock.setEnabled(input.enabled);
	}),
	resetPageCount: publicProcedure.mutation(({ ctx }) => {
		const adblock = provider(ctx, "adblock");
		adblock.resetPageCount();
		return adblock.getState();
	}),
	reportDomBlocked: publicProcedure.input(reportDomInput).mutation(({ ctx, input }) => {
		const adblock = provider(ctx, "adblock");
		return adblock.reportDomBlocked(input?.count ?? 1);
	}),
	reloadPage: publicProcedure.mutation(({ ctx }) => {
		const adblock = provider(ctx, "adblock");
		adblock.reloadPage();
	}),
	openPopup: publicProcedure.input(openPopupInput).mutation(({ ctx, input }) => {
		const adblock = provider(ctx, "adblock");
		return adblock.openPopup(input);
	}),
	closePopup: publicProcedure.mutation(({ ctx }) => {
		const adblock = provider(ctx, "adblock");
		return adblock.closePopup();
	}),
	onStateChange: publicProcedure.subscription(({ ctx }) => {
		const adblock = provider(ctx, "adblock");
		return observable<AdblockState>((emit) => {
			emit.next(adblock.getState());
			const unsubscribe = adblock.onStateChange((state) => emit.next(state));
			return () => unsubscribe();
		});
	}),
});
