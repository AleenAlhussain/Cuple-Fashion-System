export const fallbackLng = "ar";
export const languages = [fallbackLng, "en", "fr", "es"];
export const defaultNS = "translation";

export const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export function isRtlLanguage(lng) {
  return RTL_LANGUAGES.has(lng);
}

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    // debug: true,
    supportedLngs: languages,
    // preload: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}
