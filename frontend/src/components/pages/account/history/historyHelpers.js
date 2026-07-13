const createMatcher = (keywords) => (value = "") => {
  const normalized = (value || "").toString().toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

const buildEntry = ({ labelKey, keys, color, background }) => ({
  labelKey,
  keys,
  color,
  background,
  matcher: createMatcher(keys),
});

const HISTORY_SUMMARY = {
  refund: [
    buildEntry({ labelKey: "Completed", keys: ["completed"], color: "#3eb65c", background: "#e8f6ea" }),
    buildEntry({ labelKey: "Processing", keys: ["processing", "pending"], color: "#f6a623", background: "#fff7eb" }),
    buildEntry({ labelKey: "Rejected", keys: ["rejected", "failed", "cancel", "declined"], color: "#d64545", background: "#ffe6e6" }),
  ],
  exchange: [
    buildEntry({ labelKey: "Approved", keys: ["approved", "completed"], color: "#3eb65c", background: "#e8f6ea" }),
    buildEntry({ labelKey: "Processing", keys: ["processing", "pending"], color: "#f6a623", background: "#fff7eb" }),
    buildEntry({ labelKey: "Rejected", keys: ["rejected", "failed", "cancel", "declined"], color: "#d64545", background: "#ffe6e6" }),
  ],
};

const STATUS_BADGE_STYLES = [
  { keys: ["completed", "approved"], color: "#3eb65c", background: "#e8f6ea" },
  { keys: ["processing", "pending"], color: "#f6a623", background: "#fff7eb" },
  { keys: ["rejected", "failed", "cancelled", "cancel", "declined"], color: "#d64545", background: "#ffe6e6" },
];

export const getStatusBadgeStyle = (status = "") => {
  const normalized = (status || "").toString().toLowerCase();
  const match = STATUS_BADGE_STYLES.find((style) => style.keys.some((key) => normalized.includes(key)));
  if (match) return match;
  return { color: "#5f5f5f", background: "#f5f5f5" };
};

export const getHistorySummaryItems = (rows = [], type) => {
  const entries = HISTORY_SUMMARY[type] ?? [];
  const summary = entries.map((entry) => ({
    labelKey: entry.labelKey,
    color: entry.color,
    background: entry.background,
    count: rows.filter((row) => entry.matcher(row.status)).length,
  }));
  return [
    {
      labelKey: "All",
      count: rows.length,
      color: "var(--theme-color)",
      background: "rgba(212, 157, 103, 0.12)",
    },
    ...summary,
  ];
};
