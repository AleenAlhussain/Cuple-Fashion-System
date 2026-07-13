import ThemeOptionContext from "@/context/themeOptionsContext";
import { useSearchParams } from "next/navigation";
import React, { useContext, useMemo } from "react";
import HeaderEight from "./headerEight";
import HeaderFive from "./headerFive";
import HeaderFour from "./headerFour";
import HeaderOne from "./headerOne";
import HeaderSeven from "./headerSeven";
import HeaderSix from "./headerSix";
import HeaderThree from "./headerThree";
import HeaderTwo from "./headerTwo";

// Static mapping object - O(1) lookup, better than multiple if conditions
const THEME_TO_HEADER_MAP = {
  // Header One themes
  fashion_one: "header_one",
  gym: "header_one",
  fashion_seven: "header_one",
  fashion_two: "header_one",
  surfboard: "header_one",
  flower: "header_one",
  yoga: "header_one",
  fashion_three: "header_one",
  fashion_four: "header_one",
  electronics_two: "header_one",
  jewellery_three: "header_one",
  bag: "header_one",
  watch: "header_one",
  kids: "header_one",
  beauty: "header_one",
  goggles: "header_one",
  video_slider: "header_one",
  gradient: "header_one",
  left_sidebar: "header_one",
  parallax: "header_one",
  vegetables_three: "header_one",
  fashion_six: "header_one",
  jewellery_two: "header_one",
  medical: "header_one",
  perfume: "header_one",
  electronics_one: "header_one",
  marketplace_one: "header_one",
  tools: "header_one",
  game: "header_one",
  nursery: "header_one",
  
  // Header Two
  vegetables_four: "header_two",
  
  // Header Three
  fashion_five: "header_three",
  
  // Header Four
  furniture_dark: "header_four",
  jewellery_one: "header_four",
  christmas: "header_four",
  digital_download: "header_four",
  single_product: "header_four",
  
  // Header Five
  furniture_one: "header_five",
  shoes: "header_five",
  vegetables_one: "header_five",
  marijuana: "header_five",
  
  // Header Six
  marketplace_four: "header_six",
  vegetables_two: "header_six",
  furniture_two: "header_six",
  electronics_three: "header_six",
  books: "header_six",
  pets: "header_six",
  marketplace_two: "header_six",
  marketplace_three: "header_six",
  
  // Header Seven
  bicycle: "header_seven",
  
  // Header Eight
  video: "header_eight",
  full_page: "header_eight",
};

// Component mapping object - no switch statement needed
const HEADER_COMPONENTS = {
  header_one: HeaderOne,
  header_two: HeaderTwo,
  header_three: HeaderThree,
  header_four: HeaderFour,
  header_five: HeaderFive,
  header_six: HeaderSix,
  header_seven: HeaderSeven,
  header_eight: HeaderEight,
};

const Headers = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const searchParams = useSearchParams();
  const themeParam = searchParams.get("theme");

  // Single useMemo for both style calculation and component selection
  const HeaderComponent = useMemo(() => {
    // Priority 1: Theme parameter (O(1) lookup)
    if (themeParam && THEME_TO_HEADER_MAP[themeParam]) {
      return HEADER_COMPONENTS[THEME_TO_HEADER_MAP[themeParam]];
    }
    
    // Priority 2: ThemeOption setting
    const defaultStyle = themeOption?.header?.header_options;
    if (defaultStyle && HEADER_COMPONENTS[defaultStyle]) {
      return HEADER_COMPONENTS[defaultStyle];
    }
    
    // Fallback
    return HeaderOne;
  }, [themeParam, themeOption?.header?.header_options]);

  return <HeaderComponent />;
};

export default Headers;
