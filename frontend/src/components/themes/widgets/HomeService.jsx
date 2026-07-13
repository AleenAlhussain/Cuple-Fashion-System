import { storageURL } from "@/utils/constants";
import { filterRenderableServiceBanners } from "@/utils/serviceBanners";
import { getSectionLinkProps } from "@/utils/sectionLink";
import Image from "next/image";
import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Row } from "reactstrap";

const resolveServiceImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (typeof imageUrl === "string" && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
    return imageUrl;
  }
  if (typeof imageUrl === "string" && imageUrl.startsWith("/assets/")) {
    return imageUrl;
  }
  return storageURL + imageUrl;
};

const HomeServices = ({ services, type }) => {
  const { i18n } = useTranslation("common");
  const isAr = i18n.language === "ar";
  const [filteredServices, setFilteredServices] = useState([]);

  useEffect(() => {
    setFilteredServices(filterRenderableServiceBanners(services));
  }, [services]);
  return (
    <>
      <Row className="g-sm-4 g-3 trust-row">
        {filteredServices.map((service, index) => {
          const linkProps = service?.redirect_link?.link ? getSectionLinkProps(service.redirect_link) : null;
          const CardWrapper = linkProps ? Link : Fragment;
          const wrapperProps = linkProps ? { href: linkProps.href, target: linkProps.target, rel: linkProps.rel, className: "service-link" } : {};

          return (
            <Fragment key={index}>
              {type === "simple" ? (
                <div className={` ${filteredServices.length === 4 ? "col-xl-3 col-md-6" : filteredServices.length === 3 ? "col-md-4" : filteredServices.length === 2 ? "col-md-6" : "col-12"}`}>
                  <CardWrapper {...wrapperProps}>
                    <div className="service-block1">
                      {resolveServiceImageUrl(service?.image_url) && (
                        <Image height={59} width={59} src={resolveServiceImageUrl(service?.image_url)} alt={(isAr && service.title_ar) || service.title} />
                      )}
                      <div className="service-skeleton-img"></div>
                      <h4>{(isAr && service.title_ar) || service.title}</h4>
                      <h4 className="skeleton-content-h4"></h4>
                      <p>{(isAr && service.description_ar) || service.description}</p>
                      <p className="skeleton-content-p"></p>
                    </div>
                  </CardWrapper>
                </div>
              ) : (
                <div className={`${filteredServices.length === 4 ? "col-xl-3 col-sm-6" : filteredServices.length === 3 ? "col-lg-4 col-sm-6" : filteredServices.length === 2 ? "col-sm-6" : "col-12"}`}>
                  <CardWrapper {...wrapperProps}>
                    <div className="service-block">
                      <div className="media">
                        {resolveServiceImageUrl(service?.image_url) && (
                          <Image height={59} width={59} src={resolveServiceImageUrl(service?.image_url)} alt={(isAr && service.title_ar) || service.title} />
                        )}
                        <div className="skeleton-img-box"></div>
                        <div className="media-body">
                          <h4>{(isAr && service.title_ar) || service.title}</h4>
                          <h4 className="skeleton-content-h4"></h4>
                          <p>{(isAr && service.description_ar) || service.description}</p>
                          <p className="skeleton-content-p"></p>
                        </div>
                      </div>
                    </div>
                  </CardWrapper>
                </div>
              )}
            </Fragment>
          );
        })}
      </Row>

      {!filteredServices.length && <app-no-data className="no-data-added" text="no_service" />}
    </>
  );
};

export default HomeServices;
