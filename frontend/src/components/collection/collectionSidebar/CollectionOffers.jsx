import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AccordionBody, AccordionHeader, AccordionItem, Input, Label } from "reactstrap";
import { useGetActiveOffers } from "@/utils/api";

const CollectionOffers = ({ filter, setFilter, isOffCanvas, targetId = "5" }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation("common");
  const pathname = usePathname();

  const { data: offersResponse, isLoading } = useGetActiveOffers();
  const offers = offersResponse?.data || [];

  if (!isLoading && !offers.length) return null;

  const getOfferLabel = (offer) => {
    if (i18n.language === "ar") {
      return offer.name_ar || offer.name;
    }
    return offer.name;
  };

  const handleSelect = (offer) => {
    if ((offer?.product_count || 0) <= 0) {
      return;
    }

    const offerId = String(offer.id);
    const isDeselect = filter?.offer_id === offerId;
    const offerKey = offer.offer_key ? String(offer.offer_key) : null;
    const promoGroupId =
      Array.isArray(offer.promo_group_ids) && offer.promo_group_ids.length > 0
        ? offer.promo_group_ids.join(",")
        : null;

    setFilter((prev) => ({
      ...prev,
      offer_id: isDeselect ? null : offerId,
      offer_key: isDeselect ? null : offerKey,
      promo_group_id: isDeselect ? null : promoGroupId,
      offer_name: isDeselect ? null : getOfferLabel(offer),
      page: 1,
    }));

    const params = new URLSearchParams(searchParams?.toString());

    if (!isDeselect) {
      params.set("offer_id", offerId);
      if (offerKey) {
        params.set("offer_key", offerKey);
      } else {
        params.delete("offer_key");
      }
      if (promoGroupId) {
        params.set("promo_group_id", promoGroupId);
      } else {
        params.delete("promo_group_id");
      }
    } else {
      params.delete("offer_id");
      params.delete("offer_key");
      params.delete("promo_group_id");
    }
    params.delete("page");

    const queryParams = params.toString();
    router.push(queryParams ? `${pathname}?${queryParams}` : pathname);
  };

  return (
    <AccordionItem className={`open ${isOffCanvas ? "col-lg-3" : ""}`}>
      <AccordionHeader targetId={targetId}>
        <span>{t("SpecialOffers")}</span>
      </AccordionHeader>
      <AccordionBody accordionId={targetId}>
        <div className="custom-sidebar-height">
          <ul className="shop-category-list">
            {isLoading ? (
              <li className="text-muted" style={{ padding: "4px 0" }}>...</li>
            ) : (
              offers.map((offer) => (
                <li key={offer.id}>
                  <div className="form-check collection-filter-checkbox">
                    <Input
                      className="checkbox_animated"
                      type="checkbox"
                      id={`offer-${offer.id}`}
                      checked={filter?.offer_id === String(offer.id)}
                      disabled={(offer?.product_count || 0) <= 0}
                      onChange={() => handleSelect(offer)}
                    />
                    <Label className="form-check-label" htmlFor={`offer-${offer.id}`}>
                      <span className="name">{getOfferLabel(offer)}</span>
                      <span className="text-muted ms-1">({offer?.product_count || 0})</span>
                    </Label>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </AccordionBody>
    </AccordionItem>
  );
};

export default CollectionOffers;
