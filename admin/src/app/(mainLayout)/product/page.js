"use client";

import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import AdminSmartSearchBox from "@/components/common/AdminSmartSearchBox";
import AllProductTable from "@/components/product/AllProductTable";
import BulkProductImport from "@/components/product/BulkProductImport";
import { BrandAPI, Category, product, ProductExportSelectedAPI, store, tag } from "@/utils/axiosUtils/API";
import { Form, Formik } from "formik";
import { useEffect, useMemo, useRef, useState } from "react";
import { Col } from "reactstrap";
import request from "@/utils/axiosUtils";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import MultiSelectField from "@/components/inputFields/MultiSelectField";
import Btn from "@/elements/buttons/Btn";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";

const STORAGE_KEY = "productFilters";

const problemFilterOptions = [
  { id: "missing_image", name: "Missing Image" },
  { id: "zero_stock", name: "Zero Stock" },
  { id: "no_category", name: "No Category" },
  { id: "incomplete", name: "Has Issues" },
  { id: "ready", name: "Ready to Publish" },
];

const deriveProductStatusCounts = (responseData) => {
  if (!responseData) return null;

  const normalizeCount = (value) => (value === undefined || value === null ? undefined : Number(value));
  const counts =
    responseData?.status_counts ||
    responseData?.statusCount ||
    responseData?.product_status_counts ||
    responseData?.product_status_count;

  const published = normalizeCount(
    counts?.published ??
      counts?.publish ??
      counts?.published_products ??
      counts?.published_count ??
      responseData?.published_products ??
      responseData?.published_count ??
      responseData?.total_published_products
  );

  const drafts = normalizeCount(
    counts?.drafts ??
      counts?.draft ??
      counts?.draft_products ??
      counts?.draft_count ??
      responseData?.draft_products ??
      responseData?.draft_count ??
      responseData?.total_draft_products ??
      responseData?.draft ??
      responseData?.drafts
  );

  const trashed = normalizeCount(
    counts?.trashed ??
      counts?.trash ??
      counts?.trash_products ??
      counts?.trash_count ??
      responseData?.trash_products ??
      responseData?.trash_count ??
      responseData?.total_trash_products ??
      responseData?.trashed
  );

  const out_of_stock = normalizeCount(counts?.out_of_stock ?? counts?.out_of_stock_products ?? counts?.oos);
  const no_image = normalizeCount(counts?.no_image ?? counts?.missing_image);
  const no_sales = normalizeCount(counts?.no_sales ?? counts?.without_sales);
  const high_returns = normalizeCount(counts?.high_returns ?? counts?.frequent_returns);

  if ([published, drafts, trashed, out_of_stock, no_image, no_sales, high_returns].some((value) => value !== undefined)) {
    return {
      published: published ?? 0,
      drafts: drafts ?? 0,
      trashed: trashed ?? 0,
      out_of_stock: out_of_stock ?? 0,
      no_image: no_image ?? 0,
      no_sales: no_sales ?? 0,
      high_returns: high_returns ?? 0,
    };
  }

  const total = normalizeCount(responseData?.total);
  if (total !== undefined) {
    return { published: total ?? 0, drafts: 0, trashed: 0, out_of_stock: 0, no_image: 0, no_sales: 0, high_returns: 0 };
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data.reduce(
      (acc, productItem) => {
        const isTrashed = productItem?.deleted_at ?? productItem?.is_deleted ?? productItem?.is_trashed;
        const statusVal = productItem?.status;
        const stockStatus = productItem?.stock_status ?? productItem?.stock_value;
        const hasImage = !!productItem?.product_thumbnail;
        const salesCount = productItem?.sales_count ?? productItem?.orders_count ?? productItem?.total_sales ?? productItem?.total_sale;
        const returnsCount = productItem?.returns_count ?? productItem?.return_count ?? productItem?.total_returns;

        if (isTrashed) {
          acc.trashed += 1;
        } else if (statusVal === 0 || statusVal === "0" || statusVal === "draft" || productItem?.is_draft) {
          acc.drafts += 1;
        } else {
          acc.published += 1;
        }

        if (stockStatus === "out_of_stock" || stockStatus === 0 || stockStatus === "0") {
          acc.out_of_stock += 1;
        }
        if (!hasImage) acc.no_image += 1;
        if (!salesCount || Number(salesCount) === 0) acc.no_sales += 1;
        if (returnsCount && Number(returnsCount) > 0) acc.high_returns += 1;

        return acc;
      },
      { published: 0, drafts: 0, trashed: 0, out_of_stock: 0, no_image: 0, no_sales: 0, high_returns: 0 }
    );
  }

  return null;
};

const normalizeIdArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "object" && item !== null ? item.id : item))
      .map((item) => (item === "" || item === null || item === undefined ? null : Number(item)))
      .filter((item) => Number.isFinite(item));
  }
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .map((item) => (item === "" ? null : Number(item)))
      .filter((item) => Number.isFinite(item));
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? [numeric] : [];
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item === null || item === undefined ? "" : String(item).trim()))
      .filter(Boolean);
  }
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
};

