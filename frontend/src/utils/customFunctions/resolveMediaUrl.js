const stripTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;

  const normalizedPath = url.replace(/^\/+/, "");
  const backendUrl = stripTrailingSlash(process.env.IMAGE_URL || "https://api.cuple.shop");
  const storageUrl = stripTrailingSlash(process.env.storageURL || "https://api.cuple.shop");

  if (url.startsWith("/")) {
    return `${backendUrl}${url}`;
  }

  return `${storageUrl}/${normalizedPath}`;
};

export default resolveMediaUrl;
