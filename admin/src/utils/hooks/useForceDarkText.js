import { useEffect } from 'react';

/**
 * Hook to force dark text colors in light mode.
 * This is a fallback in case SCSS styles are not applied correctly.
 *
 * Usage: Call useForceDarkText() at the top level of any component
 * that has white text issues.
 */
const useForceDarkText = () => {
  useEffect(() => {
    // Only apply in light mode (when body doesn't have dark-only class)
    if (document.body.classList.contains('dark-only')) {
      return;
    }

    const styleId = 'force-dark-text-styles';

    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* Force dark text in light mode - JavaScript injection */
      body:not(.dark-only) .custom-select-box .box-content,
      body:not(.dark-only) .custom-select-box .box-content ul li,
      body:not(.dark-only) .custom-select-box .box-content ul li p,
      body:not(.dark-only) .intl-tel-input li,
      body:not(.dark-only) .intl-tel-input li p,
      body:not(.dark-only) .dropdown-menu .dropdown-item,
      body:not(.dark-only) .form-control,
      body:not(.dark-only) .form-select,
      body:not(.dark-only) select,
      body:not(.dark-only) select option,
      body:not(.dark-only) .form-check-label,
      body:not(.dark-only) label {
        color: #333 !important;
      }

      body:not(.dark-only) .custom-select-box .box-content {
        background-color: #fff !important;
      }

      body:not(.dark-only) .bootstrap-tagsinput span:not(.tag) {
        color: #6c757d !important;
      }

      body:not(.dark-only) .bootstrap-tagsinput .tag,
      body:not(.dark-only) .bootstrap-tagsinput .tag a {
        color: #fff !important;
      }

      /* Portal-rendered dropdowns */
      body:not(.dark-only) > div[style*="z-index: 99999"],
      body:not(.dark-only) > div[style*="z-index:99999"] {
        color: #333 !important;
      }

      body:not(.dark-only) > div[style*="z-index: 99999"] *,
      body:not(.dark-only) > div[style*="z-index:99999"] * {
        color: #333 !important;
      }

      body:not(.dark-only) > div[style*="z-index: 99999"] .form-check-label,
      body:not(.dark-only) > div[style*="z-index:99999"] .form-check-label {
        color: #333 !important;
      }
    `;

    document.head.appendChild(style);

    // Cleanup on unmount (though we want this to persist)
    return () => {
      // Don't remove - we want this to stay
      // const existingStyle = document.getElementById(styleId);
      // if (existingStyle) {
      //   document.head.removeChild(existingStyle);
      // }
    };
  }, []);
};

export default useForceDarkText;