const hasAdvancedFilters = (filters) =>
  Boolean(
    filters?.product_type ||
      (Array.isArray(filters?.brand_ids) && filters.brand_ids.length) ||
      (Array.isArray(filters?.tag_ids) && filters.tag_ids.length) ||
      (Array.isArray(filters?.store_ids) && filters.store_ids.length) ||
      (Array.isArray(filters?.problem_filters) && filters.problem_filters.length)
  );

const AllProducts = () => {
  const { t } = useTranslation("common");

  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectAllProducts, setSelectAllProducts] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [viewMode, setViewMode] = useState("expanded");

  const [bulkAction, setBulkAction] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkCategory, setBulkCategory] = useState([]);
  const [bulkCategoryMode, setBulkCategoryMode] = useState("add");
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkStore, setBulkStore] = useState("");
  const [bulkPriceMode, setBulkPriceMode] = useState("fixed");
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkTag, setBulkTag] = useState("");
  const [bulkRemoveTag, setBulkRemoveTag] = useState("");
  const [bulkMarket, setBulkMarket] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [publishReadinessById, setPublishReadinessById] = useState({});

  const tableRef = useRef(null);
  const valuesRef = useRef();

  const [selectedMarket, setSelectedMarket] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [canCreate] = usePermissionCheck(["create"], "product");
  const router = useRouter();

  const clearSelection = () => { setSelectedProductIds([]); setSelectAllProducts(false); };
  const handleTableQueryChange = () => {
    if (!selectedProductIds.length && !selectAllProducts) return;
    clearSelection();
    ToastNotification("info", "Selection cleared بسبب تغيير الفلاتر/الصفحة");
  };

  const selectedIncompleteProducts = useMemo(
    () =>
      (selectedProductIds || [])
        .map((id) => ({ id, ...(publishReadinessById[id] || {}) }))
        .filter((item) => item.publishReady === false),
    [selectedProductIds, publishReadinessById]
  );
  const publishBlockedByIncompleteSelection =
    bulkAction === "publish" && !selectAllProducts && selectedIncompleteProducts.length > 0;

  const buildBulkPayloadData = () => {
    const data = {};
    if (bulkAction === "publish" || bulkAction === "draft") {
      data.status = bulkStatus || (bulkAction === "publish" ? 1 : 0);
    }
    if (bulkAction === "stock_update" && bulkStock) {
      data.stock_status = bulkStock;
    }
    if (bulkAction === "set_category") {
      data.category_mode = bulkCategoryMode;
      if (bulkCategoryMode === "clear") {
        data.clear_category = true;
      } else {
        const normalizedCategories = Array.from(
          new Set(
            (bulkCategory || [])
              .map((item) => (typeof item === "object" && item !== null ? item.id : item))
              .map((value) => {
                if (value === null || value === undefined || value === "") return null;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : null;
              })
              .filter((value) => value !== null)
          )
        );
        if (normalizedCategories.length) {
          data.category_ids = normalizedCategories;
        }
      }
    }
    if (bulkAction === "set_brand" && bulkBrand) {
      data.brand_id = bulkBrand;
    }
    if (bulkAction === "set_store" && bulkStore) {
      data.store_id = bulkStore;
    }
    if (bulkAction === "price_update" && bulkPriceValue !== "") {
      data.price_mode = bulkPriceMode;
      data.price_value = bulkPriceValue;
    }
    if (bulkAction === "add_tag" && bulkTag) {
      data.tag_id = bulkTag;
    }
    if (bulkAction === "remove_tag" && bulkRemoveTag) {
      data.tag_id = bulkRemoveTag;
    }
    if (bulkAction === "set_market" && bulkMarket.length) {
      data.country_ids = bulkMarket;
    }
    return data;
  };

  const buildBulkPayload = () => {
    const dataPayload = buildBulkPayloadData();
    const payload = {
      action: bulkAction,
      ids: selectedProductIds,
      data: dataPayload,
      ...dataPayload,
    };
    if (selectAllProducts) {
      payload.select_all = true;
      payload.search = searchValue || undefined;
    }
    return payload;
  };

  useEffect(() => {
    if (bulkAction !== "set_category" && bulkCategoryMode !== "add") {
      setBulkCategoryMode("add");
    }
  }, [bulkAction, bulkCategoryMode]);

  const handleBulkApply = async () => {
    if (!selectedProductIds.length && !selectAllProducts) {
      ToastNotification("warn", t("SelectAtLeastOneProduct") || "Select at least 1 product");
      return;
    }
    if (!bulkAction) return;
    const count = selectAllProducts ? totalProducts : selectedProductIds.length;
    if (bulkAction === "delete" && typeof window !== "undefined") {
      const confirmed = window.confirm(
        selectAllProducts
          ? `Delete ALL ${count} products?`
          : `Delete ${count} products?`
      );
      if (!confirmed) return;
    }

    setBulkLoading(true);
    try {
      const dataPayload = buildBulkPayloadData();
      let bulkResponse = null;
      if (bulkAction === "image_upload") {
        if (!bulkFile) {
          ToastNotification("warn", t("UploadFileRequired") || "Please attach a CSV or ZIP file");
          return;
        }
        const formData = new FormData();
        formData.append("ids", selectedProductIds.join(","));
        formData.append("action", bulkAction);
        Object.entries(dataPayload).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          if (Array.isArray(value)) {
            formData.append(key, value.join(","));
          } else {
            formData.append(key, String(value));
          }
        });
        formData.append("data", JSON.stringify(dataPayload));
        formData.append("file", bulkFile);
        bulkResponse = await request(
          {
            url: `${product}/bulk-action`,
            method: "post",
            data: formData,
            headers: { "Content-Type": "multipart/form-data" },
          },
          router
        );
      } else {
        const payload = buildBulkPayload();
        bulkResponse = await request({ url: `${product}/bulk-action`, method: "post", data: payload }, router);
      }

      if (bulkAction === "publish") {
        const skipped = Array.isArray(bulkResponse?.data?.skipped) ? bulkResponse.data.skipped : [];
        const publishedIds = Array.isArray(bulkResponse?.data?.published_ids) ? bulkResponse.data.published_ids : [];

        if (skipped.length) {
          const sample = skipped
            .slice(0, 2)
            .map((item) => `#${item?.id}: ${(item?.reasons || []).join(", ")}`)
            .join(" | ");
          ToastNotification(
            "warn",
            `Published ${publishedIds.length} product(s), skipped ${skipped.length} incomplete product(s).${sample ? ` ${sample}` : ""}`
          );
        } else {
          ToastNotification("success", t("BulkActionCompleted") || "Bulk action completed successfully.");
        }
      } else {
        ToastNotification("success", t("BulkActionCompleted") || "Bulk action completed successfully.");
      }
      clearSelection();
      setBulkAction("");
      setBulkStatus("");
      setBulkStock("");
      setBulkCategory([]);
      setBulkBrand("");
      setBulkStore("");
      setBulkPriceMode("fixed");
      setBulkPriceValue("");
      setBulkFile(null);
      setBulkTag("");
      setBulkRemoveTag("");
      setBulkMarket([]);
      setBulkCategoryMode("add");
      tableRef.current?.call?.();
    } catch (err) {
      console.error("Bulk action failed", err);
      ToastNotification("error", err?.response?.data?.message || "Failed to apply bulk action");
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.getElementById("products-search");
        if (searchInput) searchInput.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (typeof window !== "undefined" && valuesRef.current) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(valuesRef.current));
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowDown") {
        e.preventDefault();
        const checkboxes = Array.from(document.querySelectorAll(".datatable-wrapper input[type='checkbox']"));
        if (!checkboxes.length) return;
        const activeIndex = checkboxes.findIndex((el) => el === document.activeElement);
        const next = checkboxes[(activeIndex + 1) % checkboxes.length];
        if (next) next.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data: brandData } = useCustomQuery(
    [BrandAPI],
    () => request({ url: BrandAPI, params: { paginate: 500 } }, router),
    {
      enabled: true,
      refetchOnWindowFocus: false,
      select: (res) =>
        (Array.isArray(res?.data?.data) ? res.data.data : []).map((elem) => {
          return { id: elem.id, name: elem?.name, slug: elem?.slug };
        }),
    }
  );

  const { data: storeData } = useCustomQuery(
    [store],
    () => request({ url: store, params: { paginate: 500 } }, router),
    {
      enabled: true,
      refetchOnWindowFocus: false,
      select: (res) =>
        (Array.isArray(res?.data?.data) ? res.data.data : []).map((elem) => {
          return { id: elem.id, name: elem?.store_name, slug: elem?.slug };
        }),
    }
  );

  const { data: tagData } = useCustomQuery(
    [tag],
    () =>
      request(
        {
          url: tag,
          params: { paginate: 500 },
        },
        router
      ),
    {
      enabled: true,
      refetchOnWindowFocus: false,
      select: (res) =>
        (Array.isArray(res?.data?.data) ? res.data.data : []).map((elem) => {
          return { id: elem.id, name: elem?.name, slug: elem?.slug };
        }),
    }
  );

  const { data: categoryData } = useCustomQuery(
    [Category],
    () => request({ url: Category, params: { status: 1, type: "product" } }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) =>
        res?.data?.data?.map((elem) => {
          return {
            id: elem.id,
            name: elem.name,
            image: elem?.category_icon?.original_url || "/assets/images/placeholder.png",
            slug: elem?.slug,
            subcategories: elem?.subcategories,
          };
        }),
    }
  );

  const productTypes = [
    { id: "simple", name: "Simple Product", slug: "simple-product" },
    { id: "variable", name: "Variable Product", slug: "variable-product" },
  ];

  const marketOptions = [
    { id: 1, name: "UAE", slug: "uae" },
    { id: 2, name: "KSA", slug: "ksa" },
  ];

  const defaultFilters = {
    category_ids: [],
    brand_ids: [],
    store_ids: [],
    product_type: "",
    stock_status: "",
    publish_readiness: "",
    tag_ids: [],
    status: "",
    problem_filters: [],
  };

  const savedFilters = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const normalizedSavedFilters = useMemo(() => {
    if (!savedFilters) return null;
    return {
      ...defaultFilters,
      ...savedFilters,
      category_ids: normalizeIdArray(savedFilters.category_ids),
      brand_ids: normalizeIdArray(savedFilters.brand_ids),
      store_ids: normalizeIdArray(savedFilters.store_ids),
      tag_ids: normalizeIdArray(savedFilters.tag_ids),
      problem_filters: normalizeStringArray(savedFilters.problem_filters),
      product_type: savedFilters.product_type || "",
      stock_status: savedFilters.stock_status || "",
      publish_readiness: savedFilters.publish_readiness || "",
      status: savedFilters.status ?? "",
    };
  }, [savedFilters]);

  const initialValues = { ...defaultFilters, ...(normalizedSavedFilters || {}) };

  useEffect(() => {
    if (normalizedSavedFilters && hasAdvancedFilters(normalizedSavedFilters)) {
      setShowAdvancedFilters(true);
    }
  }, [normalizedSavedFilters]);

  return (
    <Col sm="12">
      <Formik enableReinitialize initialValues={initialValues}>
        {({ values, setFieldValue, resetForm }) => {
          valuesRef.current = values;
          const handleResetFilters = () => {
            resetForm({ values: defaultFilters });
            setSelectedMarket("");
            setSearchText("");
            setSearchValue("");
            setShowAdvancedFilters(false);
            if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
          };

          const selectedTagOptions = (tagData || []).filter((option) => {
            const optionId = option?.value ?? option?.id;
            return values?.tag_ids?.includes?.(Number(optionId));
          });

          const paramsProps = {
            category_ids: values.category_ids?.length > 0 ? values.category_ids.join(",") : null,
            brand_ids: values.brand_ids?.length > 0 ? values.brand_ids.join(",") : null,
            store_ids: values.store_ids?.length > 0 ? values.store_ids.join(",") : null,
            product_type: values.product_type ? values.product_type : null,
            stock_status: values.stock_status ? values.stock_status : null,
            publish_readiness: values.publish_readiness ? values.publish_readiness : null,
            tag_ids: values.tag_ids?.length ? values.tag_ids.join(",") : null,
            status: values.status !== "" ? values.status : null,
            missing_image: values.problem_filters?.includes("missing_image") ? 1 : null,
            zero_stock: values.problem_filters?.includes("zero_stock") ? 1 : null,
            no_category: values.problem_filters?.includes("no_category") ? 1 : null,
            incomplete: values.problem_filters?.includes("incomplete") ? 1 : null,
            ready: values.problem_filters?.includes("ready") ? 1 : null,
            market: selectedMarket || null,
          };
          const resolvedTotalProducts = Number(totalProducts || 0);
          const resolvedSelectedCount = selectAllProducts ? resolvedTotalProducts : selectedProductIds.length;

          const showBulkOptions = bulkAction && !["publish", "draft", "delete"].includes(bulkAction);

          return (
            <Form>
              <div className="products-page">
                <div className="products-header-tools mb-2">
                  <div className="products-market-select">
                    <label className="form-label mb-1">Market</label>
                    <select className="form-select form-select-sm" value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)}>
                      <option value="">Default</option>
                      <option value="uae">UAE</option>
                      <option value="ksa">KSA</option>
                    </select>
                  </div>
                </div>

                <div className="products-filters mb-3">
                  <div className="products-filters-basic">
                    <div className="products-filter-field products-filter-field-search">
                      <label className="products-filter-label">{t("Search") || "Search"}</label>
                      <AdminSmartSearchBox
                        value={searchText}
                        onChange={setSearchText}
                        onApply={(text) => {
                          setSearchText(text);
                          setSearchValue(text);
                        }}
                        placeholder={t("SearchProducts") || "Search products"}
                        inputId="products-search"
                      />
                    </div>

                    <div className="products-filter-field">
                      <label className="products-filter-label">{t("Categories") || "Categories"}</label>
                      <MultiSelectField
                        notitle="true"
                        values={values}
                        setFieldValue={setFieldValue}
                        name="category_ids"
                        title="Category"
                        data={categoryData}
                        initialTittle="SelectCategories"
                      />
                    </div>

                    <div className="products-filter-field">
                      <label className="products-filter-label">{t("Status") || "Status"}</label>
                      <select className="form-select form-select-sm" value={values.status} onChange={(e) => setFieldValue("status", e.target.value)}>
                        <option value="">{t("All") || "All"}</option>
                        <option value="1">{t("Published") || "Published"}</option>
                        <option value="0">{t("Draft") || "Draft"}</option>
                      </select>
                    </div>

                    <div className="products-filter-field">
                      <label className="products-filter-label">{t("StockStatus") || "Stock Status"}</label>
                      <select
                        className="form-select form-select-sm"
                        value={values.stock_status}
                        onChange={(e) => setFieldValue("stock_status", e.target.value)}
                      >
                        <option value="">{t("All") || "All"}</option>
                        <option value="in_stock">{t("InStock") || "In Stock"}</option>
                        <option value="out_of_stock">{t("OutOfStock") || "Out of Stock"}</option>
                      </select>
                    </div>

                    <div className="products-filter-field">
                      <label className="products-filter-label">{t("PublishReadiness") || "Publish Readiness"}</label>
                      <select
                        className="form-select form-select-sm"
                        value={values.publish_readiness}
                        onChange={(e) => setFieldValue("publish_readiness", e.target.value)}
                      >
                        <option value="">{t("All") || "All"}</option>
                        <option value="issue">{t("HasIssues") || "Has Issues"}</option>
                        <option value="ready">{t("Ready") || "Ready"}</option>
                      </select>
                    </div>

                    <button type="button" className="btn btn-light btn-sm products-advanced-toggle" onClick={() => setShowAdvancedFilters((p) => !p)}>
                      {showAdvancedFilters ? t("HideAdvanced") || "Hide Advanced" : t("AdvancedFilters") || "Advanced Filters"}
                    </button>
                  </div>

                  {showAdvancedFilters ? (
                    <div className="products-filters-advanced">
                      <div className="products-filter-field">
                        <label className="products-filter-label">{t("ProductType") || "Product Type"}</label>
                        <SearchableSelectInput
                          nameList={[
                            {
                              name: "product_type",
                              notitle: "true",
                              inputprops: {
                                name: "product_type",
                                id: "product_type",
                                options: productTypes,
                                close: !!values.product_type,
                                initialTittle: "SelectProductType",
                              },
                            },
                          ]}
                        />
                      </div>

                      <div className="products-filter-field">
                        <label className="products-filter-label">{t("Brand") || "Brand"}</label>
                        <SearchableSelectInput
                          nameList={[
                            {
                              name: "brand_ids",
                              notitle: "true",
                              inputprops: {
                                name: "brand_ids",
                                id: "brand_ids",
                                initialTittle: "SelectBrand",
                                options: brandData || [],
                              },
                            },
                          ]}
                        />
                      </div>

                      <div className="products-filter-field">
                        <label className="products-filter-label">{t("Tag") || "Tag"}</label>
                        <SearchableSelectInput
                          nameList={[
                            {
                              name: "tag_ids",
                              notitle: "true",
                              inputprops: {
                                name: "tag_ids",
                                id: "tag_ids",
                                initialTittle: "SelectTag",
                                options: tagData || [],
                                value: selectedTagOptions,
                              },
                            },
                          ]}
                        />
                      </div>

                      <div className="products-filter-field">
                        <label className="products-filter-label">{t("Store") || "Store"}</label>
                        <SearchableSelectInput
                          nameList={[
                            {
                              name: "store_ids",
                              notitle: "true",
                              inputprops: {
                                name: "store_ids",
                                id: "store_ids",
                                options: storeData || [],
                                initialTittle: "SelectStore",
                              },
                            },
                          ]}
                        />
                      </div>

                      <div className="products-filter-field">
                        <label className="products-filter-label">{t("ProblemFilters") || "Problem Filters"}</label>
                        <SearchableSelectInput
                          nameList={[
                            {
                              name: "problem_filters",
                              notitle: "true",
                              inputprops: {
                                name: "problem_filters",
                                id: "problem_filters",
                                initialTittle: "Problem Filters",
                                options: problemFilterOptions,
                                close: values.problem_filters?.length > 0,
                              },
                            },
                          ]}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="products-inline-toolbar mt-3">
                    <div className="products-inline-filters">
                      <button
                        type="button"
                        className="btn btn-ghost-dark btn-sm"
                        onClick={() => {
                          if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
                        }}
                      >
                        Save Filters
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost-reset btn-sm"
                        onClick={handleResetFilters}
                      >
                        Reset Filters
                      </button>
                    </div>

                    <div className="products-inline-actions">
                      <div>
                        <label className="form-label mb-1">{t("SelectAction") || "Select Action"}</label>
                        <select className="form-select form-select-sm" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                          <option value="">{t("Select") || "Select"}</option>
                          <optgroup label={t("Visibility") || "Visibility"}>
                            <option value="publish">{t("Publish") || "Publish"}</option>
                            <option value="draft">{t("Draft") || "Draft"}</option>
                            <option value="delete">{t("Delete") || "Delete"}</option>
                          </optgroup>
                          <optgroup label={t("ProductData") || "Product Data"}>
                            <option value="set_category">{t("SetCategory") || "Set Category"}</option>
                            <option value="set_brand">{t("SetBrand") || "Set Brand"}</option>
                            <option value="set_store">{t("SetStore") || "Set Store"}</option>
                            <option value="set_market">{t("SetMarket") || "Set Market (UAE/KSA)"}</option>
                          </optgroup>
                          <optgroup label={t("PricingStock") || "Pricing & Stock"}>
                            <option value="price_update">{t("PriceUpdate") || "Price Update"}</option>
                            <option value="stock_update">{t("StockUpdate") || "Stock Update"}</option>
                          </optgroup>
                          <optgroup label={t("Media") || "Media"}>
                            <option value="image_upload">{t("ImageUpload") || "Image Upload (SKU match)"}</option>
                          </optgroup>
                          <optgroup label={t("Tags") || "Tags"}>
                            <option value="add_tag">{t("AddTag") || "Add Tag"}</option>
                            <option value="remove_tag">{t("RemoveTag") || "Remove Tag"}</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label className="form-label mb-1">{t("Status") || "Status"}</label>
                        <select
                          className="form-select form-select-sm"
                          value={bulkStatus}
                          onChange={(e) => setBulkStatus(e.target.value)}
                          disabled={!(bulkAction === "publish" || bulkAction === "draft")}
                        >
                          <option value="">{t("Select") || "Select"}</option>
                          <option value="1">{t("Publish") || "Publish"}</option>
                          <option value="0">{t("Draft") || "Draft"}</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label mb-1">&nbsp;</label>
                        <button
                          type="button"
                          className="btn btn-dark btn-sm products-apply-btn"
                          disabled={
                            bulkLoading ||
                            !bulkAction ||
                            !selectedProductIds.length ||
                            publishBlockedByIncompleteSelection ||
                            (bulkAction === "stock_update" && !bulkStock) ||
                            (bulkAction === "set_category" && bulkCategoryMode !== "clear" && !bulkCategory.length) ||
                            (bulkAction === "set_brand" && !bulkBrand) ||
                            (bulkAction === "set_store" && !bulkStore) ||
                            (bulkAction === "price_update" && !bulkPriceValue) ||
                            (bulkAction === "image_upload" && !bulkFile) ||
                            (bulkAction === "add_tag" && !bulkTag) ||
                            (bulkAction === "remove_tag" && !bulkRemoveTag) ||
                            (bulkAction === "set_market" && !bulkMarket.length)
                          }
                          onClick={handleBulkApply}
                        >
                          {bulkLoading ? "Applying..." : `Apply${selectedProductIds.length ? ` (${selectedProductIds.length})` : ""}`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {publishBlockedByIncompleteSelection ? (
                    <div className="products-publish-warning mt-2">
                      <strong>{t("PublishDisabled") || "Publish is disabled"}:</strong>{" "}
                      {selectedIncompleteProducts.length} {t("SelectedProductsAreIncomplete") || "selected product(s) are incomplete."}
                      <span
                        className="products-publish-warning-hint"
                        title={selectedIncompleteProducts
                          .slice(0, 5)
                          .map((item) => `${item?.name || item?.id}: ${(item?.reasons || []).join(", ")}`)
                          .join(" • ")}
                      >
                        {t("HoverToSeeReasons") || "Hover to see reasons"}
                      </span>
                    </div>
                  ) : null}

                  {showBulkOptions ? (
                    <div className="card mt-2 products-bulk-card">
                      <div className="card-body">
                        <div className="d-flex flex-wrap gap-3 align-items-end">
                          {bulkAction === "stock_update" ? (
                            <div>
                              <label className="form-label mb-1">Stock</label>
                              <select className="form-select form-select-sm" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)}>
                                <option value="">Select</option>
                                <option value="in_stock">In Stock</option>
                                <option value="out_of_stock">Out of Stock</option>
                              </select>
                            </div>
                          ) : null}

                          {bulkAction === "set_category" ? (
                            <div style={{ minWidth: 260 }}>
                              <div className="bulk-category-mode d-flex flex-wrap gap-2 mb-2">
                                <span className="text-muted small align-self-center">
                                  {t("CategoryMode") || "Category mode"}
                                </span>
                                {[
                                  { value: "add", label: t("AddSelected") || "Add selected" },
                                  { value: "set", label: t("Set") || "Set / Replace" },
                                  { value: "remove", label: t("RemoveSelected") || "Remove selected" },
                                  { value: "clear", label: t("ClearCategory") || "Clear all" },
                                ].map((mode) => (
                                  <button
                                    key={mode.value}
                                    type="button"
                                    className={`btn btn-sm ${
                                      bulkCategoryMode === mode.value ? "btn-dark" : "btn-outline-secondary"
                                    }`}
                                    onClick={() => setBulkCategoryMode(mode.value)}
                                  >
                                    {mode.label}
                                  </button>
                                ))}
                              </div>
                              {bulkCategoryMode !== "clear" ? (
                                <>
                                  <SearchableSelectInput
                                    nameList={[
                                      {
                                        name: "bulk_category",
                                        title: "Category",
                                        notitle: "true",
                                        inputprops: {
                                          name: "bulk_category",
                                          id: "bulk_category",
                                          options: categoryData || [],
                                          close: bulkCategory.length > 0,
                                          setvalue: (_, val) => setBulkCategory(Array.isArray(val) ? val : [val]),
                                        },
                                        store: "obj",
                                        setvalue: (_, val) => setBulkCategory(Array.isArray(val) ? val : [val]),
                                      },
                                    ]}
                                  />
                                  <p className="small text-muted mt-2 mb-0">
                                    {bulkCategoryMode === "add"
                                      ? t("AddCategoryHint") || "Adds the selected categories without removing existing ones."
                                      : bulkCategoryMode === "set"
                                        ? t("ReplaceCategoryHint") || "Replaces existing categories with the selected ones."
                                        : t("RemoveCategoryHint") || "Removes the selected categories from the chosen products."}
                                  </p>
                                </>
                              ) : (
                                <p className="small text-muted mb-0">
                                  {t("ClearCategoryHint") || "Clears all categories from selected products."}
                                </p>
                              )}
                            </div>
                          ) : null}

                          {bulkAction === "set_brand" ? (
                            <div style={{ minWidth: 200 }}>
                              <SearchableSelectInput
                                nameList={[
                                  {
                                    name: "bulk_brand",
                                    title: "Brand",
                                    notitle: "true",
                                    inputprops: {
                                      name: "bulk_brand",
                                      id: "bulk_brand",
                                      options: brandData || [],
                                      close: !!bulkBrand,
                                      setvalue: (_, val) => setBulkBrand(val),
                                    },
                                    setvalue: (_, val) => setBulkBrand(val),
                                  },
                                ]}
                              />
                            </div>
                          ) : null}

                          {bulkAction === "set_store" ? (
                            <div style={{ minWidth: 200 }}>
                              <SearchableSelectInput
                                nameList={[
                                  {
                                    name: "bulk_store",
                                    title: "Store",
                                    notitle: "true",
                                    inputprops: {
                                      name: "bulk_store",
                                      id: "bulk_store",
                                      options: storeData || [],
                                      close: !!bulkStore,
                                      setvalue: (_, val) => setBulkStore(val),
                                    },
                                    setvalue: (_, val) => setBulkStore(val),
                                  },
                                ]}
                              />
                            </div>
                          ) : null}

                          {bulkAction === "add_tag" ? (
                            <div style={{ minWidth: 200 }}>
                              <SearchableSelectInput
                                nameList={[
                                  {
                                    name: "bulk_tag",
                                    notitle: "true",
                                    inputprops: {
                                      name: "bulk_tag",
                                      id: "bulk_tag",
                                      initialTittle: "Select Tag",
                                      options: tagData || [],
                                      close: !!bulkTag,
                                      setvalue: (_, val) => setBulkTag(val?.id || val || ""),
                                    },
                                    setvalue: (_, val) => setBulkTag(val?.id || val || ""),
                                  },
                                ]}
                              />
                            </div>
                          ) : null}

                          {bulkAction === "remove_tag" ? (
                            <div style={{ minWidth: 200 }}>
                              <SearchableSelectInput
                                nameList={[
                                  {
                                    name: "bulk_remove_tag",
                                    notitle: "true",
                                    inputprops: {
                                      name: "bulk_remove_tag",
                                      id: "bulk_remove_tag",
                                      initialTittle: "Select Tag",
                                      options: tagData || [],
                                      close: !!bulkRemoveTag,
                                      setvalue: (_, val) => setBulkRemoveTag(val?.id || val || ""),
                                    },
                                    setvalue: (_, val) => setBulkRemoveTag(val?.id || val || ""),
                                  },
                                ]}
                              />
                            </div>
                          ) : null}

                          {bulkAction === "set_market" ? (
                            <div style={{ minWidth: 260 }}>
                              <label className="form-label mb-1">Select Market(s)</label>
                              <div className="d-flex gap-2">
                                {marketOptions.map((m) => (
                                  <div key={m.id} className="form-check">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      id={`market-${m.id}`}
                                      checked={bulkMarket.includes(m.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setBulkMarket([...bulkMarket, m.id]);
                                        else setBulkMarket(bulkMarket.filter((id) => id !== m.id));
                                      }}
                                    />
                                    <label className="form-check-label" htmlFor={`market-${m.id}`}>
                                      {m.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {bulkAction === "price_update" ? (
                            <>
                              <div>
                                <label className="form-label mb-1">Mode</label>
                                <select className="form-select form-select-sm" value={bulkPriceMode} onChange={(e) => setBulkPriceMode(e.target.value)}>
                                  <option value="fixed">Fixed Amount</option>
                                  <option value="percent">Percentage</option>
                                </select>
                              </div>
                              <div>
                                <label className="form-label mb-1">Value</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={bulkPriceValue}
                                  onChange={(e) => setBulkPriceValue(e.target.value)}
                                  placeholder="e.g. 10 or 5%"
                                  step="0.01"
                                />
                              </div>
                            </>
                          ) : null}

                          {bulkAction === "image_upload" ? (
                            <div>
                              <label className="form-label mb-1">CSV/ZIP</label>
                              <input type="file" className="form-control form-control-sm" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="products-count-summary mb-2">
                  <div className="products-count-chip is-total">
                    <span className="products-count-label">{t("MatchingProducts") || "Matching products"}</span>
                    <strong className="products-count-value">{resolvedTotalProducts.toLocaleString()}</strong>
                  </div>
                  {resolvedSelectedCount > 0 && (
                    <div className={`products-count-chip ${selectAllProducts ? "is-selected-all" : "is-selected"}`}>
                      <span className="products-count-label">
                        {selectAllProducts
                          ? t("AllFilteredProductsSelected") || "All filtered products selected"
                          : t("SelectedProducts") || "Selected products"}
                      </span>
                      <strong className="products-count-value">{resolvedSelectedCount.toLocaleString()}</strong>
                    </div>
                  )}
                </div>

                <AllProductTable
                  ref={tableRef}
                  url={product}
                  moduleName="Product"
                  searchValue={searchValue}
                  isCheck={selectedProductIds}
                  setIsCheck={(ids) => { setSelectedProductIds(ids); setSelectAllProducts(false); }}
                  onPublishReadinessChange={setPublishReadinessById}
                  viewMode={viewMode}
                  selectedMarket={selectedMarket}
                  isReplicate={{ title: "Duplicate", replicateAPI: "replicate" }}
                  exportSelectedUrl={ProductExportSelectedAPI}
                  onQueryParamsChange={handleTableQueryChange}
                  onTotalChange={setTotalProducts}
                  filterHeader={{
                    noSearch: true,
                    customTitle: "Products",
                    customTitleRight: (
                      <div className="products-header-actions">
                        {canCreate ? (
                          <Link href="/product/create" className="btn btn-theme products-add-btn">
                            <FiPlus />
                            <span>{t("AddProduct") || "Add Product"}</span>
                          </Link>
                        ) : null}

                        <BulkProductImport
                          defaultAction="new_sell"
                          refetch={() => tableRef.current?.call?.()}
                        />
                      </div>
                    ),
                  }}
                  paramsProps={paramsProps}
                  statusCounter={deriveProductStatusCounts}
                />

                {selectedProductIds.length > 0 && !selectAllProducts && resolvedTotalProducts > selectedProductIds.length && (
                  <div className="alert alert-info py-2 px-3 mb-2 d-flex align-items-center gap-2" style={{ fontSize: "0.875rem" }}>
                    <span>{selectedProductIds.length} {t("ProductsSelected") || "products selected on this page"}.</span>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setSelectAllProducts(true); }}
                      style={{ fontWeight: 600 }}
                    >
                      {t("SelectAll") || "Select all"} {resolvedTotalProducts} {t("Products") || "products"}
                    </a>
                  </div>
                )}
                {selectAllProducts && (
                  <div className="alert alert-warning py-2 px-3 mb-2 d-flex align-items-center gap-2" style={{ fontSize: "0.875rem" }}>
                    <strong>{t("AllSelected") || "All"} {resolvedTotalProducts} {t("ProductsSelected") || "products selected"}.</strong>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); clearSelection(); }}
                    >
                      {t("ClearSelection") || "Clear selection"}
                    </a>
                  </div>
                )}

              </div>

              <EffectSaver values={values} />
              <FilterRehydrator
                values={values}
                setFieldValue={setFieldValue}
                tagOptions={tagData}
                brandOptions={brandData}
                storeOptions={storeData}
                onClearStored={() => {
                  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
                }}
              />
            </Form>
          );
        }}
      </Formik>
    </Col>
  );
};

const EffectSaver = ({ values }) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    }
  }, [values]);

  return null;
};

