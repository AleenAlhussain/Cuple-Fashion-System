const normalizeHomeBanners = (banners = []) => {
  const list = Array.isArray(banners) ? banners : [];
  const sorted = [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted.map((banner, index) => {
    const mobileImage = banner.mobile_image
      ? banner.mobile_image
      : banner.image_mobile_url
        ? { original_url: banner.image_mobile_url, id: banner.image_mobile_id ?? null }
        : null;

    return {
      status: banner.status ?? true,
      sort_order: Number.isInteger(banner.sort_order) ? banner.sort_order : index + 1,
      redirect_link: {
        link: banner.redirect_link?.link || banner.redirect_link?.value || "",
        link_type: banner.redirect_link?.link_type || "collection",
      },
      image: banner.image
        ? banner.image
        : banner.image_url
          ? { original_url: banner.image_url, id: banner.image_id ?? null }
          : null,
      image_url: banner.image_url || banner.image?.original_url || "",
      image_id: banner.image_id || banner.image?.id || null,
      mobile_image: mobileImage,
      image_mobile: mobileImage,
      image_mobile_url: banner.image_mobile_url || mobileImage?.original_url || "",
      image_mobile_id: banner.image_mobile_id || mobileImage?.id || null,
    };
  });
};

const normalizeMatchiMatchiItems = (items, legacyProductIds = []) => {
  const sourceItems = Array.isArray(items) ? items : legacyProductIds;
  const seenProductIds = new Set();

  return (Array.isArray(sourceItems) ? sourceItems : [])
    .map((item, index) => {
      const isPrimitive = typeof item === "number" || typeof item === "string";
      const productId = Number(
        isPrimitive ? item : item?.product_id ?? item?.productId ?? item?.id
      );

      if (!Number.isInteger(productId) || productId <= 0 || seenProductIds.has(productId)) {
        return null;
      }

      seenProductIds.add(productId);

      return {
        id: isPrimitive ? `matchi-${productId}-${index + 1}` : item?.id || `matchi-${productId}-${index + 1}`,
        product_id: productId,
        match_type: isPrimitive
          ? ""
          : item?.match_type ??
            item?.matchType ??
            (item?.preview_zone === "hand"
              ? "bag"
              : item?.preview_zone === "foot"
              ? "shoes"
              : ""),
        color_attribute_value_id: isPrimitive
          ? null
          : item?.color_attribute_value_id ?? item?.colorAttributeValueId ?? null,
        color_name: isPrimitive ? "" : item?.color_name ?? item?.color ?? "",
        color_name_ar: isPrimitive ? "" : item?.color_name_ar ?? item?.colorAr ?? "",
        color_hex: isPrimitive ? "" : item?.color_hex ?? item?.color_code ?? "",
        overlay_image_id: isPrimitive
          ? null
          : item?.overlay_image_id ?? item?.overlayImageId ?? null,
        overlay_image_url: isPrimitive
          ? ""
          : item?.overlay_image_url ?? item?.overlayImageUrl ?? "",
        preview_zone: isPrimitive ? "auto" : item?.preview_zone ?? item?.previewZone ?? "auto",
        overlay_scale: isPrimitive
          ? 100
          : Number(item?.overlay_scale ?? item?.overlayScale ?? 100) || 100,
        overlay_offset_x: isPrimitive
          ? 0
          : Number(item?.overlay_offset_x ?? item?.overlayOffsetX ?? 0) || 0,
        overlay_offset_y: isPrimitive
          ? 0
          : Number(item?.overlay_offset_y ?? item?.overlayOffsetY ?? 0) || 0,
        overlay_rotation: isPrimitive
          ? 0
          : Number(item?.overlay_rotation ?? item?.overlayRotation ?? 0) || 0,
      };
    })
    .filter(Boolean)
    .slice(0, 24);
};

const normalizeMatchiPairImages = (pairImages, availableItems = []) => {
  const validItemIds = new Set((Array.isArray(availableItems) ? availableItems : []).map((item) => String(item?.id)));
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
        (validItemIds.size && (!validItemIds.has(firstItemId) || !validItemIds.has(secondItemId))) ||
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
        preview_image_id:
          pairImage?.preview_image_id ?? pairImage?.previewImageId ?? null,
        preview_image_url:
          pairImage?.preview_image_url ?? pairImage?.previewImageUrl ?? "",
        title: pairImage?.title ?? "",
        title_ar: pairImage?.title_ar ?? pairImage?.titleAr ?? "",
        description: pairImage?.description ?? "",
        description_ar:
          pairImage?.description_ar ?? pairImage?.descriptionAr ?? "",
        original_price:
          pairImage?.original_price ?? pairImage?.originalPrice ?? "",
        sale_price:
          pairImage?.sale_price ?? pairImage?.salePrice ?? "",
      };
    })
    .filter(Boolean);
};
const normalizeHighlightSections = (sections) => {

  const list = Array.isArray(sections) ? sections : [];

  return list.map((section, index) => {
    const normalizedImage = section?.image
      ? section.image
      : section?.image_url
        ? { original_url: section.image_url, id: section.image_id ?? null }
        : null;

    return {
      id: section?.id || `highlight-${index + 1}`,
      status: section?.status ?? true,
      subtitle: section?.subtitle || "",
      title: section?.title || "",
      description: section?.description || "",
      button_text: section?.button_text || "",
      redirect_link: {
        link: section?.redirect_link?.link || section?.redirect_link?.value || "",
        link_type: section?.redirect_link?.link_type || "collection",
      },
      image: normalizedImage,
      image_url: section?.image_url || normalizedImage?.original_url || "",
      image_id: section?.image_id || normalizedImage?.id || null,
    };
  });
};

