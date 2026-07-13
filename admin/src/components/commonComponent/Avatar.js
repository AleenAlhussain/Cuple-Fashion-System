import React, { useState } from "react";
import Image from "next/image";
import resolveMediaUrl from "@/utils/customFunctions/resolveMediaUrl";

const PLACEHOLDER_MARKERS = ["/assets/images/placeholder", "assets/images/placeholder"];
const isAbsoluteHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value.trim());

const isPlaceholderPath = (value) =>
  typeof value === "string" && PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker));

const normalizeImageSrc = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
  if (isAbsoluteHttpUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("/assets/")) return trimmed;
  if (trimmed.startsWith("assets/")) return `/${trimmed}`;
  return resolveMediaUrl(trimmed) || trimmed;
};

const resolveAvatarSrc = (data) => {
  if (!data) return null;
  if (typeof data === "string") return normalizeImageSrc(data);

  const candidates = [
    data?.original_url,
    data?.image_url,
    data?.thumbnail_url,
    data?.asset_url,
    data?.url,
    data?.path,
    data?.file_name ? `attachments/${data.file_name}` : null,
  ].filter(Boolean);

  const preferred = candidates.find((candidate) => !isPlaceholderPath(candidate)) || candidates[0];
  return normalizeImageSrc(preferred);
};

const Avatar = ({ data, placeHolder, name, customClass, height, width, noPrevClass, NameWithRound, imageClass }) => {
  const [imgError, setImgError] = useState(false);
  const resolvedSrc = resolveAvatarSrc(data);
  return (
    <>
      {resolvedSrc && !imgError ? (
        <div className={`${!noPrevClass ? "user-profile" : ""} ${customClass ? customClass : ""}`}>
          <Image src={resolvedSrc} className={`${customClass ? customClass : ""} ${imageClass ? imageClass : ""}`} height={height || 50} width={width || 50} alt={name?.name || ""} onError={() => setImgError(true)} />
        </div>
      ) : placeHolder ? (
        <div className={`user-profile user-round ${customClass ? customClass : ""}`}>
          <Image src={placeHolder} height={height || 50} width={width || 50} alt={name?.name} />
        </div>
      ) : NameWithRound ? (
        <div className='user-round'>
          <h4>{name?.name?.charAt(0).toString().toUpperCase()}</h4>
        </div>
      ) : (
        <h4>{name?.name?.charAt(0).toString().toUpperCase()}</h4>
      )}
    </>
  );
};

export default Avatar;
