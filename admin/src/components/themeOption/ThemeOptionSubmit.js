const ThemeOptionSubmit = (values, mutate) => {
  try {
    // Ensure nested objects exist
    values["options"] = values["options"] || {};
    values["options"]["logo"] = values["options"]["logo"] || {};
    values["options"]["seo"] = values["options"]["seo"] || {};
    values["options"]["general"] = values["options"]["general"] || {};
    values["options"]["header"] = values["options"]["header"] || {};
    values["options"]["footer"] = values["options"]["footer"] || {};
    values["options"]["popup"] = values["options"]["popup"] || {};
    values["options"]["popup"]["news_letter"] = values["options"]["popup"]["news_letter"] || {};
    values["options"]["popup"]["exit"] = values["options"]["popup"]["exit"] || {};
    values["options"]["popup"]["auth"] = values["options"]["popup"]["auth"] || {};
    values["options"]["contact_us"] = values["options"]["contact_us"] || {};
    values["options"]["collection"] = values["options"]["collection"] || {};
    values["options"]["collection"]["subcategory_sections"] =
      values["options"]["collection"]["subcategory_sections"] || [];
    values["options"]["product"] = values["options"]["product"] || {};
    values["options"]["product"]["services"] = values["options"]["product"]["services"] || {};
    values["options"]["product"]["services"]["banners"] =
      values["options"]["product"]["services"]["banners"] || [];
    values["options"]["about_us"] = values["options"]["about_us"] || {};
    values["options"]["about_us"]["about"] = values["options"]["about_us"]["about"] || {};
    values["options"]["about_us"]["about"]["futures"] =
      values["options"]["about_us"]["about"]["futures"] || [];
    values["options"]["about_us"]["team"] = values["options"]["about_us"]["team"] || {};
    values["options"]["about_us"]["testimonial"] = values["options"]["about_us"]["testimonial"] || {};
    values["options"]["home_categories"] = values["options"]["home_categories"] || {};
    values["options"]["home_latest_products"] = values["options"]["home_latest_products"] || {};
    values["options"]["home_best_seller_products"] = values["options"]["home_best_seller_products"] || {};
    values["options"]["home_highlight_sections"] = values["options"]["home_highlight_sections"] || {};
    values["options"]["matchi_matchi"] = values["options"]["matchi_matchi"] || {};

    // Ensure home_categories.enabled is a boolean
    if (values["options"]["home_categories"]["enabled"] !== undefined) {
      const enabled = values["options"]["home_categories"]["enabled"];
      values["options"]["home_categories"]["enabled"] = Array.isArray(enabled)
        ? enabled.length > 0
        : Boolean(enabled);
    }

    const promoTextEn = String(values?.options?.general?.topbar_promo_text || "").trim();
    const promoTextAr = String(values?.options?.general?.topbar_promo_text_ar || "").trim();
    const hasPromoEn = promoTextEn.length > 0;
    const hasPromoAr = promoTextAr.length > 0;

    if (hasPromoEn !== hasPromoAr) {
      if (typeof window !== "undefined") {
        window.alert(
          "Top header promo text must be filled in both English and Arabic, or leave both empty."
        );
      }
      return;
    }

    values["options"]["general"]["topbar_promo_text"] = hasPromoEn ? promoTextEn : "";
    values["options"]["general"]["topbar_promo_text_ar"] = hasPromoAr ? promoTextAr : "";

    const collectionSections = values["options"]["collection"]["subcategory_sections"] || [];
    const normalizedCollectionSections = collectionSections.map((section, index) => ({
      ...section,
      id: section?.id || `sec-${index + 1}`,
      parent_category_id: section?.parent_category_id ?? null,
      enabled: section?.enabled === undefined ? true : Boolean(section.enabled),
      title: section?.title || "",
      title_ar: section?.title_ar || "",
      description: section?.description || "",
      description_ar: section?.description_ar || "",
      items: Array.isArray(section?.items) ? section.items : [],
    }));
    const missingCollectionArabicTitle = normalizedCollectionSections.some(
      (section) => !(section.title_ar || "").trim()
    );

    if (missingCollectionArabicTitle) {
      if (typeof window !== "undefined") {
        window.alert("Arabic Section Title is required for all Collection Layout sections.");
      }
      return;
    }

    values["options"]["collection"]["subcategory_sections"] = normalizedCollectionSections;

    const extractId = (value) => {
      if (value === undefined || value === null || value === "") return null;
      if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
      if (typeof value === "object") return value?.id ?? value?.value ?? null;
      return value;
    };

    const pickId = (...candidates) => {
      for (const candidate of candidates) {
        const id = extractId(candidate);
        if (id !== null && id !== "") return id;
      }
      return null;
    };

    const getIdWithFallback = (fieldName, fallbackValue) => {
      if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
        return extractId(values[fieldName]);
      }
      return pickId(fallbackValue);
    };

    const isRenderableMediaObject = (value) =>
      value &&
      typeof value === "object" &&
      (value.original_url || value.url || value.path || value.file_name || value.name);

    const getMediaObjectWithFallback = (fieldName, fallbackValue) => {
      if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
        const mediaValue = values[fieldName];
        return isRenderableMediaObject(mediaValue) ? mediaValue : null;
      }
      return isRenderableMediaObject(fallbackValue) ? fallbackValue : null;
    };

    const normalizeIdList = (list, maxItems = null) => {
      const normalized = Array.from(
        new Set(
          (Array.isArray(list) ? list : [])
            .map((item) => extractId(item))
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item > 0)
        )
      );

      return maxItems ? normalized.slice(0, maxItems) : normalized;
    };

    const normalizeMatchiItems = (items, maxItems = 24) => {
      const seenProductIds = new Set();

      return (Array.isArray(items) ? items : [])
        .map((item, index) => {
          const productId = Number(item?.product_id ?? item?.productId ?? item?.id);
          if (!Number.isInteger(productId) || productId <= 0 || seenProductIds.has(productId)) {
            return null;
          }

          seenProductIds.add(productId);

          const colorAttributeValueIdRaw =
            item?.color_attribute_value_id ?? item?.colorAttributeValueId ?? null;
          const colorAttributeValueId =
            colorAttributeValueIdRaw === null || colorAttributeValueIdRaw === ""
              ? null
              : Number(colorAttributeValueIdRaw);

          return {
            id: item?.id || `matchi-${productId}-${index + 1}`,
            product_id: productId,
            match_type:
              item?.match_type === "bag" || item?.match_type === "shoes"
                ? item.match_type
                : item?.preview_zone === "hand"
                ? "bag"
                : item?.preview_zone === "foot"
                ? "shoes"
                : "",
            color_attribute_value_id:
              Number.isInteger(colorAttributeValueId) && colorAttributeValueId > 0
                ? colorAttributeValueId
                : null,
            color_name: item?.color_name || "",
            color_name_ar: item?.color_name_ar || "",
            color_hex: item?.color_hex || "",
            overlay_image_id: pickId(
              item?.overlay_image_id,
              item?.overlayImageId
            ),
            overlay_image_url:
              item?.overlay_image_url || item?.overlayImageUrl || "",
            preview_zone:
              item?.preview_zone === "hand" || item?.preview_zone === "foot"
                ? item.preview_zone
                : "auto",
            overlay_scale: Number.isFinite(Number(item?.overlay_scale))
              ? Number(item.overlay_scale)
              : 100,
            overlay_offset_x: Number.isFinite(Number(item?.overlay_offset_x))
              ? Number(item.overlay_offset_x)
              : 0,
            overlay_offset_y: Number.isFinite(Number(item?.overlay_offset_y))
              ? Number(item.overlay_offset_y)
              : 0,
            overlay_rotation: Number.isFinite(Number(item?.overlay_rotation))
              ? Number(item.overlay_rotation)
              : 0,
          };
        })
        .filter(Boolean)
        .slice(0, maxItems);
    };

    const normalizeMatchiPairImages = (pairImages, availableItems = []) => {
      const validItemIds = new Set(
        (Array.isArray(availableItems) ? availableItems : []).map((item) => String(item?.id))
      );
      const seenPairs = new Set();

      return (Array.isArray(pairImages) ? pairImages : [])
        .map((pairImage, index) => {
          const firstItemId = String(
            pairImage?.first_item_id ?? pairImage?.firstItemId ?? ""
          ).trim();
          const secondItemId = String(
            pairImage?.second_item_id ?? pairImage?.secondItemId ?? ""
          ).trim();

          const firstItem = (Array.isArray(availableItems) ? availableItems : []).find(
            (item) => String(item?.id) === firstItemId
          );
          const secondItem = (Array.isArray(availableItems) ? availableItems : []).find(
            (item) => String(item?.id) === secondItemId
          );

          if (
            !firstItemId ||
            !secondItemId ||
            firstItemId === secondItemId ||
            !validItemIds.has(firstItemId) ||
            !validItemIds.has(secondItemId) ||
            (firstItem?.match_type &&
              secondItem?.match_type &&
              firstItem.match_type === secondItem.match_type)
          ) {
            return null;
          }

          const signature = [firstItemId, secondItemId].sort().join("::");
          if (seenPairs.has(signature)) {
            return null;
          }

          seenPairs.add(signature);

          return {
            id: pairImage?.id || `matchi-pair-${index + 1}`,
            first_item_id: firstItemId,
            second_item_id: secondItemId,
            preview_image_id: pickId(
              pairImage?.preview_image_id,
              pairImage?.previewImageId
            ),
            preview_image_url:
              pairImage?.preview_image_url || pairImage?.previewImageUrl || "",
            title: pairImage?.title || "",
            title_ar: pairImage?.title_ar ?? pairImage?.titleAr ?? "",
            description: pairImage?.description || "",
            description_ar:
              pairImage?.description_ar ?? pairImage?.descriptionAr ?? "",
            original_price:
              pairImage?.original_price ?? pairImage?.originalPrice ?? "",
            sale_price:
              pairImage?.sale_price ?? pairImage?.salePrice ?? "",
          };
        })
        .filter(
          (pairImage) =>
            pairImage &&
            (pairImage.preview_image_id || pairImage.preview_image_url)
        );
    };

    const buildRequiredMatchiPairImages = (availableItems = [], existingPairImages = []) => {
      const existingMap = new Map(
        (Array.isArray(existingPairImages) ? existingPairImages : []).map((pairImage) => [
          [String(pairImage?.first_item_id || ""), String(pairImage?.second_item_id || "")]
            .sort()
            .join("::"),
          pairImage,
        ])
      );
      const groups = [];

      for (let index = 0; index < availableItems.length; index += 2) {
        const firstItem = availableItems[index];
        const secondItem = availableItems[index + 1];

        if (!firstItem || !secondItem) {
          continue;
        }

        const signature = [String(firstItem.id), String(secondItem.id)].sort().join("::");
        const existing = existingMap.get(signature) || null;

        groups.push({
          id: existing?.id || `matchi-pair-${Math.floor(index / 2) + 1}`,
          first_item_id: String(firstItem.id),
          second_item_id: String(secondItem.id),
          preview_image_id: pickId(
            existing?.preview_image_id,
            existing?.previewImageId
          ),
          preview_image_url:
            existing?.preview_image_url || existing?.previewImageUrl || "",
          title: existing?.title || "",
          title_ar: existing?.title_ar ?? existing?.titleAr ?? "",
          description: existing?.description || "",
          description_ar:
            existing?.description_ar ?? existing?.descriptionAr ?? "",
          original_price:
            existing?.original_price ?? existing?.originalPrice ?? "",
          sale_price:
            existing?.sale_price ?? existing?.salePrice ?? "",
        });
      }

      return groups;
    };

    values["options"]["logo"]["header_logo_id"] = getIdWithFallback(
      "header_logo_id",
      values?.options?.logo?.header_logo_id
    );
    values["options"]["logo"]["footer_logo_id"] = getIdWithFallback(
      "footer_logo_id",
      values?.options?.logo?.footer_logo_id
    );
    values["options"]["logo"]["favicon_icon_id"] = getIdWithFallback(
      "favicon_icon_id",
      values?.options?.logo?.favicon_icon_id
    );
    values["options"]["seo"]["og_image_id"] = getIdWithFallback(
      "og_image_id",
      values?.options?.seo?.og_image_id
    );
    if (values["headerCategories"]) {
      values["options"]["header"]["category_ids"] = values["headerCategories"];
    }
    if (values["footer_categories"]) {
      values["options"]["footer"]["footer_categories"] = values["footer_categories"];
    }
    if (values["useful_link"]) {
      values["options"]["footer"]["useful_link"] = values["useful_link"];
    }
    if (values["help_center"]) {
      values["options"]["footer"]["help_center"] = values["help_center"];
    }
    if (values["today_deals"]) {
      values["options"]["header"]["today_deals"] = values["today_deals"];
    }
    if (values["footer_pages"]) {
      values["options"]["footer"]["footer_pages"] = values["footer_pages"];
    }

    if (values["newsLetterImage"]) {
      values["options"]["popup"]["news_letter"]["image_url"] = values["newsLetterImage"].original_url;
    } else {
      values["options"]["popup"]["news_letter"]["image_url"] = "";
    }

    if (values["exitImage"]) {
      values["options"]["popup"]["exit"]["image_url"] = values["exitImage"].original_url;
    } else {
      values["options"]["popup"]["exit"]["image_url"] = "";
    }

    if (values["authImage"]) {
      values["options"]["popup"]["auth"]["image_url"] = values["authImage"].original_url;
    } else {
      values["options"]["popup"]["auth"]["image_url"] = "";
    }

    if (values["contactUsImage"]) {
      values["options"]["contact_us"]["imageUrl"] = values["contactUsImage"].original_url;
    } else {
      values["options"]["contact_us"]["imageUrl"] = "";
    }

    values["options"]["contact_us"]["title"] = values?.options?.contact_us?.title || "";
    values["options"]["contact_us"]["title_ar"] = values?.options?.contact_us?.title_ar || "";
    values["options"]["contact_us"]["description"] =
      values?.options?.contact_us?.description || "";
    values["options"]["contact_us"]["description_ar"] =
      values?.options?.contact_us?.description_ar || "";

    ["detail_1", "detail_2", "detail_3"].forEach((detailKey, index) => {
      const detail = values?.options?.contact_us?.[detailKey] || {};
      values["options"]["contact_us"][detailKey] = {
        ...detail,
        label: detail?.label || "",
        label_ar: detail?.label_ar || "",
        text: detail?.text || "",
        text_ar: detail?.text_ar || "",
        icon: detail?.icon || "",
        icon_image_url: detail?.icon_image_url || "",
      };

      if (values[`contactDetailIcon${index + 1}`]) {
        values["options"]["contact_us"][detailKey]["icon_image_url"] =
          values[`contactDetailIcon${index + 1}`].original_url;
      } else {
        values["options"]["contact_us"][detailKey]["icon_image_url"] = "";
      }
    });

    if (values["collection_image"]) {
      values["options"]["collection"]["collection_image_url"] = values["collection_image"].original_url;
    } else {
      values["options"]["collection"]["collection_image_url"] = "";
    }

    if (values["FooterSubscribeImage"]) {
      values["options"]["footer"]["bg_image"] = values["FooterSubscribeImage"].original_url;
    } else {
      values["options"]["footer"]["bg_image"] = "";
    }

    values["options"]["collection"]["collection_type"] = values?.options?.collection?.collection_type || "";
    values["options"]["collection"]["collection_name"] = values?.options?.collection?.collection_name || "";
    values["options"]["collection"]["collection_link"] = values?.options?.collection?.collection_link || "";

    if (values["banner_image_url"]) {
      values["options"]["product"]["banner_image_url"] = values["banner_image_url"].original_url;
    } else {
      values["options"]["product"]["banner_image_url"] = "";
    }

    if (values["safe_checkout_image"]) {
      values["options"]["product"]["safe_checkout_image"] = values["safe_checkout_image"].original_url;
    } else {
      values["options"]["product"]["safe_checkout_image"] = "";
    }

    if (values["secure_checkout_image"]) {
      values["options"]["product"]["secure_checkout_image"] = values["secure_checkout_image"].original_url;
    } else {
      values["options"]["product"]["secure_checkout_image"] = "";
    }

    values["options"]["product"]["shipping_and_return"] = values?.options?.product?.shipping_and_return || "";
    values["options"]["product"]["shipping_and_return_ar"] = values?.options?.product?.shipping_and_return_ar || "";

    values["options"]["product"]["services"]["banners"] = (values["options"]["product"]["services"]["banners"] || []).map((service) => ({
      ...service,
      title: service?.title || "",
      title_ar: service?.title_ar || "",
      description: service?.description || "",
      description_ar: service?.description_ar || "",
      image_url: service?.image_url || "",
      status: service?.status ?? true,
      redirect_link: {
        link: service?.redirect_link?.link || service?.redirect_link?.value || "",
        link_type: service?.redirect_link?.link_type || service?.redirect_link?.type || "page",
      },
    }));

    values["options"]["product"]["services"]["banners"]?.forEach((elem, i) => {
      if (values[`productServiceImage${i}`]) {
        values["options"]["product"]["services"]["banners"][i]["image_url"] = values[`productServiceImage${i}`].original_url;
      } else {
        values["options"]["product"]["services"]["banners"][i]["image_url"] = "";
      }
    });

    if (values["footerImage"]) {
      values["options"]["footer"]["bg_image"] = values["footerImage"].original_url;
    } else {
      values["options"]["footer"]["bg_image"] = "";
    }

    if (values["paymentOptionImage"]) {
      values["options"]["footer"]["payment_option_image_url"] = values["paymentOptionImage"].original_url;
    } else {
      values["options"]["footer"]["payment_option_image_url"] = "";
    }

    // About Us
    if (values["content_left_image_url"]) {
      values["options"]["about_us"]["about"]["content_left_image_url"] = values["content_left_image_url"].original_url;
    } else {
      values["options"]["about_us"]["about"]["content_left_image_url"] = "";
    }

    if (values["content_right_image_url"]) {
      values["options"]["about_us"]["about"]["content_right_image_url"] = values["content_right_image_url"].original_url;
    } else {
      values["options"]["about_us"]["about"]["content_right_image_url"] = "";
    }

    values["options"]["about_us"]["about"]["title"] = values?.options?.about_us?.about?.title || "";
    values["options"]["about_us"]["about"]["title_ar"] = values?.options?.about_us?.about?.title_ar || "";
    values["options"]["about_us"]["about"]["description"] = values?.options?.about_us?.about?.description || "";
    values["options"]["about_us"]["about"]["description_ar"] = values?.options?.about_us?.about?.description_ar || "";
    values["options"]["about_us"]["about"]["futures"] = (values["options"]["about_us"]["about"]["futures"] || []).map((future) => ({
      ...future,
      title: future?.title || "",
      title_ar: future?.title_ar || "",
      description: future?.description || "",
      description_ar: future?.description_ar || "",
      icon: future?.icon || "",
    }));

    values["options"]["about_us"]["about"]["futures"]?.forEach((elem, i) => {
      if (values[`futureIcons${i}`]) {
        values["options"]["about_us"]["about"]["futures"][i]["icon"] = values[`futureIcons${i}`].original_url;
      } else {
        values["options"]["about_us"]["about"]["futures"][i]["icon"] = "";
      }
    });

    values["options"]["about_us"]["team"]["members"]?.forEach((elem, i) => {
      if (values[`teamContentImage${i}`]) {
        values["options"]["about_us"]["team"]["members"][i]["profile_image_url"] = values[`teamContentImage${i}`].original_url;
      } else {
        values["options"]["about_us"]["team"]["members"][i]["profile_image_url"] = "";
      }
    });

    values["options"]["about_us"]["testimonial"]["reviews"]?.forEach((elem, i) => {
      if (values[`testimonialReviewImage${i}`]) {
        values["options"]["about_us"]["testimonial"]["reviews"][i]["profile_image_url"] = values[`testimonialReviewImage${i}`].original_url;
      } else {
        values["options"]["about_us"]["testimonial"]["reviews"][i]["profile_image_url"] = "";
      }
    });

    const homeBannerArray = (values["options"]["home_banner"]?.banners || [])
      .map((banner, index) => {
        // Prefer image_mobile because FileUploadField name uses image_mobile_id.
        // Keep mobile_image fallback for backward compatibility.
        const mobileImage = banner.image_mobile || banner.mobile_image;
        return {
          status: banner.status ?? true,
          sort_order: Number.isInteger(banner.sort_order) ? banner.sort_order : index + 1,
          image_url: banner.image?.original_url || banner.image_url || "",
          image_id: banner.image_id || banner.image?.id || "",
          image_mobile_url:
            mobileImage?.url || mobileImage?.original_url || banner.image_mobile_url || "",
          image_mobile_id: banner.image_mobile_id || mobileImage?.id || "",
          redirect_link: {
            link: banner.redirect_link?.link || banner.redirect_link?.value || "",
            link_type: banner.redirect_link?.link_type || banner.redirect_link?.type || "collection",
          },
        };
      })
      .filter((banner) => banner.image_url);
    values["options"]["home_banner"] = { banners: homeBannerArray };

    const highlightSectionsArray = (values["options"]["home_highlight_sections"]?.sections || [])
      .map((section) => ({
        status: section.status ?? true,
        subtitle: section.subtitle || "",
        title: section.title || "",
        description: section.description || "",
        button_text: section.button_text || "",
        image_url: section.image?.original_url || section.image_url || "",
        image_id: section.image?.id || section.image_id || "",
        redirect_link: {
          link: section.redirect_link?.link || section.redirect_link?.value || "",
          link_type: section.redirect_link?.link_type || "collection",
        },
      }));
    values["options"]["home_highlight_sections"] = { sections: highlightSectionsArray };

    const homeCategories = values["options"]["home_categories"] || {};
    const normalizedHomeSectionsRaw = (homeCategories.sections || []).map((section, index) => ({
      id: section?.id || `sec-${index + 1}`,
      enabled: section?.enabled === undefined ? true : Boolean(section.enabled),
      title: section?.title || "",
      title_ar: section?.title_ar || "",
      description: section?.description || "",
      description_ar: section?.description_ar || "",
      items: Array.isArray(section?.items) ? section.items : [],
    }));
    // ThemeOptionInitialValue seeds an untouched placeholder section (blank title, no
    // items) whenever no sections exist yet, so a fresh/unused Homepage Categories tab
    // always looks "populated". Drop sections nobody has actually filled in before
    // validating/saving, so they don't block unrelated settings elsewhere in the form.
    const normalizedHomeSections = normalizedHomeSectionsRaw.filter(
      (section) => section.title.trim() || section.title_ar.trim() || section.items.length > 0
    );
    // These fields only matter once the admin has actually configured a homepage
    // categories section; the storefront already falls back to default copy when
    // headline is blank, so an empty/unused Homepage Categories tab shouldn't block
    // saving unrelated settings elsewhere in the form.
    const usingHomeCategories = normalizedHomeSections.length > 0;
    const missingHeadline = usingHomeCategories && !(homeCategories.headline || "").trim();
    const missingHeadlineAr = usingHomeCategories && !(homeCategories.headline_ar || "").trim();
    const missingSectionTitle = normalizedHomeSections.some((section) => !(section.title || "").trim());
    const missingSectionTitleAr = normalizedHomeSections.some((section) => !(section.title_ar || "").trim());

    if (missingHeadline || missingHeadlineAr || missingSectionTitle || missingSectionTitleAr) {
      if (typeof window !== "undefined") {
        window.alert(
          "Please fill required fields: Sections Headline, Arabic Sections Headline, Section Title, and Arabic Section Title."
        );
      }
      return;
    }

    values["options"]["home_categories"] = {
      ...homeCategories,
      headline: homeCategories.headline || "",
      subheadline: homeCategories.subheadline || "",
      headline_ar: homeCategories.headline_ar || "",
      subheadline_ar: homeCategories.subheadline_ar || "",
      sections: normalizedHomeSections,
    };

    values["options"]["home_latest_products"] = {
      ...values["options"]["home_latest_products"],
      product_ids: normalizeIdList(values["options"]["home_latest_products"]["product_ids"], 8),
    };

    values["options"]["home_best_seller_products"] = {
      ...values["options"]["home_best_seller_products"],
      product_ids: normalizeIdList(values["options"]["home_best_seller_products"]["product_ids"], 8),
    };

    const normalizedMatchiItems = normalizeMatchiItems(
      values["options"]["matchi_matchi"]["items"],
      24
    );
    const normalizedMatchiPairImages = normalizeMatchiPairImages(
      values["options"]["matchi_matchi"]["pair_images"],
      normalizedMatchiItems
    );
    const requiredMatchiPairImages = buildRequiredMatchiPairImages(
      normalizedMatchiItems,
      values["options"]["matchi_matchi"]["pair_images"]
    );
    const hasIncompleteMatchiPair = normalizedMatchiItems.length % 2 !== 0;
    const invalidMatchiPairs = requiredMatchiPairImages.filter((pairImage) => {
      const firstItem = normalizedMatchiItems.find(
        (item) => String(item?.id) === String(pairImage?.first_item_id)
      );
      const secondItem = normalizedMatchiItems.find(
        (item) => String(item?.id) === String(pairImage?.second_item_id)
      );

      if (!firstItem || !secondItem) return true;
      if (!firstItem?.color_attribute_value_id || !secondItem?.color_attribute_value_id) return true;

      const pairTypes = [firstItem?.match_type, secondItem?.match_type];
      return !pairTypes.includes("bag") || !pairTypes.includes("shoes");
    });
    const missingMatchiPairImages = requiredMatchiPairImages.filter(
      (pairImage) => !(pairImage?.preview_image_id || pairImage?.preview_image_url)
    );

    if (hasIncompleteMatchiPair) {
      if (typeof window !== "undefined") {
        window.alert(
          "Each Matchi pair group needs exactly two products. Please make sure the total selected items count is even before saving."
        );
      }
      return;
    }

    if (invalidMatchiPairs.length > 0) {
      if (typeof window !== "undefined") {
        window.alert(
          "Every Matchi pair group must include one bag item and one shoes item, and both products must have a selected color."
        );
      }
      return;
    }

    if (requiredMatchiPairImages.length > 0 && missingMatchiPairImages.length > 0) {
      if (typeof window !== "undefined") {
        window.alert(
          `Please upload styled pair images for all Matchi pair groups before saving. Missing images: ${missingMatchiPairImages.length}.`
        );
      }
      return;
    }

    const invalidPairPrices = requiredMatchiPairImages.some((pairImage) => {
      const originalPrice = Number(pairImage?.original_price || 0);
      const salePrice = Number(pairImage?.sale_price || 0);

      if (salePrice > 0 && originalPrice <= 0) return true;
      if (salePrice > 0 && originalPrice > 0 && salePrice >= originalPrice) return true;
      return false;
    });

    if (invalidPairPrices) {
      if (typeof window !== "undefined") {
        window.alert(
          "For Matchi pair pricing, the original price must be greater than zero when a sale price is used, and the sale price must be lower than the original price."
        );
      }
      return;
    }

    values["options"]["matchi_matchi"] = {
      ...values["options"]["matchi_matchi"],
      enabled: Boolean(values["options"]["matchi_matchi"]["enabled"]),
      title: values["options"]["matchi_matchi"]["title"] || "",
      title_ar: values["options"]["matchi_matchi"]["title_ar"] || "",
      subtitle: values["options"]["matchi_matchi"]["subtitle"] || "",
      subtitle_ar: values["options"]["matchi_matchi"]["subtitle_ar"] || "",
      description: values["options"]["matchi_matchi"]["description"] || "",
      description_ar: values["options"]["matchi_matchi"]["description_ar"] || "",
      items: normalizedMatchiItems,
      product_ids: normalizedMatchiItems.map((item) => item.product_id),
      pair_images:
        requiredMatchiPairImages.length > 0
          ? requiredMatchiPairImages
          : normalizedMatchiPairImages,
    };

    values["_method"] = "put";

    // Submit the data
    mutate(values);

  } catch (error) {
    console.error("Error in ThemeOptionSubmit:", error);
  }
};

export default ThemeOptionSubmit;
