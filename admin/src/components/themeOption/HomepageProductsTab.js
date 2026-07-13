"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormGroup,
  Input,
  Label,
  Spinner,
} from "reactstrap";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiSearchLine,
} from "react-icons/ri";
import request from "../../utils/axiosUtils";

const PRODUCT_API = "/product";
const MAX_MANUAL_PRODUCTS = 8;

const getProductsFromResponse = (response) =>
  response?.data?.data?.data || response?.data?.data || [];

const normalizeIds = (ids) =>
  Array.from(
    new Set(
        (Array.isArray(ids) ? ids : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  ).slice(0, MAX_MANUAL_PRODUCTS);

const getProductLabel = (product) =>
  product?.sku ? `${product.sku} - ${product?.name || `#${product.id}`}` : product?.name || `#${product.id}`;

const ManualProductSection = ({
  title,
  helperText,
  activeText,
  fallbackText,
  maxReachedText,
  emptyText,
  selectedIds,
  onChange,
  router,
  tx,
}) => {
  const searchTimer = useRef(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const selectedKey = selectedIds.join(",");

  useEffect(() => {
    let isMounted = true;

    const loadSelectedProducts = async () => {
      if (!selectedIds.length) {
        setSelectedProducts([]);
        return;
      }

      setLoadingSelected(true);
      try {
        const response = await request(
          {
            url: PRODUCT_API,
            params: { ids: selectedIds.join(","), paginate: MAX_MANUAL_PRODUCTS },
          },
          router
        );
        const products = getProductsFromResponse(response);
        const orderedProducts = selectedIds
          .map((id) => products.find((product) => Number(product?.id) === Number(id)))
          .filter(Boolean);

        if (isMounted) {
          setSelectedProducts(orderedProducts);
        }
      } catch (error) {
        if (isMounted) {
          setSelectedProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSelected(false);
        }
      }
    };

    loadSelectedProducts();

    return () => {
      isMounted = false;
    };
  }, [router, selectedKey, selectedIds]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const handleSearchChange = (query) => {
    setProductSearch(query);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await request(
          {
            url: PRODUCT_API,
            params: { search: trimmedQuery, paginate: 10 },
          },
          router
        );
        const products = getProductsFromResponse(response);
        const filteredProducts = products.filter(
          (product) => !selectedIds.includes(Number(product?.id))
        );
        setSearchResults(filteredProducts);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const addProduct = (product) => {
    if (!product?.id || selectedIds.length >= MAX_MANUAL_PRODUCTS) return;

    const nextIds = [...selectedIds, Number(product.id)];
    onChange(nextIds);
    setSelectedProducts((prev) => [...prev, product]);
    setSearchResults([]);
    setProductSearch("");
  };

  const removeProduct = (productId) => {
    const nextIds = selectedIds.filter((id) => Number(id) !== Number(productId));
    onChange(nextIds);
    setSelectedProducts((prev) => prev.filter((product) => Number(product?.id) !== Number(productId)));
  };

  const moveProduct = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedIds.length) return;

    const nextIds = [...selectedIds];
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    onChange(nextIds);

    const nextProducts = [...selectedProducts];
    [nextProducts[index], nextProducts[nextIndex]] = [nextProducts[nextIndex], nextProducts[index]];
    setSelectedProducts(nextProducts);
  };

  const clearManualSelection = () => {
    onChange([]);
    setSelectedProducts([]);
    setSearchResults([]);
    setProductSearch("");
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <h5 className="mb-0">{title}</h5>
      </CardHeader>
      <CardBody>
        <p className="text-muted mb-3">{helperText}</p>

        <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
          <Badge color={selectedIds.length ? "primary" : "secondary"} pill>
            {selectedIds.length}/{MAX_MANUAL_PRODUCTS}
          </Badge>
          <span className="text-muted small">
            {selectedIds.length ? activeText : fallbackText}
          </span>
        </div>

        <FormGroup className="mb-3">
          <Label className="form-label">
            {tx("SearchProducts", "Search Products")}
          </Label>
          <div className="position-relative">
            <Input
              type="text"
              value={productSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={tx("SearchProductsPlaceholder", "Search by product name or SKU")}
              disabled={selectedIds.length >= MAX_MANUAL_PRODUCTS}
            />
            <RiSearchLine
              size={18}
              className="text-muted position-absolute"
              style={{ top: "50%", insetInlineEnd: "12px", transform: "translateY(-50%)" }}
            />
          </div>
          {selectedIds.length >= MAX_MANUAL_PRODUCTS && (
            <div className="text-muted small mt-2">
              {maxReachedText}
            </div>
          )}
        </FormGroup>

        {(searching || searchResults.length > 0) && (
          <Card className="mb-4 border">
            <CardBody className="py-2">
              {searching ? (
                <div className="d-flex align-items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span>{tx("SearchingProducts", "Searching products...")}</span>
                </div>
              ) : (
                searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="d-flex align-items-center justify-content-between gap-3 py-2 border-bottom"
                  >
                    <div className="min-w-0">
                      <div className="fw-semibold text-break">
                        {getProductLabel(product)}
                      </div>
                      <div className="text-muted small">
                        #{product.id}
                      </div>
                    </div>
                    <Button color="primary" size="sm" onClick={() => addProduct(product)}>
                      {tx("AddProduct", "Add")}
                    </Button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        )}

        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0">{tx("SelectedProducts", "Selected Products")}</h6>
          {selectedIds.length > 0 && (
            <Button color="outline-danger" size="sm" onClick={clearManualSelection}>
              <RiCloseLine className="me-1" />
              {tx("ClearManualSelection", "Use Automatic")}
            </Button>
          )}
        </div>

        {loadingSelected ? (
          <div className="d-flex align-items-center gap-2 py-3">
            <Spinner size="sm" />
            <span>{tx("LoadingSelectedProducts", "Loading selected products...")}</span>
          </div>
        ) : selectedProducts.length > 0 ? (
          <div className="border rounded overflow-hidden">
            {selectedProducts.map((product, index) => (
              <div
                key={product.id}
                className="d-flex align-items-center justify-content-between gap-3 p-3 border-bottom"
              >
                <div className="d-flex align-items-start gap-3 min-w-0">
                  <Badge color="light" className="text-dark mt-1">
                    {index + 1}
                  </Badge>
                  <div className="min-w-0">
                    <div className="fw-semibold text-break">
                      {getProductLabel(product)}
                    </div>
                    <div className="text-muted small">
                      #{product.id}
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    color="light"
                    size="sm"
                    onClick={() => moveProduct(index, -1)}
                    disabled={index === 0}
                  >
                    <RiArrowUpLine />
                  </Button>
                  <Button
                    color="light"
                    size="sm"
                    onClick={() => moveProduct(index, 1)}
                    disabled={index === selectedProducts.length - 1}
                  >
                    <RiArrowDownLine />
                  </Button>
                  <Button
                    color="outline-danger"
                    size="sm"
                    onClick={() => removeProduct(product.id)}
                  >
                    <RiDeleteBin6Line />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded p-3 text-muted">
            {emptyText}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const HomepageProductsTab = ({ values, setFieldValue }) => {
  const { t } = useTranslation("common");
  const router = useRouter();

  const tx = (key, fallback) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const latestSelectedIds = useMemo(
    () => normalizeIds(values?.options?.home_latest_products?.product_ids),
    [values?.options?.home_latest_products?.product_ids]
  );

  const bestSellerSelectedIds = useMemo(
    () => normalizeIds(values?.options?.home_best_seller_products?.product_ids),
    [values?.options?.home_best_seller_products?.product_ids]
  );

  const updateLatestIds = (nextIds) => {
    setFieldValue("options.home_latest_products.product_ids", normalizeIds(nextIds));
  };

  const updateBestSellerIds = (nextIds) => {
    setFieldValue("options.home_best_seller_products.product_ids", normalizeIds(nextIds));
  };

  return (
    <div className="px-2 py-2">
      <ManualProductSection
        title={tx("HomepageLatestProducts", "Homepage Latest Products")}
        helperText={tx(
          "HomepageLatestProductsHelper",
          "Select up to 8 products to show in Latest Products on the homepage. Leave this empty to use the automatic newest active products."
        )}
        activeText={tx("ManualSelectionEnabled", "Manual selection is active")}
        fallbackText={tx(
          "AutomaticLatestFallback",
          "Automatic fallback: newest active products by created date"
        )}
        maxReachedText={tx(
          "HomepageLatestMaxReached",
          "Maximum 8 products selected. Remove one to add another."
        )}
        emptyText={tx(
          "NoManualHomepageProducts",
          "No manual products selected. Homepage will use the newest active products automatically."
        )}
        selectedIds={latestSelectedIds}
        onChange={updateLatestIds}
        router={router}
        tx={tx}
      />

      <ManualProductSection
        title={tx("HomepageBestSellerProducts", "Homepage Best Seller Products")}
        helperText={tx(
          "HomepageBestSellerProductsHelper",
          "Select up to 8 products to show in Best Seller on the homepage. Leave this empty to use the automatic most sold active products."
        )}
        activeText={tx("ManualBestSellerSelectionEnabled", "Manual best seller selection is active")}
        fallbackText={tx(
          "AutomaticBestSellerFallback",
          "Automatic fallback: most sold active products"
        )}
        maxReachedText={tx(
          "HomepageBestSellerMaxReached",
          "Maximum 8 best seller products selected. Remove one to add another."
        )}
        emptyText={tx(
          "NoManualBestSellerProducts",
          "No manual best seller products selected. Homepage will use the most sold active products automatically."
        )}
        selectedIds={bestSellerSelectedIds}
        onChange={updateBestSellerIds}
        router={router}
        tx={tx}
      />
    </div>
  );
};

export default HomepageProductsTab;
