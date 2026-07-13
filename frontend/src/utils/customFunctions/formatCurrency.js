/**
 * Format a numeric amount as AED currency string.
 * @param {number|string|null|undefined} amount
 * @returns {string} e.g. "125.00 AED"
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "0.00 AED";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "0.00 AED";
  return `${num.toFixed(2)} AED`;
};

export default formatCurrency;
