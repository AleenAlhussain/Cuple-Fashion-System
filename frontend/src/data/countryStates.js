// States/Emirates for UAE and Saudi Arabia
export const countryStates = {
  // UAE - Emirates
  1: [
    { id: 1, name: "Abu Dhabi" },
    { id: 2, name: "Dubai" },
    { id: 3, name: "Sharjah" },
    { id: 4, name: "Ajman" },
    { id: 5, name: "Umm Al Quwain" },
    { id: 6, name: "Ras Al Khaimah" },
    { id: 7, name: "Fujairah" },
  ],
  // Saudi Arabia - Regions
  2: [
    { id: 101, name: "Riyadh" },
    { id: 102, name: "Makkah" },
    { id: 103, name: "Madinah" },
    { id: 104, name: "Eastern Province" },
    { id: 105, name: "Asir" },
    { id: 106, name: "Tabuk" },
    { id: 107, name: "Hail" },
    { id: 108, name: "Northern Borders" },
    { id: 109, name: "Jazan" },
    { id: 110, name: "Najran" },
    { id: 111, name: "Al Bahah" },
    { id: 112, name: "Al Jawf" },
    { id: 113, name: "Qassim" },
  ],
};

export const getStatesByCountryId = (countryId) => {
  return countryStates[countryId] || [];
};
