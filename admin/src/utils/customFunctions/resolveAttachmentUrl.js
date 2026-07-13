import resolveMediaUrl from "./resolveMediaUrl";

const IMAGE_EXTENSIONS_REGEX = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i;
const PLACEHOLDER_MARKERS = ["/assets/images/placeholder", "assets/images/placeholder"];
const isAbsoluteHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value.trim());

const isPlaceholderPath = (value) =>
  typeof value === "string" && PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker));

const toTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

export const isAttachmentImage = (attachment) => {
  if (!attachment) return false;

  if (typeof attachment === "string") {
    if (attachment.startsWith("image/")) return true;
    return IMAGE_EXTENSIONS_REGEX.test(attachment);
  }

  const mimeType = attachment?.mime_type || attachment?.mimeType || "";
  if (typeof mimeType === "string" && mimeType.startsWith("image/")) {
    return true;
  }

  const nameCandidate =
    attachment?.asset_url ||
    attachment?.image_url ||
    attachment?.name ||
    attachment?.file_name ||
    attachment?.path ||
    attachment?.url ||
    attachment?.original_url ||
    "";

  return IMAGE_EXTENSIONS_REGEX.test(String(nameCandidate));
};

export const resolveAttachmentUrl = (attachmentOrUrl) => {
  if (!attachmentOrUrl) return null;

  if (typeof attachmentOrUrl === "string") {
    const raw = toTrimmedString(attachmentOrUrl);
    if (!raw) return null;
    if (isAbsoluteHttpUrl(raw)) return raw;

    // Plain filename from API: "abc.webp" -> "attachments/abc.webp"
    if (!raw.includes("/") && !raw.startsWith("http")) {
      return resolveMediaUrl(`attachments/${raw}`);
    }

    return resolveMediaUrl(raw);
  }

  const candidates = [
    attachmentOrUrl?.original_url,
    attachmentOrUrl?.image_url,
    attachmentOrUrl?.thumbnail_url,
    attachmentOrUrl?.asset_url,
    attachmentOrUrl?.url,
    attachmentOrUrl?.path,
    attachmentOrUrl?.file_name,
    attachmentOrUrl?.name,
  ]
    .map(toTrimmedString)
    .filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  const preferred = candidates.find((candidate) => !isPlaceholderPath(candidate)) || candidates[0];
  const normalized = toTrimmedString(preferred);
  if (isAbsoluteHttpUrl(normalized)) return normalized;

  if (!normalized.includes("/") && !normalized.startsWith("http")) {
    return resolveMediaUrl(`attachments/${normalized}`);
  }

  return resolveMediaUrl(normalized);
};

export const resolveAttachmentPreviewUrl = (attachmentOrUrl) => {
  if (!attachmentOrUrl) return null;

  if (typeof attachmentOrUrl === "string") {
    return resolveAttachmentUrl(attachmentOrUrl);
  }

  const candidates = [
    attachmentOrUrl?.thumbnail_url,
    attachmentOrUrl?.image_url,
    attachmentOrUrl?.original_url,
    attachmentOrUrl?.asset_url,
    attachmentOrUrl?.url,
    attachmentOrUrl?.path,
    attachmentOrUrl?.file_name,
    attachmentOrUrl?.name,
  ]
    .map(toTrimmedString)
    .filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  const preferred = candidates.find((candidate) => !isPlaceholderPath(candidate)) || candidates[0];
  return resolveAttachmentUrl(preferred);
};
