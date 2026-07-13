import { getServerTranslations } from "@/app/i18n/server";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { Col } from "reactstrap";

const stores = [
  { name: "Cuple - Al Manar Mall", nameAr: "كابلي - المنار مول", slug: "al-manar-mall" },
  { name: "Cuple - Rahmaniah Mall", nameAr: "كابلي - الرحمانية مول", slug: "rahmaniah-mall" },
  { name: "Cuple - 06 Mall", nameAr: "كابلي - 06 مول", slug: "06-mall" },
  { name: "Cuple - Arabian Centre", nameAr: "كابلي - أرابيان سنتر", slug: "arabian-centre" },
  { name: "Cuple - Al Ghurair Centre", nameAr: "كابلي - الغرير سنتر", slug: "al-ghurair-centre" },
  { name: "Cuple - DFC Mall", nameAr: "كابلي - دبي فستيفال سيتي مول", slug: "dfc-mall" },
  { name: "Cuple - Dubai Hills Mall", nameAr: "كابلي - دبي هيلز مول", slug: "dubai-hills-mall" },
  { name: "Cuple - Outlet Mall", nameAr: "كابلي - أوتلت مول", slug: "outlet-mall" },
  { name: "Cuple - Bawabat Al Sharq Mall", nameAr: "كابلي - بوابة الشرق مول", slug: "bawabat-al-sharq-mall" },
  { name: "Cuple - Deerfield's Mall", nameAr: "كابلي - ديرفيلدز مول", slug: "deerfields-mall" },
  { name: "Cuple - Delma Mall", nameAr: "كابلي - دلما مول", slug: "delma-mall" },
  { name: "Cuple - Bawadi Mall", nameAr: "كابلي - بوادي مول", slug: "bawadi-mall" },
  { name: "Cuple - Yas Mall", nameAr: "كابلي - ياس مول", slug: "yas-mall" },
  { name: "Cuple - Makani Zakher Mall", nameAr: "كابلي - مكاني زاخر", slug: "makani-zakher" },
  { name: "Cuple - Makani Shamkha Mall", nameAr: "كابلي - مكاني الشامخة", slug: "makani-shamkha" },
];

const StoreLocationPage = async () => {
  const { t, i18n } = await getServerTranslations("common");
  const isArabic = i18n.language === "ar";

  return (
    <>
      <Breadcrumbs title={"Store Locations"} subNavigation={[{ name: "Store Locations" }]} />
      <WrapperComponent classes={{ sectionClass: "section-b-space", fluidClass: "container" }} customCol={true}>
        <div className="text-center mb-5">
          <h2 className="mb-2">{t("CupleStoreLocations")}</h2>
          <p className="text-muted">{t("StoreLocationsDescription")}</p>
        </div>
        <div className="row g-4">
          {stores.map((store) => (
            <Col key={store.slug} md={6} lg={4}>
              <div className="store-card p-0 h-100 border border-light rounded-4 shadow-sm overflow-hidden">
                <div className="map-holder">
                  <iframe
                    title={isArabic ? store.nameAr : store.name}
                    loading="lazy"
                    allowFullScreen
                    style={{ border: 0, width: "100%", height: "220px" }}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(store.name)}&output=embed`}
                  />
                </div>
                <div className="p-4 text-center">
                  <h5 className="mb-3">{isArabic ? store.nameAr : store.name}</h5>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-solid w-100 mt-2"
                  >
                    {t("ViewOnMap")}
                  </a>
                </div>
              </div>
            </Col>
          ))}
        </div>
      </WrapperComponent>
    </>
  );
};

export default StoreLocationPage;
