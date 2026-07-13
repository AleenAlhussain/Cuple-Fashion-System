import FullSearch from "./fullSearch";
import IconSearch from "./iconSearch";

const HeaderSearchbar = ({ fullSearch = false }) => {
  return <>{fullSearch ? <FullSearch /> : <IconSearch />}</>;
};

export default HeaderSearchbar;
