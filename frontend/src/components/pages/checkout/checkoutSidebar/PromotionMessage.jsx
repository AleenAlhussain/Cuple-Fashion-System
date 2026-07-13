"use client";
import React from "react";
import { useTranslation } from "react-i18next";

/**
 * PromotionMessage - Displays promotion messages for all discount types
 *
 * Supports:
 * - Cart: "Spend 50 AED more and get 50 AED off!"
 * - BOGO: "Add 1 more item and get 1 FREE!"
 * - Bulk: "Buy 1 more and get 15% off!"
 * - Bundle: "Add 2 more items to complete your bundle!"
 */
const PromotionMessage = ({ messages = [], locale = "en" }) => {
  const { t, i18n } = useTranslation("common");

  if (!messages || messages.length === 0) {
    return null;
  }

  const currentLocale = locale || i18n.language || "en";
  const isArabic = currentLocale === "ar";

  // Get background gradient based on discount type
  const getBackgroundColor = (type) => {
    switch (type) {
      case "bogo":
      case "bxgx":
        return "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)";
      case "bulk":
        return "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)";
      case "cart":
        return "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)";
      case "bundle":
        return "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)";
      case "shipping":
        return "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)";
      default:
        return "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)";
    }
  };

  // Get border color based on discount type
  const getBorderColor = (type) => {
    switch (type) {
      case "bogo":
      case "bxgx":
        return "#4caf50";
      case "bulk":
        return "#2196f3";
      case "cart":
        return "#ff9800";
      case "bundle":
        return "#9c27b0";
      case "shipping":
        return "#e91e63";
      default:
        return "#ff9800";
    }
  };

  // Get text color based on discount type
  const getTextColor = (type) => {
    switch (type) {
      case "bogo":
      case "bxgx":
        return "#2e7d32";
      case "bulk":
        return "#1565c0";
      case "cart":
        return "#e65100";
      case "bundle":
        return "#7b1fa2";
      case "shipping":
        return "#c2185b";
      default:
        return "#e65100";
    }
  };

  // Get default icon based on discount type
  const getDefaultIcon = (type) => {
    switch (type) {
      case "bogo":
      case "bxgx":
        return "🎁";
      case "bulk":
        return "📦";
      case "cart":
        return "🛒";
      case "bundle":
        return "🎯";
      case "shipping":
        return "🚚";
      default:
        return "🎁";
    }
  };

  return (
    <div className="promotion-messages" style={{ marginTop: "15px" }}>
      {messages.map((msg, index) => (
        <div
          key={`promo-${msg.rule_id || index}`}
          className="promotion-message"
          style={{
            background: getBackgroundColor(msg.rule_type),
            border: `2px solid ${getBorderColor(msg.rule_type)}`,
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "10px",
            direction: isArabic ? "rtl" : "ltr",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            {/* Icon */}
            <div
              className="promo-icon"
              style={{
                fontSize: "24px",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {msg.icon || getDefaultIcon(msg.rule_type)}
            </div>

            {/* Content */}
            <div className="promo-content" style={{ flex: 1 }}>
              {/* Message */}
              <div
                className="promo-message"
                style={{
                  fontWeight: "600",
                  color: getTextColor(msg.rule_type),
                  fontSize: "14px",
                  lineHeight: 1.4,
                }}
              >
                {isArabic && msg.message_ar ? msg.message_ar : msg.message}
              </div>

              {/* Progress bar */}
              <div
                className="promo-progress-bar"
                style={{
                  background: "#e0e0e0",
                  borderRadius: "4px",
                  height: "6px",
                  marginTop: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  className="promo-progress-fill"
                  style={{
                    background: getBorderColor(msg.rule_type),
                    height: "100%",
                    width: `${msg.progress_percent || 0}%`,
                    transition: "width 0.3s ease",
                    borderRadius: "4px",
                  }}
                />
              </div>

              {/* Progress info */}
              <div
                className="promo-progress-info"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#666",
                  flexWrap: "wrap",
                  gap: "4px",
                }}
              >
                <span>
                  {msg.progress_percent || 0}% {t("complete") || "complete"}
                  {msg.items_needed > 0 && ` • ${t("Need")} ${msg.items_needed} ${t("more")}`}
                  {msg.difference_amount > 0 && ` • ${t("Need")} ${msg.difference_amount.toFixed(2)} AED ${t("more")}`}
                </span>
                {msg.discount_preview && (
                  <span
                    className="promo-reward"
                    style={{
                      color: getTextColor(msg.rule_type),
                      fontWeight: "500",
                    }}
                  >
                    {t("Unlock")}: {isArabic ? msg.discount_preview.description_ar : msg.discount_preview.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PromotionMessage;
