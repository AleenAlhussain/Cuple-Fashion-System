import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiFileCopyLine, RiImageAddLine, RiSaveLine } from "react-icons/ri";
import { product } from "../../utils/axiosUtils/API";
import { placeHolderImage } from "@/data/CommonPath";
import request from "@/utils/axiosUtils";
import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import Loader from "../commonComponent/Loader";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import useDelete from "@/utils/hooks/useDelete";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";

const INTERNAL_MEDIA_HOSTS = ["api.cuple.shop", "admin.cuple.shop", "cuple.shop", "localhost", "127.0.0.1"];

const AllProductTable = ({ data, viewMode, selectedMarket, refetch, onPublishReadinessChange, ...props }) => {
  const { t } = useTranslation("common");
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const { mutate: moveProductToTrash } = useDelete(product, product);
  const [copiedSku, setCopiedSku] = useState("");
  const copyTimer = useRef(null);
  const [rows, setRows] = useState([]);
  const [priceEdits, setPriceEdits] = useState({});
  const [dirtyPrices, setDirtyPrices] = useState({});
  const [savingPrices, setSavingPrices] = useState({});

  const priceKey = selectedMarket ? `sale_price_${selectedMarket}` : "sale_price";
  const stockKey = selectedMarket ? `stock_status_${selectedMarket}` : "stock_status";

  useEffect(() => {
    setRows(Array.isArray(data) ? data : []);
  }, [data]);

  const normalizePriceValue = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const translateOr = useCallback(
    (key, fallback) => {
      const translated = t(key);
      return translated && translated !== key ? translated : fallback;
    },
    [t]
  );

  const isVariantRow = (row) =>
    row?.parent_id ||
    row?.variation_id ||
    row?.variant_id ||
    row?.is_variant ||
    row?.type === "variation" ||
    row?.product_type === "variation";

  const getRowPrice = (row) => {
    if (isVariantRow(row)) {
      return row[priceKey] ?? row.sale_price ?? row.price ?? 0;
    }
    return row[priceKey] ?? row.sale_price ?? row.price ?? 0;
  };

  const getRowStockQty = (row) => {
    const candidate = row?.stock_quantity ?? row?.quantity ?? row?.stock ?? row?.total_stock ?? 0;
    const qty = Number(candidate);
    return Number.isFinite(qty) ? qty : 0;
  };

  const getStockStatus = (qty) => {
    if (qty > 3) {
      return { label: translateOr("InStock", "In Stock"), color: "#1f9d55", className: "stock-in" };
    }
    if (qty > 0) {
      return { label: translateOr("LowStock", "Low Stock"), color: "#d97706", className: "stock-low" };
    }
    return { label: translateOr("OutOfStock", "Out of Stock"), color: "#dc2626", className: "stock-out" };
  };

  const resolveThumbnailUrl = (row) => {
    if (typeof row?.product_thumbnail === "string") {
      return row.product_thumbnail;
    }
    return (
      row?.product_thumbnail?.original_url ||
      row?.product_thumbnail?.image_url ||
      row?.product_thumbnail?.image ||
      row?.image ||
      ""
    );
  };

  const isExternalImageUrl = useCallback((rawUrl) => {
    if (typeof rawUrl !== "string") return false;
    const value = rawUrl.trim();
    if (!/^https?:\/\//i.test(value)) return false;

    try {
      const host = new URL(value).hostname.toLowerCase();
      return !INTERNAL_MEDIA_HOSTS.some(
        (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
      );
    } catch {
      return false;
    }
  }, []);

  const getPublishIssues = useCallback(
    (row) => {
      if (Array.isArray(row?.publish_issues) && row.publish_issues.length) {
        return row.publish_issues.filter(Boolean);
      }

      const issues = [];
      const thumbnailUrl = resolveThumbnailUrl(row);
      const hasImage = Boolean(
        row?.product_thumbnail_id ||
          row?.product_thumbnail?.id ||
          row?.thumbnail_id ||
          (typeof thumbnailUrl === "string" && thumbnailUrl.trim() !== "")
      );
      if (!hasImage) {
        issues.push(translateOr("MainImageIsRequired", "Main image is required"));
      } else if (isExternalImageUrl(thumbnailUrl)) {
        issues.push("Image is hosted externally; local upload is required");
      }

      const regularPrice = Number(row?.price);
      if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
        issues.push(
          translateOr(
            "RegularPriceMustBeGreaterThanZero",
            "Regular price must be greater than 0"
          )
        );
      }

      const stockQty = Number(row?.stock_quantity);
      const stockStatusValue = row?.stock_status ?? row?.[stockKey];
      if (!Number.isFinite(stockQty) || stockQty < 0 || !stockStatusValue) {
        issues.push(translateOr("StockIsRequired", "Stock is required"));
      }

      const categoryCount =
        Number(row?.category_count ?? row?.categories_count) ||
        (Array.isArray(row?.categories) ? row.categories.length : 0);
      if (categoryCount < 1) {
        issues.push(
          translateOr("AtLeastOneCategoryIsRequired", "At least one category is required")
        );
      }

      if (!String(row?.sku || "").trim()) {
        issues.push(translateOr("SkuIsRequired", "SKU is required"));
      }

      return Array.from(new Set(issues));
    },
    [isExternalImageUrl, stockKey, translateOr]
  );

  const updateInline = async (row, payload) => {
    try {
      await request({ url: `${product}/${row.id}`, method: "put", data: payload });
      refetch && refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const savePrice = async (row) => {
    if (!edit) return;
    const rawValue = priceEdits[row.id];
    const priceValue = normalizePriceValue(rawValue ?? getRowPrice(row));
    if (priceValue < 0) return;
    if (!dirtyPrices[row.id]) return;

    const isVariant = isVariantRow(row);
    const endpoint = isVariant ? `/variant/${row.id}` : `${product}/${row.id}/price`;
    const payload = { price: priceValue, sale_price: priceValue };

    setSavingPrices((prev) => ({ ...prev, [row.id]: true }));
    try {
      await request({ url: endpoint, method: "patch", data: payload });
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? { ...item, [priceKey]: priceValue, sale_price: priceValue, price: priceValue }
            : item
        )
      );
      setDirtyPrices((prev) => ({ ...prev, [row.id]: false }));
      ToastNotification("success", "Price updated");
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPrices((prev) => ({ ...prev, [row.id]: false }));
    }
  };

  const uploadImage = async (row, file) => {
    if (!file) return;
    const form = new FormData();
    form.append("image", file);
    try {
      await request({ url: `${product}/${row.id}/image`, method: "post", data: form, headers: { "Content-Type": "multipart/form-data" } });
      refetch && refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const qualityScore = (row) => {
    let score = 0;
    const checks = [
      !!row.product_thumbnail,
      !!row.name,
      !!row.description,
      (row.category_count > 0 || row.categories_count > 0),
      !!row.brand_id,
    ];
    checks.forEach((ok) => (score += ok ? 20 : 0));
    return score;
  };

  const toNameList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item : item?.name || item?.title || item?.label || item?.slug))
        .filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const pickList = (...candidates) => {
    for (const candidate of candidates) {
      const list = toNameList(candidate);
      if (list.length) return list;
    }
    return [];
  };

  const getCategoryList = (row) => pickList(row.categories, row.category_list, row.category_names, row.category_name);
  const getTagList = (row) => pickList(row.tags, row.tag_list, row.tag_names, row.tag_name);

  const handleCopySku = (value) => {
    if (!value) return;
    navigator?.clipboard?.writeText(value).catch(() => {});
    setCopiedSku(value);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedSku(""), 1400);
  };

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (typeof onPublishReadinessChange !== "function") return;

    const readinessMap = {};
    (rows || []).forEach((row) => {
      const issues = getPublishIssues(row);
      readinessMap[row.id] = {
        publishReady: issues.length === 0,
        reasons: issues,
        name: row?.name || "",
      };
    });

    onPublishReadinessChange(readinessMap);
  }, [rows, getPublishIssues, onPublishReadinessChange]);

  const mappedData = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => {
      const priceVal = getRowPrice(row);
      const stockQty = getRowStockQty(row);
      const stockStatus = getStockStatus(stockQty);
      const stockVal = row[stockKey] ?? row.stock_status;
      const score = qualityScore(row);
      const isMissingImage = !row.product_thumbnail;
      const categoryList = getCategoryList(row);
      const tagList = getTagList(row);
      const currentEditValue =
        priceEdits[row.id] !== undefined ? priceEdits[row.id] : normalizePriceValue(priceVal);
      const isDirty = Boolean(dirtyPrices[row.id]);
      const isSaving = Boolean(savingPrices[row.id]);
      const publishIssues = getPublishIssues(row);
      const isPublishReady = publishIssues.length === 0;
      const visibleIssues = publishIssues.slice(0, 2);
      const extraIssueCount = Math.max(0, publishIssues.length - visibleIssues.length);

      return {
        ...row,
        publish_ready: isPublishReady,
        publish_issues: publishIssues,
        [priceKey]: priceVal,
        [stockKey]: stockVal,
        inlinePrice: (
          <div className={`product-price-cell ${isDirty ? "dirty" : ""}`}>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm product-price-input"
              value={currentEditValue}
              disabled={!edit || isSaving}
              onChange={(e) => {
                const nextValue = e.target.value;
                setPriceEdits((prev) => ({ ...prev, [row.id]: nextValue }));
                setDirtyPrices((prev) => ({
                  ...prev,
                  [row.id]: Number(nextValue) !== normalizePriceValue(priceVal),
                }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  savePrice(row);
                }
              }}
              onBlur={() => savePrice(row)}
            />
            {edit && (
              <button
                type="button"
                className="btn btn-light btn-sm product-price-save"
                disabled={!isDirty || isSaving}
                onClick={() => savePrice(row)}
                title={t("Save") || "Save"}
              >
                <RiSaveLine />
              </button>
            )}
          </div>
        ),
        inlineStock: (
          <span className={`product-stock-status ${stockStatus.className}`} style={{ color: stockStatus.color }}>
            {stockStatus.label}
          </span>
        ),
        product_name: (
          <div className="product-name-cell">
            <span className="product-name-text">{row.name}</span>
            {row?.name_ar ? (
              <span className="product-name-subtext" dir="rtl" style={{ fontFamily: 'inherit' }}>
                {row.name_ar}
              </span>
            ) : null}
            {row?.product_type || row?.type || row?.short_description ? (
              <span className="product-name-subtext">
                {row?.product_type || row?.type || row?.short_description}
              </span>
            ) : null}
            {!isPublishReady ? (
              <span
                className="publish-incomplete-badge"
                title={publishIssues.join(" • ")}
              >
                {t("Incomplete") || "Incomplete"}
              </span>
            ) : null}
            {publishIssues.length ? (
              <div className="publish-issues-list" title={publishIssues.join(" • ")}>
                {visibleIssues.map((issue, index) => (
                  <span key={`${row.id}-issue-${index}`} className="publish-issue-chip">
                    {issue}
                  </span>
                ))}
                {extraIssueCount > 0 ? (
                  <span className="publish-issue-more">
                    +{extraIssueCount} more
                  </span>
                ) : null}
              </div>
            ) : null}
            {!row?.is_active && publishIssues.length === 0 ? (
              <span className="publish-draft-note">
                {translateOr("Draft", "Draft")}: No blocking issue detected
              </span>
            ) : null}
          </div>
        ),
        category_display: (
          <div className="product-meta-list" title={categoryList.join(", ")}>
            {categoryList.length ? categoryList.join(", ") : "-"}
          </div>
        ),
        tag_display: (
          <div className="product-meta-list" title={tagList.join(", ")}>
            {tagList.length ? tagList.join(", ") : "-"}
          </div>
        ),
        sku_display: (
          <div className="product-sku-cell">
            <span className="product-sku-text">{row.sku || "-"}</span>
            {row.sku ? (
              <>
                <button
                  type="button"
                  className="btn btn-light btn-sm product-sku-copy"
                  title={t("CopySKU") || "Copy SKU"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopySku(row.sku);
                  }}
                >
                  <RiFileCopyLine />
                </button>
                <span className={`copy-tooltip ${copiedSku === row.sku ? "show" : ""}`}>
                  {t("Copied") || "Copied!"}
                </span>
              </>
            ) : null}
          </div>
        ),
        quality: (
          <div className="product-quality-wrap">
            <div
              className={`product-quality ${score < 60 ? "low" : score < 80 ? "mid" : "high"}`}
              title={
                publishIssues.length
                  ? `${score} / 100 • ${publishIssues.join(" • ")}`
                  : `${score} / 100${isMissingImage ? " - Missing image" : ""}`
              }
            >
              <span style={{ width: `${score}%` }} />
            </div>
            {publishIssues.length ? (
              <span className="product-quality-state issue">
                {publishIssues.length} issue{publishIssues.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="product-quality-state ok">
                Ready
              </span>
            )}
          </div>
        ),
        replace_image: (
          <div className="product-replace-image">
            <input
              id={`replace-${row.id}`}
              type="file"
              className="product-image-input"
              onChange={(e) => uploadImage(row, e.target.files?.[0])}
            />
            <label
              htmlFor={`replace-${row.id}`}
              className="btn btn-light btn-sm product-image-btn"
              title={t("ReplaceProductImage") || "Replace product image"}
            >
              <RiImageAddLine />
            </label>
          </div>
        ),
      };
    });
  }, [rows, priceKey, stockKey, edit, t, copiedSku, priceEdits, dirtyPrices, savingPrices, selectedMarket, getPublishIssues]);

  const headerObj = {
    checkBox: true,
    isOption: edit == false && destroy == false ? false : true,
    noEdit: edit ? false : true,
    disableRowClick: true,
    isSerialNo: false,
    optionHead: {
      title: "Action",
      show: "product",
      type: "download",
      modalTitle: t("Download"),
      trashAction: {
        titleKey: "MoveProductToTrash",
        descriptionKey: "MoveProductToTrashDescription",
        confirmKey: "MoveToTrash",
        triggerKey: "MoveToTrash",
      },
    },
    column: [
      { title: "Image", apiKey: "product_thumbnail", type: "image", placeHolderImage: placeHolderImage, class: "sticky-col product-image-col" },
      { title: "Name", apiKey: "name", sorting: true, sortBy: "desc", class: "sticky-col name-col", render: (row) => row.product_name },
      { title: "Category", apiKey: "category_display", render: (row) => row.category_display },
      { title: "Tag", apiKey: "tag_display", render: (row) => row.tag_display },
      { title: "SKU", apiKey: "sku", sorting: true, sortBy: "desc", render: (row) => row.sku_display },
      { title: "Price", apiKey: "inlinePrice", sorting: true },
      { title: "Stock", apiKey: "inlineStock", sorting: true },
      { title: "Quality", apiKey: "quality" },
      { title: "ReplaceImage", apiKey: "replace_image" },
    ],
    data: mappedData || [],
  };

  if (!data) return <Loader />;
  return (
    <>
      <ShowTable
        {...props}
        headerData={headerObj}
        mutate={moveProductToTrash}
        viewMode={viewMode}
        tableClassName={`products-table ${viewMode === "compact" ? "products-table-compact" : "products-table-expanded"}`}
      />
    </>
  );
};

export default TableWrapper(AllProductTable);






