// src/utils/formatCurrency.js
export const formatCurrency = (value, currency = "AED") => {
  if (value === null || value === undefined || value === "") return "";

  const num = Number(value);
  const safeNumber = Number.isNaN(num) ? 0 : num;

  // غيّر الرموز لو تحب (د.إ / ر.س أو AED / SAR)
  const symbol = currency === "SAR" ? "ر.س" : "د.إ";

  return `${symbol} ${safeNumber.toFixed(2)}`;
};
