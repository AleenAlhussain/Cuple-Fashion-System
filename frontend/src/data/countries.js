// States/Regions by country
// Using name as id so the dropdown stores the name string directly
export const countryStates = {
  // UAE Emirates
  1: [
    { id: "Abu Dhabi", name: "Abu Dhabi" },
    { id: "Dubai", name: "Dubai" },
    { id: "Sharjah", name: "Sharjah" },
    { id: "Ajman", name: "Ajman" },
    { id: "Umm Al Quwain", name: "Umm Al Quwain" },
    { id: "Ras Al Khaimah", name: "Ras Al Khaimah" },
    { id: "Fujairah", name: "Fujairah" },
  ],
  // Saudi Arabia Regions
  2: [
    { id: "Riyadh", name: "Riyadh" },
    { id: "Makkah", name: "Makkah" },
    { id: "Madinah", name: "Madinah" },
    { id: "Eastern Province", name: "Eastern Province" },
    { id: "Asir", name: "Asir" },
    { id: "Tabuk", name: "Tabuk" },
    { id: "Hail", name: "Hail" },
    { id: "Northern Borders", name: "Northern Borders" },
    { id: "Jazan", name: "Jazan" },
    { id: "Najran", name: "Najran" },
    { id: "Al Bahah", name: "Al Bahah" },
    { id: "Al Jawf", name: "Al Jawf" },
    { id: "Qassim", name: "Qassim" },
  ],
};

export const getStatesByCountryId = (countryId) => {
  return countryStates[countryId] || [];
};

// All countries list for international shipping
export const allCountries = [
  { id: 1, name: "United Arab Emirates", code: "AE" },
  { id: 2, name: "Saudi Arabia", code: "SA" },
  { id: 3, name: "Afghanistan", code: "AF" },
  { id: 4, name: "Albania", code: "AL" },
  { id: 5, name: "Algeria", code: "DZ" },
  { id: 6, name: "Argentina", code: "AR" },
  { id: 7, name: "Australia", code: "AU" },
  { id: 8, name: "Austria", code: "AT" },
  { id: 9, name: "Bahrain", code: "BH" },
  { id: 10, name: "Bangladesh", code: "BD" },
  { id: 11, name: "Belgium", code: "BE" },
  { id: 12, name: "Brazil", code: "BR" },
  { id: 13, name: "Canada", code: "CA" },
  { id: 14, name: "China", code: "CN" },
  { id: 15, name: "Denmark", code: "DK" },
  { id: 16, name: "Egypt", code: "EG" },
  { id: 17, name: "Finland", code: "FI" },
  { id: 18, name: "France", code: "FR" },
  { id: 19, name: "Germany", code: "DE" },
  { id: 20, name: "Greece", code: "GR" },
  { id: 21, name: "Hong Kong", code: "HK" },
  { id: 22, name: "India", code: "IN" },
  { id: 23, name: "Indonesia", code: "ID" },
  { id: 24, name: "Iraq", code: "IQ" },
  { id: 25, name: "Ireland", code: "IE" },
  { id: 26, name: "Italy", code: "IT" },
  { id: 27, name: "Japan", code: "JP" },
  { id: 28, name: "Jordan", code: "JO" },
  { id: 29, name: "Kenya", code: "KE" },
  { id: 30, name: "Kuwait", code: "KW" },
  { id: 31, name: "Lebanon", code: "LB" },
  { id: 32, name: "Malaysia", code: "MY" },
  { id: 33, name: "Mexico", code: "MX" },
  { id: 34, name: "Morocco", code: "MA" },
  { id: 35, name: "Netherlands", code: "NL" },
  { id: 36, name: "New Zealand", code: "NZ" },
  { id: 37, name: "Nigeria", code: "NG" },
  { id: 38, name: "Norway", code: "NO" },
  { id: 39, name: "Oman", code: "OM" },
  { id: 40, name: "Pakistan", code: "PK" },
  { id: 41, name: "Philippines", code: "PH" },
  { id: 42, name: "Poland", code: "PL" },
  { id: 43, name: "Portugal", code: "PT" },
  { id: 44, name: "Qatar", code: "QA" },
  { id: 45, name: "Russia", code: "RU" },
  { id: 46, name: "Singapore", code: "SG" },
  { id: 47, name: "South Africa", code: "ZA" },
  { id: 48, name: "South Korea", code: "KR" },
  { id: 49, name: "Spain", code: "ES" },
  { id: 50, name: "Sri Lanka", code: "LK" },
  { id: 51, name: "Sweden", code: "SE" },
  { id: 52, name: "Switzerland", code: "CH" },
  { id: 53, name: "Syria", code: "SY" },
  { id: 54, name: "Taiwan", code: "TW" },
  { id: 55, name: "Thailand", code: "TH" },
  { id: 56, name: "Tunisia", code: "TN" },
  { id: 57, name: "Turkey", code: "TR" },
  { id: 58, name: "Ukraine", code: "UA" },
  { id: 59, name: "United Kingdom", code: "GB" },
  { id: 60, name: "United States", code: "US" },
  { id: 61, name: "Vietnam", code: "VN" },
  { id: 62, name: "Yemen", code: "YE" },
];

export const getCountryById = (id) => {
  return allCountries.find(c => c.id === Number(id));
};

export const getCountryByCode = (code) => {
  return allCountries.find(c => c.code === code);
};
