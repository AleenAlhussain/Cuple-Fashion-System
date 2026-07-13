import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext, useEffect } from "react";
import CollectionSidebar from "../collectionSidebar";
import MainCollection from "../mainCollection";

const CollectionLeftSidebar = ({
  filter,
  setFilter,
  hideCategory,
  categorySlug,
}) => {
  const { setCollectionMobile } = useContext(ThemeOptionContext);

  useEffect(() => {
    setCollectionMobile(false);
  }, []);
  return (
    <WrapperComponent
      classes={{
        sectionClass: "section-b-space collection-wrapper",
        fluidClass: "container",
      }}
      customCol={true}
    >
      <CollectionSidebar
        filter={filter}
        setFilter={setFilter}
        hideCategory={hideCategory}
        categorySlug={categorySlug}
      />
      {!categorySlug && (
        <MainCollection isBanner={true} filter={filter} setFilter={setFilter} />
      )}
      {categorySlug && (
        <MainCollection
          filter={filter}
          setFilter={setFilter}
          categorySlug={categorySlug}
        />
      )}
    </WrapperComponent>
  );
};

export default CollectionLeftSidebar;
