import ListProductBox from "@/components/collection/mainCollection/ListProductBox";
import NoDataFound from "@/components/widgets/NoDataFound";
import ProductSkeleton from "@/components/widgets/skeletonLoader/ProductSkeleton";
import Btn from "@/elements/buttons/Btn";
import { useGetProducts, useGetCategories } from "@/utils/api";
import useOutsideDropdown from "@/utils/hooks/useOutsideDropdown";
import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine, RiSearchLine } from "react-icons/ri";
import { useTypewriter } from "react-simple-typewriter";
import { Col, Input, Modal, ModalBody, ModalHeader, Row } from "reactstrap";

const IconSearchModal = ({ setIsOpen, isOpen }) => {
  const { t } = useTranslation("common");
  const [searchValue, setSearchValue] = useState("");
  const [searchArr, setSearchArray] = useState([]);
  const [paginate, setPaginate] = useState(4);
  const [categoryCustomSearch, setCategoryCustomSearch] = useState("");
  const [categoryTc, setCategoryTc] = useState(null);
  const [productCustomSearch, setProductCustomSearch] = useState("");
  const [productTc, setProductTc] = useState(null);
  const { ref, isComponentVisible, setIsComponentVisible } = useOutsideDropdown();
  
  // Products search
  const { 
    data: productsResponse, 
    isLoading: productLoading, 
    refetch: productRefetch,
    fetchStatus: productFetchStatus 
  } = useGetProducts(
    {
      status: 1,
      search: productCustomSearch || null,
      paginate: searchValue === "" ? 4 : paginate
    },
    {
      enabled: true,
      refetchOnWindowFocus: false
    }
  );

  // Categories search
  const { 
    data: categoriesResponse, 
    isLoading: categoryIsLoading, 
    refetch: categoryRefetch,
    fetchStatus: categoryFetchStatus 
  } = useGetCategories(
    {
      status: 1,
      paginate: searchValue === "" ? 4 : paginate,
      search: categoryCustomSearch || null
    },
    {
      enabled: isOpen,
      refetchOnWindowFocus: false
    }
  );

  const data = useMemo(() => productsResponse?.data || [], [productsResponse?.data]);
  const categoryData = useMemo(() => categoriesResponse?.data || [], [categoriesResponse?.data]);

  const [text] = useTypewriter({
    words: ["Search by name or SKU..."],
    deleteSpeed: 120,
    loop: 0,
  });

  // Update search results from API response (includes SKU search)
  useEffect(() => {
    if (data) {
      setSearchArray(data);
    }
  }, [data]);

  // Added debouncing (300ms for fast response)
  useEffect(() => {
    if (categoryTc) clearTimeout(categoryTc);
    setCategoryTc(setTimeout(() => setCategoryCustomSearch(searchValue), 300));

    if (productTc) clearTimeout(productTc);
    setProductTc(setTimeout(() => setProductCustomSearch(searchValue), 300));
  }, [searchValue]);

  // Refetch when debounced search values change
  useEffect(() => {
    if (categoryCustomSearch !== undefined) {
      categoryRefetch();
    }
  }, [categoryCustomSearch, categoryRefetch]);

  useEffect(() => {
    if (productCustomSearch !== undefined) {
      productRefetch();
    }
  }, [productCustomSearch, productRefetch]);

  // Simple onChange - just update search value, let debounce handle API calls
  const onChangeHandle = (text) => {
    setSearchValue(text);
    setIsComponentVisible(text !== "");
  };

  return (
    <Modal centered className="search-modal theme-modal-2" size="xl" isOpen={isOpen} toggle={() => setIsOpen(false)}>
      <ModalHeader tag={"div"}>
        <h3>{t("SearchInStore")}</h3>
        <Btn className="btn-close" onClick={() => setIsOpen(false)}>
          <RiCloseLine />
        </Btn>
      </ModalHeader>
      <ModalBody>
        <div className="search-box">
          <Input type="text" autoFocus placeholder={text + "|"} onChange={(e) => onChangeHandle(e.target.value)} value={searchValue} />
          <RiSearchLine />
        </div>
        <div className="search-category-box">
          <ul className="search-category-skeleton">
            {categoryFetchStatus == "fetching" || categoryData?.length ? <li className="text-secondary">{t("TopSearch")}</li> : null}
            {categoryFetchStatus == "fetching" ? new Array(4).fill(null).map((_, i) => <li key={i} className="skeleton-loader" />) : categoryData?.length ? categoryData?.slice(0, 4)?.map((item, i) => (
              <li key={i}>
                <Link href={`/category/${item?.slug}`} onClick={() => setIsOpen(false)}>
                  {item?.name}
                </Link>
              </li>
            )) : null}
          </ul>
        </div>
        <div className="mt-sm-4 mt-3">
          <h3 className="search-title">{t("MostSearched")}</h3>
          {productFetchStatus === "fetching" ? (
            <Row className="row row-cols-xl-4 row-cols-md-3 row-cols-2 g-sm-4 g-3 row-empty-cls">
              {new Array(3).fill(null).map((_, i) => (
                <Col key={i}>
                  <ProductSkeleton />
                </Col>
              ))}
              <ProductSkeleton />
            </Row>
          ) : searchArr?.length > 0 ? (
            <Row className="row row-cols-xl-4 row-cols-md-3 row-cols-2 g-sm-4 g-3 row-empty-cls">
              {searchArr?.slice(0, 4)?.map((item, i) => (
                <Col key={i} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }}>
                  <ListProductBox product={item} productBox={2} isOpen={isOpen} />
                </Col>
              ))}
            </Row>
          ) : (
            <NoDataFound height={345} width={345} imageUrl={`/assets/svg/empty-items.svg`} customClass={"collection-no-data no-data-added"} description={"Please check if you have misspelt something or try searching with other way."} title={"NoProductFound"} />
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default IconSearchModal;
