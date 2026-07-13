import { useTranslation } from "react-i18next";
import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiCheckLine, RiLinkM } from "react-icons/ri";
import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import Loader from "../commonComponent/Loader";
import Avatar from "../commonComponent/Avatar";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import AccountContext from "../../helper/accountContext";
import { Category } from "@/utils/axiosUtils/API";
import useDelete from "@/utils/hooks/useDelete";
import request from "@/utils/axiosUtils";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const STORE_BASE_URL = (
  process.env.NEXT_PUBLIC_STORE_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  "https://cuple.shop"
).replace(/\/+$/, "");

const toSearchTerm = (category) => {
  const source = (category?.slug || category?.name || "").toString().toLowerCase().trim();
  const base = source.replace(/-\d+$/, "").replace(/[^a-z0-9-\s]/g, "").replace(/-/g, " ");
  const firstToken = base.split(/\s+/).find(Boolean) || "";

  if (firstToken.endsWith("s") && firstToken.length > 3) {
    return firstToken.slice(0, -1);
  }

  return firstToken;
};

const buildCategoryShopUrl = (category) => {
  const slug = (category?.slug || "").toString().trim();
  if (!slug) return `${STORE_BASE_URL}/shop`;

  const params = new URLSearchParams({ category: slug });
  const q = toSearchTerm(category);
  if (q) params.set("q", q);

  return `${STORE_BASE_URL}/shop?${params.toString()}`;
};

