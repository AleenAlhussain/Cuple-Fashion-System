import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import { storageURL } from "@/utils/constants";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiFilterFill } from "react-icons/ri";
import { Col, Row } from "reactstrap";
import CollectionSidebar from "../collectionSidebar";
import CollectionProducts from "./CollectionProducts";
import FilterBtn from "./FilterBtn";
import FilterPaginate from "./FilterPaginate";
import FilterSort from "./FilterSort";
import GridBox from "./GridBox";
import OfferBanner from "./OfferBanner";
import PopUpSidebar from "./PopUpSidebar";

const MainCollection = ({
  filter,
  setFilter,
  isBanner,
  isOffcanvas,
  classicStoreCard,
  initialGrid = 3,
  noSidebar,
  sellerClass,
  sidebarPopUp,
  infiniteScroll,
  categorySlug,
  noSort,
  noPagination,
}) => {
  const [grid, setGrid] = useState(initialGrid);
  const { themeOption, setCollectionMobile } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  const [layout] = useCustomSearchParams(["layout"]);
  const collectionBannerUrl = useMemo(() => {
    const fallback =
      themeOption?.collection?.collection_banner_image_url ||
      themeOption?.collection?.collection_image_url;
    if (!fallback) return null;
    if (
      typeof fallback === "string" &&
      (fallback.startsWith("http://") || fallback.startsWith("https://"))
    ) {
      return fallback;
    }
    if (typeof fallback === "string" && fallback.startsWith("/assets/")) {
      return encodeURI(fallback);
    }
    return encodeURI(`${storageURL}${fallback}`);
  }, [
    themeOption?.collection?.collection_banner_image_url,
    themeOption?.collection?.collection_image_url,
  ]);

  useEffect(() => {
    if (layout?.layout == "collection_2_grid") {
      setGrid(2);
    } else if (layout?.layout == "collection_3_grid") {
      setGrid(3);
    } else if (layout?.layout == "collection_4_grid") {
      setGrid(4);
    } else if (layout?.layout == "collection_5_grid") {
      setGrid(5);
    } else if (layout?.layout == "collection_list_view") {
      setGrid("list");
    }
  }, [layout]);
  return (
    <div
      className={`collection-content ${
        noSidebar ? "col-12" : "col-xl-9 col-lg-8"
      }`}
    >
      <div className="page-main-content">
        <Row>
          <Col xs="12">
            {isBanner && collectionBannerUrl && (
              <div className="top-banner-wrapper">
                <OfferBanner
                  classes={{
                    customHoverClass: "banner-contain hover-effect mb-4",
                  }}
                  imgUrl={collectionBannerUrl}
                />{" "}
              </div>
            )}
            <div className="collection-product-wrapper">
              <div className="product-top-filter">
                {!isOffcanvas && !sidebarPopUp && (
                  <Btn
                    color="transparent"
                    className="filter-main-btn "
                    onClick={() => setCollectionMobile(true)}
                  >
                    <RiFilterFill /> {t("Filter")}
                  </Btn>
                )}
                <Row>
                  <Col>
                    <div
                      className={`${
                        sidebarPopUp ? "popup-filter" : "product-filter-content"
                      }`}
                    >
                      <div className="dropdown-box-group">
                        {isOffcanvas && <FilterBtn />}
                        {sidebarPopUp && (
                          <PopUpSidebar filter={filter} setFilter={setFilter} />
                        )}
                        {!noSort && (
                          <FilterSort filter={filter} setFilter={setFilter} />
                        )}
                        {!noPagination && (
                          <FilterPaginate
                            filter={filter}
                            setFilter={setFilter}
                          />
                        )}
                      </div>
                      <GridBox grid={grid} setGrid={setGrid} />
                    </div>
                    {isOffcanvas && (
                      <CollectionSidebar
                        sellerClass={"top-filter filter-bottom-content"}
                        filter={filter}
                        setFilter={setFilter}
                        isOffcanvas={true}
                      />
                    )}
                  </Col>
                </Row>
              </div>
              <CollectionProducts
                filter={filter}
                grid={grid}
                infiniteScroll={infiniteScroll}
                setFilter={setFilter}
                categorySlug={categorySlug}
              />
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default MainCollection;
