"use client";

import AllCategoryTable from "@/components/category/AllCategoryTable";
import SearchCategory from "@/components/category/widgets/SearchCategory";
import Loader from "@/components/commonComponent/Loader";
import { Category } from "@/utils/axiosUtils/API";
import request from "@/utils/axiosUtils";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import useDelete from "@/utils/hooks/useDelete";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ButtonGroup, Card, CardBody, Col, Row } from "reactstrap";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CategoryCreate = () => {
  const { t } = useTranslation("common");
  const [create] = usePermissionCheck(["create"]);
  const [active, setActive] = useState([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [isCheck, setIsCheck] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkParent, setBulkParent] = useState("");
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filters, setFilters] = useState({ parent: "", status: "", minProducts: "", maxProducts: "", market: "" });
  const [reorderingId, setReorderingId] = useState(null);
  const router = useRouter();

  const {
    data,
    isLoading: tableLoading,
    refetch,
  } = useCustomQuery([Category], () => request({ url: Category }, router), {
    refetchOnWindowFocus: false,
    select: (res) => res?.data?.data?.data || res?.data?.data || [],
  });

  const { mutate: moveCategoryToTrash, isLoading: deleteLoading } = useDelete(Category, Category);

  const parentOptions = useMemo(() => {
    const flatten = (nodes = [], prefix = "") =>
      nodes.reduce((acc, node) => {
        acc.push({ id: node.id, name: `${prefix}${node.name}` });
        if (node.subcategories?.length) acc.push(...flatten(node.subcategories, `${prefix}- `));
        return acc;
      }, []);
    return flatten(data || []);
  }, [data]);

  const filteredCategories = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const term = search.trim().toLowerCase();
    const { parent, status, minProducts, maxProducts, market } = filters;
    const min = minProducts === "" ? null : Number(minProducts);
    const max = maxProducts === "" ? null : Number(maxProducts);

    const matchesFilters = (node) => {
      const parentName = node?.parent?.name?.toLowerCase?.() || "";
      const nameMatch =
        !term ||
        node?.name?.toLowerCase?.().includes(term) ||
        node?.slug?.toLowerCase?.().includes(term) ||
        parentName.includes(term);
      const parentMatch = !parent || node?.parent_id == parent;
      const statusMatch = status === "" ? true : String(node?.status ?? "") === status;
      const marketMatch = !market || (node?.market || node?.region || node?.country)?.toString?.().toLowerCase() === market.toLowerCase();
      const productCount = Number(node?.products_count ?? node?.products?.length ?? 0);
      const minMatch = min === null || productCount >= min;
      const maxMatch = max === null || productCount <= max;
      return nameMatch && parentMatch && statusMatch && marketMatch && minMatch && maxMatch;
    };

    const filterTree = (nodes) =>
      nodes.reduce((acc, node) => {
        const childMatches = node?.subcategories?.length ? filterTree(node.subcategories) : [];
        const selfMatches = matchesFilters(node);
        if (selfMatches || childMatches.length) {
          acc.push({ ...node, subcategories: childMatches });
        }
        return acc;
      }, []);

    return filterTree(data);
  }, [data, search, filters]);

  const flattenedFiltered = useMemo(() => {
    const flatten = (nodes = []) =>
      nodes.reduce((acc, node) => {
        acc.push(node);
        if (node.subcategories?.length) acc.push(...flatten(node.subcategories));
        return acc;
      }, []);
    return flatten(filteredCategories);
  }, [filteredCategories]);

  const handleReorder = async ({ id, parent_id, position, newOrder = [] }) => {
    setReorderingId(id);
    try {
      const updates = [];

      if (Array.isArray(newOrder) && newOrder.length > 0) {
        newOrder.forEach((entry) => {
          const payload = {
            sort_order: Number(entry.position || 0),
          };

          if (Number(entry.id) === Number(id)) {
            payload.parent_id = parent_id || null;
          }

          updates.push(
            request(
              {
                url: `${Category}/${entry.id}`,
                method: "put",
                data: payload,
              },
              router
            )
          );
        });
      } else {
        updates.push(
          request(
            {
              url: `${Category}/${id}`,
              method: "put",
              data: {
                parent_id: parent_id || null,
                sort_order: Number(position || 0),
              },
            },
            router
          )
        );
      }

      await Promise.all(updates);
      refetch && refetch();
    } catch (error) {
      console.error("Category reorder failed", error);
    } finally {
      setReorderingId(null);
    }
  };

  const handleBulkApply = async () => {
    if (!bulkAction || !isCheck.length) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "delete") {
        await Promise.all(
          isCheck.map((id) =>
            request(
              {
                url: `${Category}/${id}`,
                method: "delete",
              },
              router
            )
          )
        );
      } else if (bulkAction === "publish" || bulkAction === "draft") {
        const status = bulkAction === "publish" ? 1 : 0;
        await Promise.all(
          isCheck.map((id) =>
            request(
              {
                url: `${Category}/${id}`,
                method: "put",
                data: { status },
              },
              router
            )
          )
        );
      } else if (bulkAction === "change_parent" && bulkParent) {
        await Promise.all(
          isCheck.map((id) =>
            request(
              {
                url: `${Category}/${id}`,
                method: "put",
                data: { parent_id: bulkParent },
              },
              router
            )
          )
        );
      } else if (bulkAction === "merge" && bulkTarget) {
        const moveIds = isCheck.filter((id) => id !== Number(bulkTarget));
        if (moveIds.length) {
          await Promise.all(
            moveIds.map((id) =>
              request(
                {
                  url: `${Category}/${id}`,
                  method: "put",
                  data: { parent_id: bulkTarget },
                },
                router
              )
            )
          );
        }
      } else if (bulkAction === "archive") {
        await Promise.all(
          isCheck.map((id) =>
            request(
              {
                url: `${Category}/${id}`,
                method: "put",
                data: { status: 0 },
              },
              router
            )
          )
        );
      } else if (bulkAction === "add_tag" && bulkTag.trim()) {
        await Promise.all(
          isCheck.map((id) =>
            request(
              {
                url: `${Category}/${id}`,
                method: "put",
                data: { tag: bulkTag.trim() },
              },
              router
            )
          )
        );
      }
      refetch && refetch();
      setIsCheck([]);
    } catch (error) {
      console.error("Bulk action failed", error);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="card-spacing">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>{t("Categories")}</h4>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <ButtonGroup>
            <Button
              color={viewMode === "tree" ? "primary" : "light"}
              onClick={() => setViewMode("tree")}
              active={viewMode === "tree"}
            >
              {t("ViewAsTree")}
            </Button>
            <Button
              color={viewMode === "table" ? "primary" : "light"}
              onClick={() => setViewMode("table")}
              active={viewMode === "table"}
            >
              {t("ViewAsList")}
            </Button>
          </ButtonGroup>
          {create && (
            <Link href="/category/create">
              <Button color="primary">{t("AddCategory")}</Button>
            </Link>
          )}
        </div>
      </div>
      <Row>
        <Col xl="12" className="mb-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <select className="form-select w-auto" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
              <option value="">{t("BulkAction") || "Bulk Action"}</option>
              <option value="publish">{t("Publish") || "Publish"}</option>
              <option value="draft">{t("Draft") || "Draft"}</option>
              <option value="delete">{t("Delete") || "Delete"}</option>
              <option value="change_parent">{t("ChangeParent") || "Change Parent"}</option>
              <option value="merge">{t("MergeCategories") || "Merge Categories"}</option>
              <option value="archive">{t("Archive") || "Archive"}</option>
              <option value="add_tag">{t("AddTag") || "Add Tag"}</option>
            </select>
            {["change_parent", "merge"].includes(bulkAction) && (
              <select
                className="form-select w-auto"
                value={bulkAction === "merge" ? bulkTarget : bulkParent}
                onChange={(e) => {
                  bulkAction === "merge" ? setBulkTarget(e.target.value) : setBulkParent(e.target.value);
                }}
              >
                <option value="">{t("SelectCategory") || "Select Category"}</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            )}
            {bulkAction === "add_tag" && (
              <input
                className="form-control w-auto"
                placeholder={t("AddTag") || "Tag"}
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
              />
            )}
            <Button color="primary" disabled={!bulkAction || !isCheck.length || bulkLoading} onClick={handleBulkApply}>
              {bulkLoading ? t("Loading") || "Applying..." : t("Apply") || "Apply"}
            </Button>
            <div className="text-muted small">
              {t("Selected") || "Selected"}: {isCheck.length}
            </div>
          </div>
        </Col>
        <Col xl="12" className="mb-3">
          <div className="d-flex flex-wrap gap-2">
            <select
              className="form-select"
              value={filters.parent}
              onChange={(e) => setFilters((prev) => ({ ...prev, parent: e.target.value }))}
            >
              <option value="">{t("SelectCategory") || "All Parents"}</option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">{t("Status") || "Status"}</option>
              <option value="1">{t("Published") || "Published"}</option>
              <option value="0">{t("Draft") || "Draft"}</option>
            </select>
            <input
              type="number"
              className="form-control"
              placeholder={t("Min") || "Min Products"}
              value={filters.minProducts}
              onChange={(e) => setFilters((prev) => ({ ...prev, minProducts: e.target.value }))}
            />
            <input
              type="number"
              className="form-control"
              placeholder={t("Max") || "Max Products"}
              value={filters.maxProducts}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxProducts: e.target.value }))}
            />
            <select
              className="form-select"
              value={filters.market}
              onChange={(e) => setFilters((prev) => ({ ...prev, market: e.target.value }))}
            >
              <option value="">{t("Market") || "Market"}</option>
              <option value="uae">UAE</option>
              <option value="ksa">KSA</option>
            </select>
          </div>
        </Col>
        <Col xl="12">
          {viewMode === "tree" ? (
            <Card>
              <CardBody>
                {tableLoading ? (
                  <Loader />
                ) : (
                  <SearchCategory
                    mutate={moveCategoryToTrash}
                    deleteLoading={deleteLoading}
                    setSearch={setSearch}
                    data={filteredCategories}
                    active={active}
                    setActive={setActive}
                    search={search}
                    type="category"
                    onReorder={handleReorder}
                    reorderingId={reorderingId}
                  />
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <AllCategoryTable
                  url={Category}
                  data={flattenedFiltered}
                  fetchStatus={tableLoading ? "loading" : "success"}
                  current_page={1}
                  per_page={flattenedFiltered?.length || 10}
                  refetch={refetch}
                  isCheck={isCheck}
                  setIsCheck={setIsCheck}
                />
              </CardBody>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default CategoryCreate;
