import { useMemo } from 'react';

const THEME_COLORS_MAP = {
  fashion_one: { primary: "#D49D67" },
  tools: { primary: "#D49D67" },
  game: { primary: "#D49D67" },
  left_sidebar: { primary: "#D49D67" },
  video: { primary: "#D49D67" },
  full_page: { primary: "#D49D67" },
  bicycle: { primary: "#ff4c3b" },
  christmas: { primary: "#ff4c3b" },
  fashion_two: { primary: "#fe816d" },
  fashion_three: { primary: "#96796d" },
  fashion_four: { primary: "#000000" },
  fashion_five: { primary: "#C0AA73" },
  fashion_six: { primary: "#90453e" },
  fashion_seven: { primary: "#3fd09e" },
  furniture_one: { primary: "#d4b196" },
  furniture_two: { primary: "#d4b196" },
  furniture_dark: { primary: "#d4b196" },
  jewellery_two: { primary: "#d4b196" },
  jewellery_three: { primary: "#d4b196" },
  electronics_one: { primary: "#1a7ef2" },
  electronics_two: { primary: "#6d7e87" },
  electronics_three: { primary: "#2874f0" },
  marketplace_one: { primary: "#3e5067" },
  marketplace_two: { primary: "#f39910", secondary: "#394868" },
  marketplace_four: { primary: "#f39910", secondary: "#394868" },
  marketplace_three: { primary: "#387ef0" },
  vegetables_one: { primary: "#ff5141" },
  vegetables_two: { primary: "#81ba00" },
  vegetables_three: { primary: "#81ba00" },
  nursery: { primary: "#81ba00" },
  jewellery_one: { primary: "#5fcbc4" },
  vegetables_four: { primary: "#206664", secondary: "#ee7a63" },
  bag: { primary: "#f0b54d" },
  beauty: { primary: "#f0b54d" },
  watch: { primary: "#e4604a" },
  medical: { primary: "#38c6bb" },
  perfume: { primary: "#6d6659" },
  yoga: { primary: "#f0583d" },
  marijuana: { primary: "#5d7227", secondary: "#203f15" },
  shoes: { primary: "#d57151" },
  kids: { primary: "#fa869b" },
  flower: { primary: "#fa869b" },
  books: { primary: "#5ecee4" },
  goggles: { primary: "#dc457e" },
  video_slider: { primary: "#e38888" },
  gym: { primary: "#01effc", secondary: "#485ff2" },
  digital_download: { primary: "#234ca1" },
  pets: { primary: "#479FB3" },
  parallax: { primary: "#866e6c" },
  surfboard: { primary: "#2E94D2" },
  single_product: { primary: "#854D9C", secondary: "#d04ed6" },
  gradient: { primary: "#dd5e89", secondary: "#f7bb97" },
};

export const useThemeColors = (theme, themeOption) => {
  return useMemo(() => {
    if (theme && THEME_COLORS_MAP[theme]) {
      const colors = THEME_COLORS_MAP[theme];
      return {
        primary: colors.primary || "",
        secondary: colors.secondary || "",
      };
    }

    return {
      primary: themeOption?.general?.primary_color || "",
      secondary: themeOption?.general?.secondary_color || "",
    };
  }, [theme, themeOption?.general?.primary_color, themeOption?.general?.secondary_color]);
};

