import WrapperComponent from "@/components/widgets/WrapperComponent";
import CollectionSidebar from "../collectionSidebar";
import MainCollection from "../mainCollection";

const CollectionBanner = ({ filter, setFilter }) => {
  return (
    <WrapperComponent classes={{ sectionClass: "section-b-space shop-section" }} customCol={true}>
      <CollectionSidebar filter={filter} setFilter={setFilter} />
      <MainCollection filter={filter} setFilter={setFilter} isBanner={true} />
    </WrapperComponent>
  );
};

export default CollectionBanner;
