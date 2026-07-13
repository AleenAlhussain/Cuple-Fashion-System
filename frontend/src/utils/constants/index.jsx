export const Href = "#";
export const ImagePath = "/assets/images";
export const audioFile = '/assets/audio/multi-pop.mp3';
export const storageURL = process.env.storageURL || "https://api.cuple.shop";
export const IMAGE_URL = process.env.IMAGE_URL || "https://api.cuple.shop/";
export const WishlistAPI = "/wishlist";
export const SyncCart = "/cart/sync";
export const ForgotPasswordAPI = "/forgot-password";
export const LoginPhnAPI = "/login/whatsapp/send-otp";
export const VerifyTokenAPI = "/login/whatsapp/verify-otp";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value) || /^\/\//.test(value);

const trimValue = (value) => (typeof value === "string" ? value.trim() : value || "");

export const resolveImageUrl = (value) => {
  const src = trimValue(value);
  if (!src) return "";
  if (isAbsoluteUrl(src)) return src;
  if (src.startsWith("/assets")) return src;
  if (src.startsWith("assets")) return `/${src}`;
  return `${storageURL}${src.startsWith("/") ? "" : "/"}${src}`;
};

// Token keys for localStorage
export const LocalStorageEnum = {
  TOKEN_KEY: 'uat',
  USER_KEY: 'user',
};

// Return Arabic field value when language is 'ar' and Arabic value exists, otherwise English
export const localizedValue = (item, field, lang) => {
  if (lang === 'ar' && item?.[`${field}_ar`]) {
    return item[`${field}_ar`];
  }
  return item?.[field] || '';
};

// Fix common character encoding issues (UTF-8 / Windows-1252 mismatches)
export const cleanText = (text) => {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/Â'/g, "'")      // Fix curly apostrophe
    .replace(/Â"/g, '"')      // Fix left double quote
    .replace(/Â"/g, '"')      // Fix right double quote
    .replace(/Â–/g, '–')      // Fix en dash
    .replace(/Â—/g, '—')      // Fix em dash
    .replace(/Â®/g, '®')      // Fix registered trademark
    .replace(/Â©/g, '©')      // Fix copyright
    .replace(/Â™/g, '™')      // Fix trademark
    .replace(/Ã©/g, 'é')      // Fix accented e
    .replace(/Ã¨/g, 'è')      // Fix accented e
    .replace(/Ã /g, 'à')      // Fix accented a
    .replace(/Ã¢/g, 'â')      // Fix accented a
    .replace(/Ã®/g, 'î')      // Fix accented i
    .replace(/Ã´/g, 'ô')      // Fix accented o
    .replace(/Ã»/g, 'û')      // Fix accented u
    .replace(/Ã§/g, 'ç')      // Fix cedilla
    .replace(/â€™/g, "'")     // Another apostrophe encoding
    .replace(/â€œ/g, '"')     // Another left quote
    .replace(/â€/g, '"')      // Another right quote
    .replace(/â€"/g, '–')     // Another en dash
    .replace(/â€"/g, '—')     // Another em dash
    .replace(/Â /g, ' ')      // Fix non-breaking space
    .trim();
};
