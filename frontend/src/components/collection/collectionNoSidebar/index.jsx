import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext, useEffect } from "react";
import CollectionSidebar from "../collectionSidebar";
import MainCollection from "../mainCollection";

const CollectionNoSidebar = ({ filter, setFilter }) => {
  const { collectionMobile, setCollectionMobile } = useContext(ThemeOptionContext);
  useEffect(() => {
    setCollectionMobile(false);
  }, []);

  return (
    <WrapperComponent classes={{ sectionClass: "section-b-space ratio_asos", fluidClass: "container" }} customCol={true}>
      {collectionMobile && <CollectionSidebar filter={filter} setFilter={setFilter} />}
      <MainCollection isBanner={true} filter={filter} setFilter={setFilter} initialGrid={4} noSidebar={true} />
    </WrapperComponent>
  );
};

export default CollectionNoSidebar;