const normalizeOptionIdSet = (options) => {
  const ids = new Set();
  (options || []).forEach((opt) => {
    if (opt?.id === undefined || opt?.id === null) return;
    ids.add(String(opt.id));
  });
  return ids;
};

const filterValidIds = (ids, options) => {
  const optionIds = normalizeOptionIdSet(options);
  return (ids || []).filter((id) => optionIds.has(String(id)));
};

const FilterRehydrator = ({ values, setFieldValue, tagOptions, brandOptions, storeOptions, onClearStored }) => {
  useEffect(() => {
    if (!Array.isArray(values?.tag_ids)) {
      setFieldValue("tag_ids", normalizeIdArray(values?.tag_ids));
    }
  }, [values?.tag_ids, setFieldValue]);

  useEffect(() => {
    if (!Array.isArray(values?.brand_ids)) {
      setFieldValue("brand_ids", normalizeIdArray(values?.brand_ids));
    }
  }, [values?.brand_ids, setFieldValue]);

  useEffect(() => {
    if (!Array.isArray(values?.store_ids)) {
      setFieldValue("store_ids", normalizeIdArray(values?.store_ids));
    }
  }, [values?.store_ids, setFieldValue]);

  useEffect(() => {
    if (!Array.isArray(values?.problem_filters)) {
      setFieldValue("problem_filters", normalizeStringArray(values?.problem_filters));
    }
  }, [values?.problem_filters, setFieldValue]);

  useEffect(() => {
    const ids = normalizeIdArray(values?.tag_ids);
    if (!ids.length || !Array.isArray(tagOptions) || !tagOptions.length) return;
    const valid = filterValidIds(ids, tagOptions);
    if (valid.length !== ids.length) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Products] Clearing invalid tag_ids from saved filters", { ids, valid });
      }
      setFieldValue("tag_ids", valid);
      valid.length === 0 && onClearStored?.();
    }
  }, [values?.tag_ids, tagOptions, setFieldValue, onClearStored]);

  useEffect(() => {
    const ids = normalizeIdArray(values?.brand_ids);
    if (!ids.length || !Array.isArray(brandOptions) || !brandOptions.length) return;
    const valid = filterValidIds(ids, brandOptions);
    if (valid.length !== ids.length) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Products] Clearing invalid brand_ids from saved filters", { ids, valid });
      }
      setFieldValue("brand_ids", valid);
      valid.length === 0 && onClearStored?.();
    }
  }, [values?.brand_ids, brandOptions, setFieldValue, onClearStored]);

  useEffect(() => {
    const ids = normalizeIdArray(values?.store_ids);
    if (!ids.length || !Array.isArray(storeOptions) || !storeOptions.length) return;
    const valid = filterValidIds(ids, storeOptions);
    if (valid.length !== ids.length) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Products] Clearing invalid store_ids from saved filters", { ids, valid });
      }
      setFieldValue("store_ids", valid);
      valid.length === 0 && onClearStored?.();
    }
  }, [values?.store_ids, storeOptions, setFieldValue, onClearStored]);

  return null;
};

export default AllProducts;