const AllCategoryTable = ({ data, isCheck, setIsCheck, ...props }) => {
  const { t } = useTranslation("common");
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const { role, setRole } = useContext(AccountContext);
  const router = useRouter();
  const { mutate: moveCategoryToTrash } = useDelete(Category, Category);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole && storedRole !== "undefined" && storedRole !== "null") {
      try {
        const parsedRole = JSON.parse(storedRole);
        if (parsedRole?.name) {
          setRole(parsedRole.name);
        }
      } catch (e) {
        localStorage.removeItem("role");
      }
    }
  }, []);

  const handleInlineUpdate = async (rowId, payload) => {
    setSaving({ id: rowId, key: Object.keys(payload)[0] });
    try {
      await request({ url: `${Category}/${rowId}`, method: "put", data: payload }, router);
      props.refetch && props.refetch();
    } catch (err) {
      console.error("Category inline update failed", err);
    } finally {
      setSaving(null);
    }
  };

  const parentOptions = useMemo(() => {
    const flatten = (nodes = []) =>
      nodes.reduce((acc, node) => {
        acc.push({ id: node.id, name: node.name });
        if (node.subcategories?.length) acc.push(...flatten(node.subcategories));
        return acc;
      }, []);
    return flatten(data || []);
  }, [data]);

  const isSaving = (rowId, key) => saving?.id === rowId && saving?.key === key;

  const InlineText = ({ row, apiKey }) => {
    const [value, setValue] = useState(row?.[apiKey] || "");
    useEffect(() => {
      setValue(row?.[apiKey] || "");
    }, [row?.[apiKey], row.id]);
    return (
      <div className="inline-edit">
        <input
          type="text"
          className="form-control form-control-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!edit}
        />
        <button
          className="btn btn-sm btn-light"
          disabled={isSaving(row.id, apiKey) || !edit}
          onClick={() => handleInlineUpdate(row.id, { [apiKey]: value })}
        >
          <RiCheckLine />
        </button>
      </div>
    );
  };

  const InlineParent = ({ row }) => {
    const [value, setValue] = useState(row?.parent_id ?? row?.parent?.id ?? "");
    useEffect(() => {
      setValue(row?.parent_id ?? row?.parent?.id ?? "");
    }, [row?.parent_id, row?.parent?.id, row.id]);
    const options = parentOptions.filter((option) => option.id !== row.id);
    return (
      <div className="inline-edit">
        <select
          className="form-select form-select-sm"
          value={value ?? ""}
          onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={!edit}
        >
          <option value="">{t("SelectCategory")}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        <button
          className="btn btn-sm btn-light"
          disabled={isSaving(row.id, "parent_id") || !edit}
          onClick={() => handleInlineUpdate(row.id, { parent_id: value || null })}
        >
          <RiCheckLine />
        </button>
      </div>
    );
  };

  const InlineStatus = ({ row }) => {
    const [value, setValue] = useState(Boolean(Number(row?.status)));
    useEffect(() => {
      setValue(Boolean(Number(row?.status)));
    }, [row?.status, row.id]);
    const toggle = async () => {
      const nextValue = !value;
      setValue(nextValue);
      await handleInlineUpdate(row.id, { status: nextValue ? 1 : 0 });
    };
    return (
      <div className="inline-edit">
        <div className="form-check form-switch m-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={value}
            disabled={!edit || isSaving(row.id, "status")}
            onChange={toggle}
          />
        </div>
      </div>
    );
  };

  const InlineNumber = ({ row, apiKey = "sort_order" }) => {
    const [value, setValue] = useState(Number(row?.[apiKey] ?? 0));

    useEffect(() => {
      setValue(Number(row?.[apiKey] ?? 0));
    }, [row?.[apiKey], row.id, apiKey]);

    return (
      <div className="inline-edit">
        <input
          type="number"
          min={0}
          className="form-control form-control-sm"
          value={Number.isNaN(value) ? 0 : value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={!edit}
        />
        <button
          className="btn btn-sm btn-light"
          disabled={isSaving(row.id, apiKey) || !edit}
          onClick={() => handleInlineUpdate(row.id, { [apiKey]: Number(value || 0) })}
        >
          <RiCheckLine />
        </button>
      </div>
    );
  };

  const headerObj = {
    checkBox: true,
    isOption: edit == false && destroy == false ? false : true,
    noEdit: edit ? false : true,
    isSerialNo: true,
    optionHead: {
      title: "Action",
      show: "category",
      type: "download",
      modalTitle: t("Download"),
      trashAction: {
        titleKey: "MoveCategoryToTrash",
        descriptionKey: "MoveCategoryToTrashDescription",
        confirmKey: "MoveToTrash",
        triggerKey: "MoveToTrash",
      },
    },
    column: [
      {
        title: "Image",
        apiKey: "image_url",
        type: "image",
        render: (row) => (
          <Avatar
            imageClass="tbl-image"
            data={row?.image_url ? { original_url: row.image_url } : row?.category_image || row?.category_icon}
            placeHolder={"/assets/images/placeholder/collection_category.png"}
            name={row?.name}
          />
        ),
      },
      { title: "Name", apiKey: "name", sorting: true, sortBy: "asc", render: (row) => <InlineText row={row} apiKey="name" /> },
      { title: "Parent", apiKey: "parent", render: (row) => <InlineParent row={row} /> },
      {
        title: "Slug",
        apiKey: "slug",
        render: (row) => (
          <div className="d-flex align-items-center gap-2">
            <InlineText row={row} apiKey="slug" />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary p-1"
              title="Copy category link"
              onClick={() => {
                const categoryUrl = buildCategoryShopUrl(row);
                navigator.clipboard.writeText(categoryUrl).then(() => {
                  ToastNotification("success", "Category link copied!");
                }).catch(() => {
                  ToastNotification("error", "Failed to copy link");
                });
              }}
            >
              <RiLinkM size={14} />
            </button>
          </div>
        )
      },
      { title: "Priority", apiKey: "sort_order", render: (row) => <InlineNumber row={row} apiKey="sort_order" /> },
      { title: "ProductsCount", apiKey: "products_count" },
      { title: "Status", apiKey: "status", render: (row) => <InlineStatus row={row} /> },
    ],
    data: data || [],
  };

  if (!data) return <Loader />;

  return (
    <>
      <ShowTable
        {...props}
        headerData={headerObj}
        mutate={moveCategoryToTrash}
        moduleName="category"
        keyInPermission="category"
        isCheck={isCheck}
        setIsCheck={setIsCheck}
      />
    </>
  );
};

export default TableWrapper(AllCategoryTable);