const toMediaObject = (value) =>
  value &&
  typeof value === "object" &&
  (value.original_url || value.url || value.path || value.file_name || value.name)
    ? value
    : "";

const DEFAULT_TOPBAR_PROMO_EN = "Free Shipping on orders above 299 AED";
const DEFAULT_TOPBAR_PROMO_AR = "شحن مجاني للطلبات التي تزيد عن 299 درهم";
const DEFAULT_PRODUCT_SERVICE_BANNERS = [
  {
    title: "Free Shipping",
    title_ar: "شحن مجاني",
    status: true,
    image_url: "/assets/images/theme/fashion_one/Free shipping.webp",
    description: "Free Shipping on orders above 299 AED",
    description_ar: "شحن مجاني للطلبات فوق 299 درهم",
  },
  {
    title: "Free Return",
    title_ar: "إرجاع مجاني",
    status: true,
    image_url: "/assets/images/theme/fashion_one/return.webp",
    description: "We accept returns within 7 days. A 30 AED service fee applies for returns due to customer reasons. Returns are free of charge if the issue is caused by us.",
    description_ar: "نقبل الإرجاع خلال 7 أيام. رسوم خدمة 30 درهم تُطبق على الإرجاع لأسباب تخص العميل. الإرجاع مجاني إذا كان السبب من طرفنا.",
  },
  {
    title: "Exchange",
    title_ar: "استبدال",
    status: true,
    image_url: "/assets/images/theme/fashion_one/exchange.webp",
    description: "We accept exchange within 14 days of receipt. A 30 AED service fee applies for exchanges requested by the customer. Exchanges are free of charge if the issue is from our side.",
    description_ar: "نقبل الاستبدال خلال 14 يوماً من الاستلام. رسوم خدمة 30 درهم تُطبق على الاستبدال بطلب من العميل. الاستبدال مجاني إذا كان الخطأ من طرفنا.",
  },
];

const DEFAULT_CONTACT_TITLE_EN = "Get In Touch";
const DEFAULT_CONTACT_TITLE_AR = "تواصل معنا";
const DEFAULT_CONTACT_DESCRIPTION_EN =
  "We're here to help! Reach out to us with any questions, feedback, or inquiries, and we'll get back to you as soon as possible.";
const DEFAULT_CONTACT_DESCRIPTION_AR =
  "نحن هنا لمساعدتك. تواصل معنا لأي استفسار أو ملاحظة أو طلب، وسنرد عليك في أقرب وقت ممكن.";
