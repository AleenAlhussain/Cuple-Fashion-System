import { useEffect, useRef } from 'react';

export const usePageTitle = (isTabActive, themeOption, pathName, disableMetaTitle) => {
  const timerRef = useRef(null);

  useEffect(() => {
    const message = themeOption?.general?.taglines;
    const isDisabled = disableMetaTitle.includes(pathName.split("/")[1]?.toLowerCase());

    if (isDisabled) return;

    const updateTitle = (index) => {
      if (!message || !Array.isArray(message) || message.length === 0) return;
      
      document.title = message[index];
      timerRef.current = setTimeout(() => {
        const nextIndex = (index + 1) % message.length;
        updateTitle(nextIndex);
      }, 500);
    };

    if (!isTabActive && themeOption?.general?.exit_tagline_enable && message?.length > 0) {
      updateTitle(0);
    } else {
      const value =
        themeOption?.general?.site_title && themeOption?.general?.site_tagline
          ? `${themeOption?.general?.site_title} | ${themeOption?.general?.site_tagline}`
          : "Cuple Fashion – Women’s Shoes, Bags & Accessories";
      document.title = value;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTabActive, themeOption, pathName, disableMetaTitle]);
};

