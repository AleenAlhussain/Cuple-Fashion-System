import WrapperComponent from "@/components/widgets/WrapperComponent";
import CollectionSidebar from "../collectionSidebar";
import MainCollection from "../mainCollection";

const CollectionInfiniteScroll = ({ filter, setFilter }) => {
  return (
    <WrapperComponent classes={{ sectionClass: "section-b-space collection-wrapper", fluidClass: "container" }} customCol={true}>
      <CollectionSidebar filter={filter} setFilter={setFilter} />
      <MainCollection infiniteScroll={true} isBanner={true} filter={filter} setFilter={setFilter} />
    </WrapperComponent>
  );
};

export default CollectionInfiniteScroll;
