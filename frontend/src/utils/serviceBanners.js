const hasText = (value) => typeof value === "string" && value.trim().length > 0;

export const isRenderableServiceBanner = (service) => {
  if (!service?.status) return false;

  return (
    hasText(service?.title) ||
    hasText(service?.title_ar) ||
    hasText(service?.description) ||
    hasText(service?.description_ar) ||
    hasText(service?.image_url)
  );
};

export const filterRenderableServiceBanners = (services) => {
  if (!Array.isArray(services)) return [];
  return services.filter(isRenderableServiceBanner);
};
