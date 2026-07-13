"use client";

import { useEffect } from 'react';

/**
 * GlobalStyleFix - Injects CSS to fix white text issues across the admin panel.
 * This component uses JavaScript to inject styles with highest priority,
 * ensuring text is always visible regardless of other CSS rules.
 *
 * This targets Reactstrap/Bootstrap components used in this admin panel.
 */
const GlobalStyleFix = () => {
  useEffect(() => {
    const styleId = 'global-dark-text-fix';

    // Remove if exists (prevent duplicates)
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element with highest priority fixes
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* =============================================
         GLOBAL FIX: Force dark text in light mode
         Injected via JavaScript for highest priority
         ============================================= */

      /* Only apply in light mode */
      body:not(.dark-only) {
        /* Custom Select Box Dropdowns */
        .custom-select-box .box-content,
        .custom-select-box .box-content ul li,
        .custom-select-box .box-content ul li p,
        .custom-select-box .box-content ul li a,
        .custom-select-box .box-content .form-control {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Bootstrap Tagsinput (multi-select display) */
        .bootstrap-tagsinput {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        .bootstrap-tagsinput > span:not(.tag) {
          color: #6c757d !important;
          -webkit-text-fill-color: #6c757d !important;
        }

        .bootstrap-tagsinput .tag {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        .bootstrap-tagsinput .tag a {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        /* intl-tel-input (phone/country dropdowns) */
        .intl-tel-input li,
        .intl-tel-input li p,
        .intl-tel-input li span,
        .intl-tel-input .dial-code {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Form Controls */
        .form-control,
        .form-select,
        input[type="text"],
        input[type="number"],
        input[type="email"],
        input[type="password"],
        input[type="search"],
        input[type="tel"],
        input[type="url"],
        input[type="date"],
        textarea,
        select {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Select Options */
        select option {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
          background-color: #ffffff !important;
        }

        /* Reactstrap Dropdown */
        .dropdown-menu,
        .dropdown-menu .dropdown-item,
        .dropdown-menu .dropdown-header,
        .dropdown-menu a,
        .dropdown-menu span,
        .dropdown-menu div {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Quick Dropdown Box */
        .quick-dropdown-box .dropdown-menu .dropdown-title,
        .quick-dropdown-box .dropdown-menu .dropdown-title h4,
        .quick-dropdown-box .dropdown-menu .dropdown-list a,
        .quick-dropdown-box .dropdown-menu .dropdown-list a span {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Labels */
        label,
        .form-label,
        .col-form-label,
        .form-check-label {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Input Group */
        .input-group-text {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Tables */
        .table,
        .table td,
        .table th,
        .table tbody td,
        .table thead th {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Cards */
        .card-title,
        .card-subtitle,
        .card-text,
        .card-header h1,
        .card-header h2,
        .card-header h3,
        .card-header h4,
        .card-header h5,
        .card-header h6 {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Modals */
        .modal-body,
        .modal-header,
        .modal-footer,
        .modal-title {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* List Group */
        .list-group-item {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Alerts */
        .alert.alert-light,
        .alert.alert-secondary {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Badges with light background */
        .badge.bg-light,
        .badge.badge-light,
        .badge.badge-light-secondary {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Portal-rendered dropdowns (z-index: 99999) */
        & > div[style*="z-index: 99999"],
        & > div[style*="z-index:99999"] {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        & > div[style*="z-index: 99999"] *,
        & > div[style*="z-index:99999"] * {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Checkbox inside dropdowns */
        .form-check .form-check-label {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Country list */
        .country-list li h5 {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
        }

        /* Placeholder text */
        ::placeholder {
          color: #6c757d !important;
          -webkit-text-fill-color: #6c757d !important;
          opacity: 1 !important;
        }

        ::-webkit-input-placeholder {
          color: #6c757d !important;
          -webkit-text-fill-color: #6c757d !important;
        }

        ::-moz-placeholder {
          color: #6c757d !important;
          -webkit-text-fill-color: #6c757d !important;
        }
      }

      /* =============================================
         Dark mode styles (body.dark-only)
         ============================================= */
      body.dark-only {
        .custom-select-box .box-content,
        .custom-select-box .box-content ul li,
        .custom-select-box .box-content ul li p {
          color: #dddddd !important;
          -webkit-text-fill-color: #dddddd !important;
        }

        .bootstrap-tagsinput > span:not(.tag) {
          color: rgba(255, 255, 255, 0.5) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.5) !important;
        }

        .form-control,
        .form-select,
        select {
          color: rgba(255, 255, 255, 0.8) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.8) !important;
        }

        label,
        .form-label,
        .col-form-label {
          color: rgba(255, 255, 255, 0.6) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.6) !important;
        }

        .dropdown-menu .dropdown-item {
          color: rgba(255, 255, 255, 0.8) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.8) !important;
        }
      }
    `;

    // Append to head
    document.head.appendChild(style);

    // Cleanup on unmount
    return () => {
      const el = document.getElementById(styleId);
      if (el) {
        el.remove();
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default GlobalStyleFix;
