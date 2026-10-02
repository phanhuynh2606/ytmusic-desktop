import { createFileRoute } from "@tanstack/react-router";
import { SettingsCheckbox } from "@/components/settings-checkbox";
import { SettingsSelect } from "@/components/settings-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useSettingsState } from "@/hooks/use-settings";
import { useTranslation } from "@/hooks/use-translation";

export const Route = createFileRoute("/_settings/")({
	component: GenericSettingsPage,
});

function GenericSettingsPage() {
	const { t } = useTranslation();
	const [getStartedEnabled, setGetStartedEnabled, { isPending: getStartedPending }] = useSettingsState("app.getstarted", false);
	const [appAutostartEnabled, , { isPending: autostartPending }] = useSettingsState("app.autostart", false);

	return (
		<>
			{/* Language Selection Card */}
			<Card>
				<CardHeader>
					<CardTitle>{t.settings.languageTitle}</CardTitle>
					<CardDescription>{t.settings.languageDescription}</CardDescription>
				</CardHeader>
				<CardContent>
					<SettingsSelect
						configKey="app.language"
						defaultValue="vi"
						label={t.settings.languageLabel}
						options={[
							{ value: "vi", label: t.settings.languageVi },
							{ value: "en", label: t.settings.languageEn },
						]}
					/>
				</CardContent>
			</Card>

			{getStartedEnabled && (
				<Card>
					<CardHeader>
						<CardTitle>{t.settings.getStartedTitle}</CardTitle>
						<CardDescription>{t.settings.getStartedDesc}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-between gap-2">
						<a href="https://youtube-music.app/" target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">
							{t.settings.learnMore}
						</a>
						<Button variant="ghost" size="sm" disabled={getStartedPending} onClick={() => setGetStartedEnabled(false)}>
							{t.settings.dontShowAgain}
						</Button>
					</CardFooter>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>{t.settings.appTitle}</CardTitle>
					<CardDescription>{t.settings.appDesc}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsCheckbox configKey="app.autostart" description={appAutostartEnabled ? t.settings.enableAutostartDesc : undefined}>
							{t.settings.enableAutostart}
						</SettingsCheckbox>
						{appAutostartEnabled && !autostartPending && (
							<SettingsCheckbox configKey="app.autostartMinimized">
								{t.settings.startMinimized}
							</SettingsCheckbox>
						)}
						<SettingsCheckbox configKey="app.minimizeTrayOverride" description={t.settings.minimizeToTrayDesc}>
							{t.settings.minimizeToTray}
						</SettingsCheckbox>
						<SettingsCheckbox configKey="app.disableHardwareAccel" description={t.settings.disableHwAccelDesc}>
							{t.settings.disableHwAccel}
						</SettingsCheckbox>
					</FieldGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t.settings.updaterTitle}</CardTitle>
					<CardDescription>{t.settings.updaterDesc}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsCheckbox configKey="app.autoupdate">
							{t.settings.enableAutoupdate}
						</SettingsCheckbox>
					</FieldGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t.settings.sentryTitle}</CardTitle>
					<CardDescription>{t.settings.sentryDesc}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsCheckbox
							configKey="app.enableStatisticsAndErrorTracing"
							description={t.settings.allowErrorReportingDesc}
						>
							{t.settings.allowErrorReporting}
						</SettingsCheckbox>
					</FieldGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						{t.settings.devTitle}
						<Badge variant="destructive">{t.settings.devCaution}</Badge>
					</CardTitle>
					<CardDescription>{t.settings.devDesc}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<SettingsCheckbox configKey="app.enableDev" description={t.settings.enableDevDesc}>
							{t.settings.enableDev}
						</SettingsCheckbox>
					</FieldGroup>
				</CardContent>
			</Card>
		</>
	);
}
