import { useEffect, useState } from "react";
import CollectionProducts from "./CollectionProducts";
import FilterSort from "./FilterSort";
import GridBox from "./GridBox";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import { useTranslation } from "react-i18next";
import { Col } from "reactstrap";
import FilterBtn from "./FilterBtn";
import FilterPaginate from "@/components/collection/mainCollection/FilterPaginate";
import CollectionSidebar from "@/components/collection/collectionSidebar";

const BrandCollection = ({ filter, setFilter, isOffcanvas, sidebarPopUp, initialGrid = 4, noSidebar, sellerClass }) => {
  const [grid, setGrid] = useState(initialGrid);

  const { t } = useTranslation("common");
  const [layout] = useCustomSearchParams(["layout"]);

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
    <Col className={`${sellerClass ? sellerClass : `col-sm-${isOffcanvas || noSidebar ? "12" : "9"}`}`}>
      <div className="collection-product-wrapper">
        <div className="product-top-filter">
          <div className={`${sidebarPopUp ? "popup-filter" : "product-filter-content"}`}>
            {isOffcanvas && <FilterBtn />}
            <FilterSort filter={filter} setFilter={setFilter} />
            <FilterPaginate filter={filter} setFilter={setFilter} />
            <GridBox grid={grid} setGrid={setGrid} />
          </div>
        </div>
        {isOffcanvas && <CollectionSidebar sellerClass={"top-filter filter-bottom-content"} filter={filter} setFilter={setFilter} isOffcanvas={true} />}

        <CollectionProducts filter={filter} grid={grid} setFilter={setFilter} />
      </div>
    </Col>
  );
};

export default BrandCollection;
