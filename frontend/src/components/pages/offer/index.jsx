"use client";
import NoDataFound from "@/components/widgets/NoDataFound";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Btn from "@/elements/buttons/Btn";
import Loader from "@/layout/loader";
import { useGetActiveOffers } from "@/utils/api";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useTranslation } from "react-i18next";
import { Col } from "reactstrap";
import OfferSkeleton from "./OfferSkeleton";

const Offer = () => {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { data: offersResponse, isLoading } = useGetActiveOffers();
  const rawOffers = Array.isArray(offersResponse?.data)
    ? offersResponse.data
    : Array.isArray(offersResponse?.data?.data)
    ? offersResponse.data.data
    : Array.isArray(offersResponse)
    ? offersResponse
    : [];

  const offers = rawOffers.filter((offer) => {
    if (offer?.is_sale_filter) return true;
    if (offer?.rule_type === "cart") return true;
    return (offer?.product_count || 0) > 0;
  });

  const getOfferName = (offer) => {
    if ((i18n.language || "").startsWith("ar")) {
      return offer?.name_ar || offer?.name;
    }
    return offer?.name || offer?.name_ar;
  };

  const getOfferDescription = (offer) => {
    const isArabic = (i18n.language || "").startsWith("ar");
    const localizedMessage = isArabic
      ? offer?.offer_message_ar || offer?.offer_message
      : offer?.offer_message || offer?.offer_message_ar;

    if (localizedMessage) return localizedMessage;

    if (offer?.discount_type === "percentage" && Number(offer?.discount_value) > 0) {
      return `${offer.discount_value}% ${t("Off") || "Off"}`;
    }

    if (
      (offer?.discount_type === "fixed_amount" || offer?.discount_type === "fixed") &&
      Number(offer?.discount_value) > 0
    ) {
      return `${offer.discount_value} AED ${t("Off") || "Off"}`;
    }

    if (offer?.discount_type === "sale") {
      return t("SpecialOffers");
    }

    return t("SpecialOffers");
  };

  const buildOfferUrl = (offer) => {
    if (offer?.rule_type === "cart" && (!offer?.promo_group_ids || offer.promo_group_ids.length === 0)) {
      return "/shop";
    }
    const params = new URLSearchParams();
    const offerId = String(offer?.id ?? "");
    const offerKey = String(offer?.offer_key ?? offerId);
    const isNumericOfferId = /^\d+$/.test(offerId);

    if (isNumericOfferId) {
      params.set("offer_id", offerId);
    }

    if (offerKey) {
      params.set("offer_key", offerKey);
    }

    if (Array.isArray(offer?.promo_group_ids) && offer.promo_group_ids.length > 0) {
      params.set("promo_group_id", offer.promo_group_ids.join(","));
    }

    return `/shop?${params.toString()}`;
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <Breadcrumbs title={t("Offers")} subNavigation={[{ name: t("Offers") }]} />
      {isLoading ? (
        <OfferSkeleton />
      ) : (
        <WrapperComponent
          classes={{
            sectionClass: "section-b-space section-t-space offer-section",
            row: "g-md-4 g-3",
            fluidClass: "container",
          }}
          customCol={true}
        >
          {offers?.length ? (
            offers?.map((offer, i) => (
              <Col lg={4} sm={6} key={i}>
                <div className="coupon-box">
                  <div className="coupon-name">
                    <div className="card-name">
                      <div>
                        <h5 className="fw-semibold dark-text">{getOfferName(offer)}</h5>
                      </div>
                    </div>
                  </div>
                  <div className="coupon-content">
                    <p className="p-0">{getOfferDescription(offer)}</p>
                    <div className="coupon-apply">
                      <h6 className="coupon-code success-color">
                        {offer?.rule_type === "cart"
                          ? (t("CartOffer") || "Cart Offer")
                          : `${offer?.product_count || 0} ${t("Products")}`}
                      </h6>
                      <Btn
                        color="transparent"
                        className="theme-btn border-btn copy-btn mt-0"
                        onClick={() => router.push(buildOfferUrl(offer))}
                      >
                        {t("ShopNow")}
                      </Btn>
                    </div>
                  </div>
                </div>
              </Col>
            ))
          ) : (
            <NoDataFound
              customClass="no-data-added"
              title="No Offers Found"
              imageUrl={"/assets/svg/empty-items.svg"}
              description="I regret to inform you that the offer is currently unavailable."
              height="300"
              width="300"
            />
          )}
        </WrapperComponent>
      )}
    </>
  );
};

export default Offer;
