import EN_US from "./en-us.json";
import VI_VN from "./vi-vn.json";

export const translations = {
	vi: VI_VN,
	en: EN_US,
} as const;

export type SupportedLanguage = keyof typeof translations;
export type TranslationsType = typeof VI_VN;

export function getTranslations(lang: string = "vi"): TranslationsType {
	if (lang === "en") {
		return translations.en;
	}
	return translations.vi;
}

// Default fallback export
const STRINGS = VI_VN;
export default STRINGS;
