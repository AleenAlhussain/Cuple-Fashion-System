import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import request from "@/utils/axiosUtils";
import { PagesAPI } from "@/utils/axiosUtils/API";

const STORE_BASE_URL = (process.env.NEXT_PUBLIC_STORE_URL || "https://cuple.shop").replace(/\/+$/, "");

const toSlug = (value) =>
  value
    ? value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    : "";

const AllPagesTable = ({ data, refetch, isCheck, setIsCheck, statusFilter = "", setStatusFilter, ...props }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const getStatusMeta = (value) => {
    const normalized = value === undefined || value === null ? "" : value;
    const numeric = Number(normalized);
    if (!Number.isNaN(numeric)) {
      if (numeric === 2) return { label: t("Published") || "Published", className: "status-published" };
      if (numeric === 1) return { label: t("Active") || "Active", className: "status-active" };
      return { label: t("Draft") || "Draft", className: "status-draft" };
    }
    const str = normalized.toString().toLowerCase();
    if (str === "published") return { label: t("Published") || "Published", className: "status-published" };
    if (str === "active") return { label: t("Active") || "Active", className: "status-active" };
    return { label: t("Draft") || "Draft", className: "status-draft" };
  };

  const handleCopy = (value) => {
    if (!value) return;
    if (typeof navigator !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
  };

  const handleDuplicate = async (page) => {
    if (!page?.id) return;
    try {
      await request({ url: `${PagesAPI}/${page.id}/duplicate`, method: "post" }, router);
      refetch && refetch();
    } catch (error) {
      console.error("Duplicate page failed", error);
    }
  };

  const applyStatusUpdate = async (ids, status) => {
    await Promise.all(
      ids.map((id) =>
        request(
          {
            url: `${PagesAPI}/${id}`,
            method: "put",
            data: { status },
          },
          router
        )
      )
    );
  };

  const handleBulkApply = async () => {
    if (!bulkAction || !isCheck?.length) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "delete") {
        await Promise.all(
          isCheck.map((id) =>
            request(
              {
                url: `${PagesAPI}/${id}`,
                method: "delete",
              },
              router
            )
          )
        );
      } else if (bulkAction === "enable") {
        await applyStatusUpdate(isCheck, 1);
      } else if (bulkAction === "disable") {
        await applyStatusUpdate(isCheck, 0);
      }
      refetch && refetch();
      setIsCheck && setIsCheck([]);
    } catch (error) {
      console.error("Bulk action failed", error);
    } finally {
      setBulkLoading(false);
      setBulkAction("");
    }
  };

  const normalizedData = Array.isArray(data) ? data : data?.data ?? data?.data?.data ?? [];
  const pages = useMemo(() => {
    if (!Array.isArray(normalizedData)) return [];
    return normalizedData.map((page) => {
      const slug =
        page?.slug || page?.page_slug || page?.name_slug || (page?.title ? toSlug(page.title) : "");
      const pageUrl = slug ? `${STORE_BASE_URL}/${slug}` : "";
      const pageType = page?.type || page?.page_type || page?.template || page?.layout || "page";
      const statusMeta = getStatusMeta(page?.status);
      return { ...page, slug, page_url: pageUrl, type: pageType, _statusMeta: statusMeta };
    });
  }, [normalizedData]);

  const filteredPages = useMemo(() => {
    if (!Array.isArray(pages)) return [];
    if (!statusFilter) return pages;
    const filterKey = statusFilter.toLowerCase();
    return pages.filter((page) => {
      const label = page?._statusMeta?.label?.toString()?.toLowerCase?.() || "";
      if (filterKey === "published") return label === "published";
      if (filterKey === "active") return label === "active";
      if (filterKey === "draft") return label === "draft";
      return true;
    });
  }, [pages, statusFilter]);

  const headerObj = {
    checkBox: true,
    isOption: edit == false && destroy == false ? false : true,
    isSerialNo: false,
    noEdit: edit ? false : true,
    disableRowClick: true,
    optionHead: { title: "Action", duplicateAction: handleDuplicate },
    column: [
      { title: "Title", apiKey: "title", sorting: true, sortBy: "desc" },
      { title: "Slug", apiKey: "slug", sorting: true },
      {
        title: "PageURL",
        apiKey: "page_url",
        render: (row) =>
          row.page_url ? (
            <div className="d-flex align-items-center gap-2">
              <span className="text-truncate" style={{ maxWidth: 260 }}>
                {row.page_url}
              </span>
              <button
                type="button"
                className="btn btn-outline-light btn-sm px-2 py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(row.page_url);
                }}
              >
                {t("Copy") || "Copy"}
              </button>
            </div>
          ) : (
            "-"
          ),
      },
      { title: "CreateAt", apiKey: "created_at", sorting: true, sortBy: "desc", type: "date" },
      {
        title: "Status",
        apiKey: "status",
        sorting: true,
        render: (row) => (
          <div className={`status-badge ${row?._statusMeta?.className || "status-draft"}`}>
            <span>{row?._statusMeta?.label || t("Draft") || "Draft"}</span>
          </div>
        ),
      },
      { title: "Type", apiKey: "type", sorting: true },
    ],
    data: filteredPages,
  };

  if (!data) return null;

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <select
          className="form-select form-select-sm w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter && setStatusFilter(e.target.value)}
        >
          <option value="">{t("PageStatus") || "Page Status"}</option>
          <option value="published">{t("Published") || "Published"}</option>
          <option value="active">{t("Active") || "Active"}</option>
          <option value="draft">{t("Draft") || "Draft"}</option>
        </select>
        <select
          className="form-select form-select-sm w-auto"
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value)}
        >
          <option value="">{t("BulkActions") || "Bulk Actions"}</option>
          <option value="delete">{t("Delete") || "Delete"}</option>
          <option value="disable">{t("Disable") || "Disable"}</option>
          <option value="enable">{t("Enable") || "Enable"}</option>
        </select>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!bulkAction || !isCheck?.length || bulkLoading}
          onClick={handleBulkApply}
        >
          {bulkLoading ? t("Loading") || "Applying..." : t("Apply") || "Apply"}
        </button>
        <span className="text-muted small">
          {t("Selected") || "Selected"}: {isCheck?.length || 0}
        </span>
      </div>
      <ShowTable {...props} headerData={headerObj} refetch={refetch} />
    </>
  );
};

export default TableWrapper(AllPagesTable);
