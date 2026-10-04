import definePlugin from "@plugins/utils";
import adblockRenderer from "./adblock.renderer";

/** Adblock auto-skip & DOM cleanup runs in page world (world-0 host). */
export default definePlugin(
	"adblock",
	{ enabled: true, displayName: "Adblock Auto-Skip & DOM Cleaner" },
	{
		renderer: adblockRenderer,
	},
);
