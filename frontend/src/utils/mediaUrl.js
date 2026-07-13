const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const getApiOrigin = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_IMAGE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_WEBSITE_API_URL,
    "https://api.cuple.shop",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate).origin;
    } catch {
      // Ignore invalid URLs in env and continue fallback chain.
    }
  }

  return "https://api.cuple.shop";
};

export const normalizeMediaUrl = (value) => {
  if (typeof value !== "string") return value;
  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const current = new URL(value);
    if (!LOCAL_HOSTS.has(current.hostname.toLowerCase())) {
      return value;
    }

    const target = new URL(getApiOrigin());
    return new URL(current.pathname + current.search + current.hash, target.origin).toString();
  } catch {
    return value;
  }
};

export const normalizeMediaUrlsDeep = (input) => {
  if (typeof input === "string") {
    return normalizeMediaUrl(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => normalizeMediaUrlsDeep(item));
  }

  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, normalizeMediaUrlsDeep(value)])
    );
  }

  return input;
};
