import NoDataFound from "@/components/widgets/NoDataFound";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import { useGetCategories } from "@/utils/api";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { RiArrowLeftSLine } from "react-icons/ri";
import { Col, Nav, NavItem, NavLink } from "reactstrap";
import { localizedValue } from "@/utils/constants";

const LeftCategory = ({ filter, setFilter }) => {
  const { data: categoriesResponse } = useGetCategories({}, { enabled: true });
  const categoryData = categoriesResponse?.data?.filter(c => c.type === "product") || [];
  const { themeOption, collectionMobile, setCollectionMobile } = useContext(ThemeOptionContext);
  const [layout] = useCustomSearchParams(["layout"]);
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const router = useRouter();
  const pathname = usePathname();
  const redirectToCollection = (slug) => {
    let temp = [...filter?.category];
    if (!temp.includes(slug)) {
      temp.push(slug);
    } else {
      temp = temp.filter((elem) => elem !== slug);
    }
    setFilter((prev) => {
      return {
        ...prev,
        category: temp,
      };
    });
    if (temp.length > 0) {
      const queryParams = new URLSearchParams({ ...layout, category: temp }).toString();
      router.push(`${pathname}?${queryParams}`);
    } else {
      const queryParams = new URLSearchParams({ ...layout }).toString();
      router.push(`${pathname}?${queryParams}`);
    }
  };
  return (
    <Col xl="3" lg="4" className={`collection-filter ${collectionMobile ? 'show' : ''}`} >
      <div className="left-box">
        <div className="shop-left-sidebar">
          <div className="collection-mobile-back" onClick={() => setCollectionMobile(false)}>
            <span className="filter-back">
              <RiArrowLeftSLine />
              {t("Back")}
            </span>
          </div>
          {categoryData?.length > 0 ? (
            <Nav className="nav-pills mb-3 custom-nav-tab">
              {categoryData
                ?.map((category, i) => (
                  <NavItem onClick={() => redirectToCollection(category?.slug)} key={i}>
                    <NavLink tag={"button"} className={filter?.category?.includes(category?.slug) ? "active" : ""}>
                      {localizedValue(category, 'name', lang)}
                      {category?.category_icon?.original_url && <Image src={category?.category_icon?.original_url || placeHolderImage} alt={localizedValue(category, 'name', lang)} height={80} width={80} />}
                    </NavLink>
                  </NavItem>
                ))}
            </Nav>
          ) : (
            <NoDataFound customClass="bg-light no-data-added" title="NoCategoryFound" />
          )}
        </div>
      </div>
    </Col>
  );
};

export default LeftCategory;