const CONTACT_SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "snapchat",
  "twitter",
  "pinterest",
];
const DEFAULT_CONTACT_DETAILS = {
  detail_1: {
    label: "Phone",
    label_ar: "الهاتف",
    text: "",
    text_ar: "",
    icon: "ri-phone-fill",
    icon_image_url: "",
  },
  detail_2: {
    label: "Email",
    label_ar: "البريد الإلكتروني",
    text: "",
    text_ar: "",
    icon: "ri-mail-fill",
    icon_image_url: "",
  },
  detail_3: {
    label: "Address",
    label_ar: "العنوان",
    text: "",
    text_ar: "",
    icon: "ri-map-pin-fill",
    icon_image_url: "",
  },
};

const normalizeContactDetail = (detail, defaults) => ({
  ...defaults,
  ...(detail || {}),
  label: detail?.label ?? defaults?.label ?? "",
  label_ar: detail?.label_ar ?? defaults?.label_ar ?? "",
  text: detail?.text ?? defaults?.text ?? "",
  text_ar: detail?.text_ar ?? defaults?.text_ar ?? "",
  icon: detail?.icon ?? defaults?.icon ?? "",
  icon_image_url:
    detail?.icon_image_url ??
    detail?.iconImageUrl ??
    detail?.icon_image ??
    defaults?.icon_image_url ??
    "",
});


