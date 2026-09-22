export type Locale = "en" | "th";

export const defaultLocale: Locale = "th";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "th";
}

export function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const preferredLanguages = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [languageTag, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q=")
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;

      return {
        index,
        language: languageTag.toLowerCase().split("-")[0],
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
      };
    })
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const preference of preferredLanguages) {
    if (preference.quality > 0 && isLocale(preference.language)) {
      return preference.language;
    }
  }

  return defaultLocale;
}
