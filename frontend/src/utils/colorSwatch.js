const DEFAULT_SWATCH_COLOR = "#808080";

const COLOR_NAME_ALIASES = {
  marron: "maroon",
  maron: "maroon",
  meroon: "maroon",
  "rose-gold": "#b76e79",
  rosegold: "#b76e79",
  "light-gold": "#d4af37",
  lightgold: "#d4af37",
  "dark-brown": "#654321",
  darkbrown: "#654321",
  "light-brown": "#a67b5b",
  lightbrown: "#a67b5b",
  "light-beige": "#f5f5dc",
  lightbeige: "#f5f5dc",
  "off-white": "#f8f5e6",
  offwhite: "#f8f5e6",
  camel: "#c19a6b",
  nude: "#e3bc9a",
  burgundy: "#800020",
  wine: "#722f37",
};

const BASIC_COLOR_WORDS = new Set([
  "black",
  "white",
  "gray",
  "grey",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "pink",
  "purple",
  "brown",
  "beige",
  "maroon",
  "navy",
  "olive",
  "teal",
  "gold",
  "silver",
  "cream",
  "ivory",
  "tan",
  "khaki",
]);

const normalizeColorName = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\s+/g, "-");
};

const isCssColorFunctionOrHex = (value) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ||
    /^rgba?\(/i.test(trimmed) ||
    /^hsla?\(/i.test(trimmed)
  );
};

export const resolveSwatchColor = ({
  colorCode,
  hexColor,
  value,
  fallback = DEFAULT_SWATCH_COLOR,
} = {}) => {
  const directColor =
    (typeof colorCode === "string" && colorCode.trim()) ||
    (typeof hexColor === "string" && hexColor.trim()) ||
    "";

  if (directColor && directColor.toLowerCase() !== DEFAULT_SWATCH_COLOR) {
    return directColor;
  }

  if (isCssColorFunctionOrHex(value)) {
    return value.trim();
  }

  const normalizedName = normalizeColorName(value);
  if (normalizedName) {
    if (COLOR_NAME_ALIASES[normalizedName]) {
      return COLOR_NAME_ALIASES[normalizedName];
    }

    if (BASIC_COLOR_WORDS.has(normalizedName)) {
      return normalizedName === "grey" ? "gray" : normalizedName;
    }

    const lastColorToken = normalizedName
      .split(/[-_/]/)
      .reverse()
      .find((token) => BASIC_COLOR_WORDS.has(token));
    if (lastColorToken) {
      return lastColorToken === "grey" ? "gray" : lastColorToken;
    }
  }

  if (directColor) return directColor;
  return fallback;
};

