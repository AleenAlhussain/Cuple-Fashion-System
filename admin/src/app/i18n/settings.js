export const fallbackLng = "en";
export const languages = [fallbackLng, "ar", "fr", "es"];
export const defaultNS = "translation";

export const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export function isRtlLanguage(lng) {
  return RTL_LANGUAGES.has(lng);
}

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}
