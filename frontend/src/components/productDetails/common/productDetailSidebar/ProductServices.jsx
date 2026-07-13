import ThemeOptionContext from "@/context/themeOptionsContext";
import { resolveImageUrl } from "@/utils/constants";
import { filterRenderableServiceBanners } from "@/utils/serviceBanners";
import Image from "next/image";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Media } from "reactstrap";

const ProductServices = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";
  const services = filterRenderableServiceBanners(themeOption?.product?.services?.banners);

  return (
    <div className="collection-filter-block">
      <div className="product-service">
        {services.length > 0 &&
          services.map(
            (service, index) => {
              const iconUrl = resolveImageUrl(service?.image_url);
              return (
                <Media key={index}>
                  {iconUrl && (
                    <Image
                      height={40}
                      width={40}
                      src={iconUrl}
                      alt={(isArabic ? service?.title_ar || service?.title : service?.title) || `service${index}`}
                    />
                  )}
                  <Media body>
                    <h4>{isArabic ? service?.title_ar || service?.title : service?.title}</h4>
                    <p>{isArabic ? service?.description_ar || service?.description : service?.description}</p>
                  </Media>
                </Media>
              );
            }
          )}
      </div>
    </div>
  );
};

export default ProductServices;