export const ThemeOptionInitialValue = (NewSettingsData) => {
  const normalizedHomeBanners = normalizeHomeBanners(NewSettingsData?.home_banner?.banners);
  const normalizedHighlightSections = normalizeHighlightSections(
    NewSettingsData?.home_highlight_sections?.sections
  );
  const normalizedMatchiItems = normalizeMatchiMatchiItems(
    NewSettingsData?.matchi_matchi?.items,
    NewSettingsData?.matchi_matchi?.product_ids
  );
  let obj = {};
  NewSettingsData?.about_us?.about?.futures?.length > 0 &&
    NewSettingsData?.about_us?.about?.futures?.forEach((elem, index) => {
      elem.icon ? (obj[`futureIcons${index}`] = { original_url: elem.icon }) : "";
      return obj;
    });
  let obj1 = {};
  NewSettingsData?.about_us?.clients?.content?.length > 0 &&
    NewSettingsData?.about_us?.clients?.content?.forEach((elem, index) => {
      elem.icon ? (obj1[`clientContentImage${index}`] = { original_url: elem.icon }) : "";
      return obj1;
    });
  let obj2 = {};
  NewSettingsData?.about_us?.team?.members?.length > 0 &&
    NewSettingsData?.about_us?.team?.members?.forEach((elem, index) => {
      elem.profile_image_url ? (obj2[`teamContentImage${index}`] = { original_url: elem.profile_image_url }) : "";
      return obj2;
    });
  let obj3 = {};
  NewSettingsData?.about_us?.testimonial?.reviews?.length > 0 &&
    NewSettingsData?.about_us?.testimonial?.reviews?.forEach((elem, index) => {
      elem.profile_image_url ? (obj3[`testimonialReviewImage${index}`] = { original_url: elem.profile_image_url }) : "";
      return obj3;
    });
  const productServiceBanners = Array.isArray(NewSettingsData?.product?.services?.banners) && NewSettingsData.product.services.banners.length
    ? NewSettingsData.product.services.banners
    : DEFAULT_PRODUCT_SERVICE_BANNERS;
  let obj4 = {};
  productServiceBanners.forEach((elem, index) => {
    elem?.image_url ? (obj4[`productServiceImage${index}`] = { original_url: elem.image_url }) : "";
    return obj4;
  });
  const footerEmail = NewSettingsData?.footer?.about_email || NewSettingsData?.footer?.support_email || "";
  const footerHasSocialLinks = CONTACT_SOCIAL_KEYS.some((key) =>
    Boolean(NewSettingsData?.footer?.[key])
  );
  const normalizedContactUs = {
    ...(NewSettingsData?.contact_us || {}),
    title: NewSettingsData?.contact_us?.title ?? DEFAULT_CONTACT_TITLE_EN,
    title_ar: NewSettingsData?.contact_us?.title_ar ?? DEFAULT_CONTACT_TITLE_AR,
    description:
      NewSettingsData?.contact_us?.description ?? DEFAULT_CONTACT_DESCRIPTION_EN,
    description_ar:
      NewSettingsData?.contact_us?.description_ar ?? DEFAULT_CONTACT_DESCRIPTION_AR,
    social_media_enable:
      NewSettingsData?.contact_us?.social_media_enable ??
      NewSettingsData?.footer?.social_media_enable ??
      footerHasSocialLinks,
    facebook: NewSettingsData?.contact_us?.facebook ?? NewSettingsData?.footer?.facebook ?? "",
    instagram:
      NewSettingsData?.contact_us?.instagram ?? NewSettingsData?.footer?.instagram ?? "",
    tiktok: NewSettingsData?.contact_us?.tiktok ?? NewSettingsData?.footer?.tiktok ?? "",
    snapchat:
      NewSettingsData?.contact_us?.snapchat ?? NewSettingsData?.footer?.snapchat ?? "",
    twitter: NewSettingsData?.contact_us?.twitter ?? NewSettingsData?.footer?.twitter ?? "",
    pinterest:
      NewSettingsData?.contact_us?.pinterest ?? NewSettingsData?.footer?.pinterest ?? "",
    detail_1: normalizeContactDetail(NewSettingsData?.contact_us?.detail_1, {
      ...DEFAULT_CONTACT_DETAILS.detail_1,
      text: NewSettingsData?.footer?.support_number ?? "",
    }),
    detail_2: normalizeContactDetail(NewSettingsData?.contact_us?.detail_2, {
      ...DEFAULT_CONTACT_DETAILS.detail_2,
      text: footerEmail,
    }),
    detail_3: normalizeContactDetail(NewSettingsData?.contact_us?.detail_3, {
      ...DEFAULT_CONTACT_DETAILS.detail_3,
      text: NewSettingsData?.footer?.about_address ?? "",
    }),
  };
  let obj5 = {};
  ["detail_1", "detail_2", "detail_3"].forEach((detailKey, index) => {
    const iconImageUrl = normalizedContactUs?.[detailKey]?.icon_image_url;
    iconImageUrl
      ? (obj5[`contactDetailIcon${index + 1}`] = { original_url: iconImageUrl })
      : "";
    return obj5;
  });
  const mergedOptions = {
    ...NewSettingsData,
    about_us: {
      ...(NewSettingsData?.about_us || {}),
      about: {
        ...(NewSettingsData?.about_us?.about || {}),
        status: NewSettingsData?.about_us?.about?.status ?? true,
        sub_title: NewSettingsData?.about_us?.about?.sub_title ?? "",
        sub_title_ar: NewSettingsData?.about_us?.about?.sub_title_ar ?? "",
        title: NewSettingsData?.about_us?.about?.title ?? "",
        title_ar: NewSettingsData?.about_us?.about?.title_ar ?? "",
        description: NewSettingsData?.about_us?.about?.description ?? "",
        description_ar: NewSettingsData?.about_us?.about?.description_ar ?? "",
        futures: Array.isArray(NewSettingsData?.about_us?.about?.futures)
          ? NewSettingsData.about_us.about.futures.map((future) => ({
              ...future,
              title: future?.title ?? "",
              title_ar: future?.title_ar ?? "",
              description: future?.description ?? "",
              description_ar: future?.description_ar ?? "",
              icon: future?.icon ?? "",
            }))
          : [],
      },
      team: NewSettingsData?.about_us?.team ?? {},
      testimonial: NewSettingsData?.about_us?.testimonial ?? {},
    },
    general: {
      ...(NewSettingsData?.general || {}),
      topbar_promo_text:
        NewSettingsData?.general?.topbar_promo_text ?? DEFAULT_TOPBAR_PROMO_EN,
      topbar_promo_text_ar:
        NewSettingsData?.general?.topbar_promo_text_ar ??
        (NewSettingsData?.general?.topbar_promo_text ? NewSettingsData.general.topbar_promo_text : DEFAULT_TOPBAR_PROMO_AR),
    },
    collection: {
      collection_type: NewSettingsData?.collection?.collection_type ?? "single",
      collection_name: NewSettingsData?.collection?.collection_name ?? "",
      collection_link: NewSettingsData?.collection?.collection_link ?? "",
      collection_image_url: NewSettingsData?.collection?.collection_image_url ?? "",
      subcategory_sections: Array.isArray(NewSettingsData?.collection?.subcategory_sections)
        ? NewSettingsData.collection.subcategory_sections.map((section, index) => ({
            ...section,
            id: section?.id || `sec-${index + 1}`,
            parent_category_id: section?.parent_category_id ?? null,
            enabled: section?.enabled ?? true,
            title: section?.title ?? "",
            title_ar: section?.title_ar ?? "",
            description: section?.description ?? "",
            description_ar: section?.description_ar ?? "",
            items: Array.isArray(section?.items) ? section.items : [],
          }))
        : [],
    },
    product: {
      ...(NewSettingsData?.product || {}),
      shipping_and_return: NewSettingsData?.product?.shipping_and_return ?? "",
      shipping_and_return_ar: NewSettingsData?.product?.shipping_and_return_ar ?? "",
      services: {
        banners: productServiceBanners.map((banner) => ({
          ...banner,
          title: banner?.title ?? "",
          title_ar: banner?.title_ar ?? "",
          description: banner?.description ?? "",
          description_ar: banner?.description_ar ?? "",
          image_url: banner?.image_url ?? "",
          status: banner?.status ?? true,
          redirect_link: {
            link: banner?.redirect_link?.link || banner?.redirect_link?.value || "",
            link_type: banner?.redirect_link?.link_type || "page",
          },
        })),
      },
    },
    home_banner: {
      banners: normalizedHomeBanners,
    },
    home_highlight_sections: {
      sections: normalizedHighlightSections,
    },
    // Ensure home_categories is always present with defaults
    home_categories: {
      // Global headline for ALL sections (NO default text)
      headline: NewSettingsData?.home_categories?.headline ?? "",
      subheadline: NewSettingsData?.home_categories?.subheadline ?? "",
      headline_ar: NewSettingsData?.home_categories?.headline_ar ?? "",
      subheadline_ar: NewSettingsData?.home_categories?.subheadline_ar ?? "",

      sections: Array.isArray(NewSettingsData?.home_categories?.sections)
        ? NewSettingsData.home_categories.sections.map((section, index) => ({
            id: section?.id || `sec-${index + 1}`,
            enabled: section?.enabled ?? true,
            title: section?.title ?? "",
            title_ar: section?.title_ar ?? "",
            description: section?.description ?? "",
            description_ar: section?.description_ar ?? "",
            items: Array.isArray(section?.items) ? section.items : [],
          }))
        : [
          {
            id: "sec-1",
            enabled: NewSettingsData?.home_categories?.enabled ?? true,
            title: NewSettingsData?.home_categories?.title ?? "",
            title_ar: NewSettingsData?.home_categories?.title_ar ?? "",
            description: "",
            description_ar: "",
            items: NewSettingsData?.home_categories?.items ?? [],
          },
        ],
    },
    home_latest_products: {
      product_ids: Array.isArray(NewSettingsData?.home_latest_products?.product_ids)
        ? NewSettingsData.home_latest_products.product_ids
        : [],
    },
    home_best_seller_products: {
      product_ids: Array.isArray(NewSettingsData?.home_best_seller_products?.product_ids)
        ? NewSettingsData.home_best_seller_products.product_ids
        : [],
    },
    matchi_matchi: {
      enabled: NewSettingsData?.matchi_matchi?.enabled ?? false,
      title: NewSettingsData?.matchi_matchi?.title ?? "Matchi Matchi",
      title_ar: NewSettingsData?.matchi_matchi?.title_ar ?? "ماتشي ماتشي",
      subtitle:
        NewSettingsData?.matchi_matchi?.subtitle ??
        "Pick two favorites and preview the perfect pairing.",
      subtitle_ar:
        NewSettingsData?.matchi_matchi?.subtitle_ar ??
        "اختاري قطعتين وشاهدي التناسق بينهما.",
      description:
        NewSettingsData?.matchi_matchi?.description ??
        "Help customers explore curated combinations from your latest bags, shoes, and statement pieces.",
      description_ar:
        NewSettingsData?.matchi_matchi?.description_ar ??
        "ساعدي العملاء على استكشاف تنسيقات مختارة من الحقائب والأحذية والقطع المميزة.",
      items: normalizedMatchiItems,
      product_ids: Array.isArray(NewSettingsData?.matchi_matchi?.product_ids)
        ? NewSettingsData.matchi_matchi.product_ids
        : [],
      pair_images: normalizeMatchiPairImages(
        NewSettingsData?.matchi_matchi?.pair_images,
        normalizedMatchiItems
      ),
    },
    contact_us: normalizedContactUs,


  };

  return {
    options: mergedOptions,

    header_logo_id: NewSettingsData?.logo?.header_logo_id ?? "",
    footer_logo_id: NewSettingsData?.logo?.footer_logo_id ?? "",
    favicon_icon_id: NewSettingsData?.logo?.favicon_icon_id ?? "",
    og_image_id: NewSettingsData?.seo?.og_image_id ?? "",
    header_logo: toMediaObject(NewSettingsData?.logo?.header_logo),
    footer_logo: toMediaObject(NewSettingsData?.logo?.footer_logo),
    favicon_icon: toMediaObject(NewSettingsData?.logo?.favicon_icon),
    og_image: toMediaObject(NewSettingsData?.seo?.og_image),

    authImage: NewSettingsData?.popup?.auth?.image_url ? { original_url: NewSettingsData?.popup?.auth?.image_url } : "",

    paymentOptionImage: NewSettingsData?.footer?.payment_option_image_url ? { original_url: NewSettingsData?.footer?.payment_option_image_url } : "",

    footerImage: NewSettingsData?.footer?.bg_image ? { original_url: NewSettingsData?.product?.footer?.bg_image } : "",
    // Product Layout

    banner_image_url: NewSettingsData?.product?.banner_image_url ? { original_url: NewSettingsData?.product?.banner_image_url } : "",

    safe_checkout_image: NewSettingsData?.product?.safe_checkout_image ? { original_url: NewSettingsData?.product?.safe_checkout_image } : "",

    secure_checkout_image: NewSettingsData?.product?.secure_checkout_image ? { original_url: NewSettingsData?.product?.secure_checkout_image } : "",

    // Collection Layout
    collection_image: NewSettingsData?.collection?.collection_image_url ? { original_url: NewSettingsData?.collection?.collection_image_url } : "",
    FooterSubscribeImage: NewSettingsData?.footer?.bg_image ? { original_url: NewSettingsData?.footer?.bg_image } : "",

    //popup
    newsLetterImage: NewSettingsData?.popup?.news_letter?.image_url ? { original_url: NewSettingsData?.popup?.news_letter?.image_url } : "",
    exitImage: NewSettingsData?.popup?.exit?.image_url ? { original_url: NewSettingsData?.popup?.exit?.image_url } : "",

    // About Us
    content_left_image_url: NewSettingsData?.about_us?.about?.content_left_image_url ? { original_url: NewSettingsData?.about_us?.about?.content_left_image_url } : "",
    content_right_image_url: NewSettingsData?.about_us?.about?.content_right_image_url ? { original_url: NewSettingsData?.about_us?.about?.content_right_image_url } : "",
    ...obj,
    ...obj1,
    ...obj2,
    ...obj3,
    ...obj4,
    ...obj5,

    // Contact Us
    contactUsImage: normalizedContactUs?.imageUrl ? { original_url: normalizedContactUs?.imageUrl } : "",

    // Header
    headerCategories: NewSettingsData?.header?.category_ids || [],

    // Footer
    footer_categories: NewSettingsData?.footer?.footer_categories ? NewSettingsData?.footer?.footer_categories : [],
    useful_link: NewSettingsData?.footer?.useful_link ? NewSettingsData?.footer?.useful_link : [],
    help_center: NewSettingsData?.footer?.help_center ? NewSettingsData?.footer?.help_center : [],
    today_deals: NewSettingsData?.header?.today_deals ? NewSettingsData?.header?.today_deals : [],
  };
};
