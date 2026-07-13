import WrapperComponent from "@/components/widgets/WrapperComponent";
import { useContext, useEffect } from "react";
import CollectionSidebar from "../collectionSidebar";
import MainCollection from "../mainCollection";
import CollectionSlider from "./CollectionSlider";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { Container } from "reactstrap";

const MainCollectionSlider = ({ filter, setFilter }) => {
  const { setCollectionMobile } = useContext(ThemeOptionContext);
  useEffect(() => {
    setCollectionMobile(false);
  }, []);

  return (
    <>
      <Container>
        <CollectionSlider filter={filter} setFilter={setFilter} />
      </Container>
      <WrapperComponent classes={{ sectionClass: "section-b-space", fluidClass: "container" }} customCol={true}>
        <CollectionSidebar filter={filter} setFilter={setFilter} />
        <MainCollection filter={filter} setFilter={setFilter} />
      </WrapperComponent>
    </>
  );
};

export default MainCollectionSlider;
