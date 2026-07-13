import { CapitalizeMultiple } from "@/utils/customFunctions/Capitalize";

export const formatPointsValue = (value) => {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) {
    return "0.00 AED";
  }
  return `${numeric.toFixed(2)} AED`;
};

export const formatRemarkLabel = (remark, fallback = "") => {
  const rawText = remark || fallback || "";
  if (!rawText) {
    return "-";
  }

  const normalized = rawText.replace(/_/g, " ");
  return CapitalizeMultiple(normalized);
};
