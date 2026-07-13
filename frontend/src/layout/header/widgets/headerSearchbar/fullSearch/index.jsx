"use client";
import Btn from "@/elements/buttons/Btn";
import useAxios from "@/utils/api/helpers/useAxios";
import useOutsideDropdown from "@/utils/hooks/useOutsideDropdown";
import useDebounce from "@/utils/hooks/useDebounce";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RiSearchLine } from "react-icons/ri";
import { useTypewriter } from "react-simple-typewriter";
import { Input } from "reactstrap";
import SearchDropDown from "./SearchDropdown";

const FullSearch = () => {
  const { t } = useTranslation("common");
  const [searchValue, setSearchValue] = useState("");
  const [searchArr, setSearchArray] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [categoryIsLoading, setCategoryIsLoading] = useState(false);
  const pathName = usePathname();
  const { ref, isComponentVisible, setIsComponentVisible } = useOutsideDropdown();
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const router = useRouter();
  const axios = useAxios();

  // Debounce search value for API calls (300ms for fast response)
  const debouncedSearch = useDebounce(searchValue, 300);

  // Reset on path change
  useEffect(() => {
    setSelectedItemIndex(null);
    setIsComponentVisible(false);
    setSearchValue("");
    setSearchArray([]);
    setCategoryData([]);
  }, [pathName]);

  // Live search products via API when debounced value changes
  useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setSearchArray([]);
        setCategoryData([]);
        return;
      }

      setCategoryIsLoading(true);

      try {
        // Parallel requests for products and categories
        const [productsRes, categoriesRes] = await Promise.all([
          axios.get('/products/search', { params: { search: debouncedSearch } }),
          axios.get('/categories', { params: { search: debouncedSearch, paginate: 4 } })
        ]);

        setSearchArray(productsRes?.data?.data || []);
        setCategoryData(categoriesRes?.data?.data || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchArray([]);
        setCategoryData([]);
      } finally {
        setCategoryIsLoading(false);
      }
    };

    searchProducts();
  }, [debouncedSearch, axios]);

  const onChangeHandle = useCallback((text) => {
    setSearchValue(text);
    if (text !== "") {
      setIsComponentVisible(true);
    } else {
      setSearchArray([]);
      setCategoryData([]);
    }
  }, [setIsComponentVisible]);

  const handleEnterKey = () => {
    if (selectedItemIndex !== null && searchArr[selectedItemIndex]) {
      const selectedItem = searchArr[selectedItemIndex];
      router.push(`/product/${selectedItem.slug}`);
    } else if (searchValue) {
      router.push(`/search?search=${searchValue}`);
    }
  };

  const handleArrowKey = (direction) => {
    if (searchArr.length > 0) {
      let newIndex = selectedItemIndex === null ? 0 : selectedItemIndex + direction;
      if (newIndex < 0) {
        newIndex = searchArr.length - 1;
      } else if (newIndex >= searchArr.length) {
        newIndex = 0;
      }
      const selectedItemElement = document.getElementById(`searchItem_${newIndex}`);
      if (selectedItemElement) {
        selectedItemElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setSelectedItemIndex(newIndex);
    }
  };

  const onHandleSearch = () => {
    if (searchValue) {
      router.push(`/search?search=${searchValue}`);
    } else {
      router.push(`/search`);
    }
  };

  const [text] = useTypewriter({
    words: [t("SearchByNameOrSKU")],
    deleteSpeed: 120,
    loop: 0,
  });

  return (
    <form className="form_search" onSubmit={(e) => { e.preventDefault(); onHandleSearch(); }}>
      <Input
        className="nav-search nav-search-field"
        onClick={() => setIsComponentVisible(true)}
        type="search"
        placeholder={text + "|"}
        value={searchValue}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            handleArrowKey(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            handleArrowKey(-1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            handleEnterKey();
          }
        }}
        onChange={(e) => onChangeHandle(e.target.value)}
      />

      <Btn color="transparent" type="submit" name="nav-submit-button" className="btn-search">
        <RiSearchLine />
      </Btn>
      {isComponentVisible && (
        <SearchDropDown
          selectedItemIndex={selectedItemIndex}
          searchArr={searchArr}
          categoryLoading={categoryIsLoading}
          ref={ref}
          categoryData={categoryData}
          searchValue={searchValue}
        />
      )}
    </form>
  );
};

export default FullSearch;
