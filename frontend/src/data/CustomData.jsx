export const FilterPrice = [
  {
    id: 1,
    minPrice: null,
    maxPrice: 99,
    value: "le_99",
    label: "≤ 99 AED",
  },
  {
    id: 2,
    minPrice: 100,
    maxPrice: 149,
    value: "100_149",
    label: "100 – 149 AED",
  },
  {
    id: 3,
    minPrice: 150,
    maxPrice: 199,
    value: "150_199",
    label: "150 – 199 AED",
  },
  {
    id: 4,
    minPrice: 200,
    maxPrice: null,
    value: "200_plus",
    label: "200+ AED",
  },
];

export const FilterSortData = [
  {
    value: "asc",
    label: "AscendingOrder",
  },
  {
    value: "desc",
    label: "DescendingOrder",
  },
  {
    value: "low-high",
    label: "LowHighPrice",
  },
  {
    value: "high-low",
    label: "HighLowPrice",
  },
  {
    value: "a-z",
    label: "AZOrder",
  },
  {
    value: "z-a",
    label: "ZAOrder",
  },
  {
    value: "discount-high-low",
    label: "% Off - Hight To Low",
  },
];
export const FilterPaginateData = [
  {
    value: 10,
    label: "10 Products",
  },
  {
    value: 25,
    label: "25 Products",
  },
  {
    value: 50,
    label: "50 Products",
  },
  {
    value: 100,
    label: "100 Products",
  },
];
