import { storageURL } from "@/utils/constants";

const PLACEHOLDER_IMAGE = "/assets/images/placeholder.png";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value) || /^\/\//.test(value);

const normalizePath = (value) =>
  (value || "")
    .toString()
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

const encodePath = (value) =>
  normalizePath(value)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const buildMediaUrl = (path) => {
  const encoded = encodePath(path);
  return encoded ? `${storageURL}/api/media/${encoded}` : null;
};

const resolveRelativeUrl = (value) => {
  const normalized = normalizePath(value);
  if (!normalized) return null;

  if (normalized.startsWith("assets/")) {
    return `/${normalized}`;
  }

  if (normalized.startsWith("storage/")) {
    return buildMediaUrl(normalized.replace(/^storage\//, ""));
  }

  if (normalized.startsWith("api/media/")) {
    return `${storageURL}/${normalized}`;
  }

  return buildMediaUrl(normalized);
};

const rewriteAbsoluteStorageUrl = (value) => {
  if (!isAbsoluteUrl(value)) return value;

  try {
    const parsed = new URL(value);
    const normalizedPath = normalizePath(parsed.pathname);

    if (normalizedPath.startsWith("storage/")) {
      return buildMediaUrl(normalizedPath.replace(/^storage\//, ""));
    }

    if (normalizedPath.startsWith("api/media/")) {
      return value;
    }

    return value;
  } catch {
    return value;
  }
};

// Helper to get proper image URL
const getImageUrl = (data) => {
  if (!data) return null;

  // If data is already a string URL
  if (typeof data === "string" && data.trim()) {
    if (isAbsoluteUrl(data)) {
      return rewriteAbsoluteStorageUrl(data);
    }
    if (data.startsWith("/assets/")) {
      return data;
    }
    return resolveRelativeUrl(data);
  }

  // If data is an object with image URL fields
  const objectUrl = data?.original_url || data?.url || data?.avatar_url;
  if (typeof objectUrl === "string" && objectUrl.trim()) {
    if (isAbsoluteUrl(objectUrl)) {
      return rewriteAbsoluteStorageUrl(objectUrl);
    }
    if (objectUrl.startsWith("/assets/")) {
      return objectUrl;
    }
    return resolveRelativeUrl(objectUrl);
  }

  const objectPath = data?.path || data?.avatar;
  if (typeof objectPath === "string" && objectPath.trim()) {
    return resolveRelativeUrl(objectPath);
  }

  return null;
};

const Avatar = ({
  data,
  placeHolder,
  name,
  customClass,
  customImageClass,
  height,
  width,
}) => {
  const imageUrl = getImageUrl(data);
  const fallbackImage = placeHolder || PLACEHOLDER_IMAGE;
  const altText = name?.name || name || "";

  const handleImageError = (e) => {
    e.target.src = fallbackImage;
  };

  return (
    <>
      {imageUrl ? (
        <div>
          <img
            loading="lazy"
            className={customClass || ""}
            src={imageUrl}
            height={height || 50}
            width={width || 50}
            alt={altText}
            onError={handleImageError}
          />
        </div>
      ) : fallbackImage ? (
        <div className={customClass || ""}>
          <img
            loading="lazy"
            className={customImageClass || ""}
            src={fallbackImage}
            height={height || 50}
            width={width || 50}
            alt={altText}
          />
        </div>
      ) : (
        <h4 className="user-name">
          {(name?.name?.charAt(0) || name?.charAt(0) || "").toUpperCase()}
        </h4>
      )}
    </>
  );
};

export default Avatar;
