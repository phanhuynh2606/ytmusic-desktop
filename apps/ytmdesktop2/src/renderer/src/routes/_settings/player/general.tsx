import { createFileRoute } from "@tanstack/react-router";
import { SettingsCheckbox } from "@/components/settings-checkbox";
import { SettingsSelect } from "@/components/settings-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useSettingsState } from "@/hooks/use-settings";
import { useTranslation } from "@/hooks/use-translation";

export const Route = createFileRoute("/_settings/player/general")({
	component: PlayerGeneralSettingsPage,
});

function PlayerGeneralSettingsPage() {
	const { t } = useTranslation();
	const p = t.settings.playerSection;
	const [resEnabled, , { isPending: resPending }] = useSettingsState("player.res.enabled", false);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>{p.title}</CardTitle>
					<CardDescription>{p.description}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsCheckbox
							configKey="player.skipDisliked"
							description={
								<span className="inline-flex items-center gap-2">
									{p.skipDislikedDesc}
									<Badge variant="outline">Experimental</Badge>
								</span>
							}
						>
							{p.skipDisliked}
						</SettingsCheckbox>
						<SettingsCheckbox
							configKey="volumeRatio.enabled"
							description={p.expVolumeDesc}
						>
							{p.expVolume}
						</SettingsCheckbox>
						<SettingsCheckbox configKey="app.enableTaskbarProgress" description={p.taskbarProgressDesc}>
							{p.taskbarProgress}
						</SettingsCheckbox>
						<SettingsCheckbox
							configKey="player.chromecastEnabled"
							description={
								<span className="inline-flex items-center gap-2">
									{p.chromecastDesc}
									<Badge variant="outline">Experimental</Badge>
								</span>
							}
						>
							{p.chromecast}
						</SettingsCheckbox>
					</FieldGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{p.sharedLinks}</CardTitle>
					<CardDescription>{p.sharedLinksDesc}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsSelect
							configKey="player.deepLinkOpen"
							defaultValue="ask"
							label={p.openLinkAction}
							description={p.openLinkDesc}
							options={[
								{
									value: "ask",
									label: p.askFirst,
									description: p.askFirstDesc,
								},
								{
									value: "play",
									label: p.playImmediate,
									description: p.playImmediateDesc,
								},
							]}
						/>
						<SettingsCheckbox
							configKey="player.replaceShareLinks"
							defaultValue={true}
							description={p.replaceShareDesc}
						>
							{p.replaceShare}
						</SettingsCheckbox>
					</FieldGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{p.video}</CardTitle>
					<CardDescription>{p.videoDesc}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsCheckbox configKey="player.res.enabled">{p.customizeVideo}</SettingsCheckbox>
						{resEnabled && !resPending && (
							<SettingsSelect
								configKey="player.res.prefer"
								label={p.preferredRes}
								options={[
									{ value: "hd2160", label: "2160P UHD / 4K" },
									{ value: "hd1440", label: "1440P QHD" },
									{ value: "hd1080", label: "1080P FHD" },
									{ value: "hd720", label: "720P HD" },
									{ value: "auto", label: "Tự động / Mặc định" },
								]}
							/>
						)}
					</FieldGroup>
				</CardContent>
			</Card>
		</>
	);
}

