const emirateCitiesMap = {
  "abu dhabi": ["Abu Dhabi", "Al Ain", "Mussafah", "Al Raha", "Ruwayyah"],
  ajman: ["Ajman City", "Al Rashidiya", "Al Nuaimiya"],
  dubai: ["Dubai City", "Jumeirah", "Deira", "Bur Dubai", "Dubai Marina", "Jebel Ali"],
  "ras al-khaymah": ["Ras al-Khaimah City", "Al Rams", "Al Jazirah Al Hamra"],
  sharjah: ["Sharjah City", "Al Majaz", "Al Qasimia"],
  "umm al qaywayn": ["Umm al-Quwain City", "Falaj Al Mualla", "Al Salamah"],
  fujairah: ["Fujairah City", "Dibba", "Sakamkam"],
};

const emirateStateAlias = {
  "abu zabi": "abu dhabi",
  "ash shariqah": "sharjah",
  "ash-shariqah": "sharjah",
  sharjha: "sharjah",
  "al fujayrah": "fujairah",
  "al-fujayrah": "fujairah",
  "al fujairah": "fujairah",
  "al-fujairah": "fujairah",
};

const normalizeKey = (key = "") => key.toString().trim().toLowerCase();

const resolveEmirateKey = (stateName) => {
  const normalized = normalizeKey(stateName);
  return emirateStateAlias[normalized] ?? normalized;
};

export const getCitiesByState = (stateName) => {
  return emirateCitiesMap[resolveEmirateKey(stateName)] ?? [];
};

export const getEmirateNames = () => Object.keys(emirateCitiesMap);
