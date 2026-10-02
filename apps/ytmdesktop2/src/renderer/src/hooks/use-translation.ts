import { useSettingsState } from "@/hooks/use-settings";
import { getTranslations, type SupportedLanguage, type TranslationsType } from "@translations/index";

export function useTranslation() {
	const [lang, setLang, meta] = useSettingsState<SupportedLanguage>("app.language", "vi");
	const t: TranslationsType = getTranslations(lang);

	return {
		lang,
		setLang,
		t,
		isPending: meta.isPending,
		isSaving: meta.isSaving,
	};
}
