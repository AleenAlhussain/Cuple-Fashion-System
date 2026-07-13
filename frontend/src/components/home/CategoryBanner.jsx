import React, { useMemo, useState } from "react";
import ImageLink from "@/components/widgets/imageLink";
import Link from "next/link";
import { RiImageLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";

const CATEGORY_PLACEHOLDER = "/assets/images/placeholder/category.png";

function CategoryBanner({ imageUrl, single, title, link, showDetails = true }) {
  const { t, i18n } = useTranslation("common");
  const [mediaError, setMediaError] = useState(false);

  const resolvedTitle = title?.trim() || t("Category") || "Category";
  const translatedCta = t("ShopNow");
  const isArabic = String(i18n?.language || "").toLowerCase().startsWith("ar");
  const resolvedCta =
    translatedCta && translatedCta !== "ShopNow" && translatedCta !== "common:ShopNow"
      ? translatedCta
      : (isArabic ? "تسوقي الآن" : "Shop Now");
  const isFallbackImage = imageUrl === CATEGORY_PLACEHOLDER;
  const isMissingMedia = mediaError || isFallbackImage;
  const placeholderLabel = useMemo(() => resolvedTitle, [resolvedTitle]);

  // Extract slug from link (remove /category/ prefix if present)
  const slug = link?.replace(/^\/category\//, "") || "fashion";
  const href = `/category/${slug}`;

  return (
    <div
      className={`home-banner ${single ? "is-single" : ""} ${
        isMissingMedia ? "is-missing-media" : ""
      } ${showDetails ? "has-details" : "no-details"}`}
    >
      <Link href={href} className="home-banner__card-link" aria-label={resolvedTitle}>
        <div className="home-banner__media">
          <ImageLink
            imgUrl={{
              image_url: imageUrl || CATEGORY_PLACEHOLDER,
            }}
            placeholder={CATEGORY_PLACEHOLDER}
            height={single ? 680 : 338}
            width={single ? 1356 : 676}
            onImageError={() => setMediaError(true)}
          />
          {isMissingMedia && (
            <div className="home-banner__placeholder">
              <RiImageLine />
              <span>{placeholderLabel}</span>
            </div>
          )}
        </div>

        {showDetails && (
          <div className="home-banner__content">
            <h5 className="home-banner__title">{resolvedTitle}</h5>
            <span className="home-banner__cta">{resolvedCta}</span>
          </div>
        )}
      </Link>
    </div>
  );
}

export default CategoryBanner;
