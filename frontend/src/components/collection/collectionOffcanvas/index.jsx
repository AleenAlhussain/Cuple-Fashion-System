import WrapperComponent from "@/components/widgets/WrapperComponent";
import MainCollection from "../mainCollection";
import { useContext, useEffect } from "react";
import ThemeOptionContext from "@/context/themeOptionsContext";

const CollectionOffCanvas = ({ filter, setFilter }) => {
  const { setCollectionMobile } = useContext(ThemeOptionContext);

  useEffect(() => {
    setCollectionMobile(false);
  }, []);

  return (
    <WrapperComponent classes={{ sectionClass: "section-b-space collection-wrapper", fluidClass: "container" }} customCol={true}>
      <MainCollection isBanner={true} filter={filter} setFilter={setFilter} isOffcanvas={true} noSidebar={true} initialGrid={4}/>
    </WrapperComponent>
  );
};

export default CollectionOffCanvas;
