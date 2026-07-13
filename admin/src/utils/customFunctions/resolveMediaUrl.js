const stripSlash = (value) => value.replace(/\/+$/, "");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

const getApiOrigin = () => {
  const candidates = [
    process.env.IMAGE_URL,
    process.env.storageURL,
    process.env.API_PROD_URL,
    "https://api.cuple.shop",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate).origin;
    } catch {
      // Ignore malformed values and continue fallback chain.
    }
  }

  return "https://api.cuple.shop";
};

const resolveMediaUrl = (url) => {
  if (!url) return null;

  const raw = String(url).trim();
  if (!raw) return null;

  const backendHost = stripSlash(process.env.IMAGE_URL || getApiOrigin());
  const storageHost = stripSlash(process.env.storageURL || `${backendHost}/storage`);

  // Convert escaped slashes that may come from legacy payloads.
  const normalizedRaw = raw.replace(/\\\//g, "/").replace(/\\/g, "/");

  try {
    const parsed = new URL(normalizedRaw);
    const host = (parsed.hostname || "").toLowerCase();

    // Rewrite localhost URLs from legacy responses to the configured backend host.
    if (LOCAL_HOSTS.has(host)) {
      return `${backendHost}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    // Not an absolute URL, treat as relative path.
  }

  const normalizedPath = normalizedRaw.replace(/^\/+/, "");

  if (normalizedPath.startsWith("storage/")) {
    return `${backendHost}/${normalizedPath}`;
  }

  return `${storageHost}/${normalizedPath}`;
};

export default resolveMediaUrl;
