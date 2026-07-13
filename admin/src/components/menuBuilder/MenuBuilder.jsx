"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "reactstrap";
import request from "@/utils/axiosUtils";
import { Menu, PagesAPI, Category } from "@/utils/axiosUtils/API";
import { checkPermission } from "../common/CheckPermissionList";

const staticLinks = [
  { id: "cart", title: "Cart", title_ar: "السلة", path: "/cart" },
  { id: "checkout", title: "Checkout", title_ar: "الدفع", path: "/checkout" },
  { id: "account", title: "Account", title_ar: "الحساب", path: "/account" },
  { id: "wishlist", title: "Wishlist", title_ar: "المفضلة", path: "/wishlist" },
];

const locationLabels = {
  primary: "Primary Menu",
  secondary: "Secondary Menu",
  footer_useful: "Footer Useful Links",
  footer_help: "Footer Help Center",
  off_canvas: "Off-Canvas Menu",
  logged_in_account: "Logged In Menu",
};

const generateUniqueId = () => `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const normalizeItems = (items = []) =>
  items.map((item) => ({
    ...item,
    id: String(item.id ?? generateUniqueId()),
    title: item.title ?? item.name ?? "Untitled",
    title_ar: item.title_ar ?? item.name_ar ?? "",
    path: item.path ?? "#",
    child: normalizeItems(item.child ?? []),
  }));

const flattenTree = (nodes, depth = 0) => {
  return nodes.reduce((result, node) => {
    result.push({
      id: node.id,
      label: `${"— ".repeat(depth)}${node.title || "Untitled"}`,
    });
    if (Array.isArray(node.child) && node.child.length > 0) {
      result.push(...flattenTree(node.child, depth + 1));
    }
    return result;
  }, []);
};

const getArrayAtPath = (items, path = []) => {
  if (path.length === 0) {
    return items;
  }
  const [index, ...rest] = path;
  const node = items[index];
  if (!node) return null;
  return getArrayAtPath(node.child || [], rest);
};

const replaceArrayAtPath = (items, path, newArray) => {
  if (path.length === 0) {
    return newArray;
  }
  const [index, ...rest] = path;
  return items.map((node, idx) => {
    if (idx !== index) {
      return node;
    }
    return {
      ...node,
      child: replaceArrayAtPath(node.child || [], rest, newArray),
    };
  });
};

const updateItemsAtPath = (items, path, updater) => {
  if (path.length === 0) return items;
  const [index, ...rest] = path;
  return items.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      return updater(node);
    }
    return {
      ...node,
      child: updateItemsAtPath(node.child || [], rest, updater),
    };
  });
};

const removeItemAtPath = (items, path) => {
  if (path.length === 1) {
    const copy = [...items];
    copy.splice(path[0], 1);
    return copy;
  }
  const [index, ...rest] = path;
  return items.map((node, idx) => {
    if (idx !== index) return node;
    return {
      ...node,
      child: removeItemAtPath(node.child || [], rest),
    };
  });
};

const moveItemAtPath = (items, path, direction) => {
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const parentArray = parentPath.length === 0 ? items : getArrayAtPath(items, parentPath);

  if (!parentArray) {
    return items;
  }

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= parentArray.length) {
    return items;
  }

  const updatedParent = [...parentArray];
  const [moved] = updatedParent.splice(index, 1);
  updatedParent.splice(targetIndex, 0, moved);

  return replaceArrayAtPath(items, parentPath, updatedParent);
};

const addChildAtPath = (items, path, child) => {
  if (path.length === 0) {
    return [...items, child];
  }
  const [index, ...rest] = path;
  return items.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      return {
        ...node,
        child: [...(node.child || []), child],
      };
    }
    return {
      ...node,
      child: addChildAtPath(node.child || [], rest, child),
    };
  });
};

const findPathById = (items, targetId, path = []) => {
  for (let index = 0; index < items.length; index += 1) {
    const node = items[index];
    const currentPath = [...path, index];
    if (node.id === targetId) {
      return currentPath;
    }
    if (Array.isArray(node.child) && node.child.length > 0) {
      const childPath = findPathById(node.child, targetId, currentPath);
      if (childPath) {
        return childPath;
      }
    }
  }
  return null;
};

const createMenuItem = ({ title, title_ar = "", path, link_type = "link" }) => ({
  id: generateUniqueId(),
  title: title || "Untitled Item",
  title_ar: title_ar || "",
  path: path || "#",
  link_type,
  target_blank: false,
  badge_text: "",
  badge_color: "bg-danger",
  mega_menu: 0,
  mega_menu_type: "simple",
  child: [],
});

const MenuBuilder = () => {
  const [menus, setMenus] = useState([]);
  const [locationsMap, setLocationsMap] = useState({});
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [details, setDetails] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuSettings, setMenuSettings] = useState({ auto_add_new_top_level_pages: false });
  const [menuLocations, setMenuLocations] = useState([]);
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuNameAr, setNewMenuNameAr] = useState("");
  const [renameName, setRenameName] = useState("");
  const [renameNameAr, setRenameNameAr] = useState("");
  const [parentTarget, setParentTarget] = useState("");
  const [customLink, setCustomLink] = useState({ title: "", title_ar: "", url: "" });
  const [message, setMessage] = useState(null);
  const hasMenuPermission = useMemo(() => checkPermission("menu.index"), []);

  const loadMenus = async () => {
    try {
      setLoading(true);
      const response = await request({ url: Menu });
      const payload = response?.data?.data ?? {};
      setMenus(payload?.data ?? []);
      setLocationsMap(payload?.locations ?? {});
      setAvailableLocations(payload?.available_locations ?? []);

      if (!selectedMenuId && Array.isArray(payload?.data) && payload.data.length > 0) {
        setSelectedMenuId(payload.data[0].id);
      }

      if (!payload?.data?.length) {
        setSelectedMenuId(null);
        setDetails(null);
        setMenuItems([]);
        setMenuSettings({ auto_add_new_top_level_pages: false });
        setMenuLocations([]);
        setRenameName("");
        setRenameNameAr("");
      }
    } catch (error) {
      setMessage({ type: "danger", text: error?.response?.data?.message ?? "Unable to load menus" });
    } finally {
      setLoading(false);
    }
  };

  const loadMenuDetails = async (menuId) => {
    if (!menuId) {
      return;
    }
    try {
      setLoading(true);
      const response = await request({ url: `${Menu}/${menuId}` });
      const payload = response?.data?.data ?? {};
      setDetails(payload);
      setMenuItems(normalizeItems(payload.items));
      setMenuSettings(payload.settings ?? { auto_add_new_top_level_pages: false });
      setMenuLocations(Array.isArray(payload.locations) ? payload.locations : []);
      setRenameName(payload.name ?? "");
      setRenameNameAr(payload.name_ar ?? "");
    } catch (error) {
      setMessage({ type: "danger", text: error?.response?.data?.message ?? "Unable to load menu" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPages = async () => {
    try {
      const response = await request({ url: PagesAPI });
      const payload = response?.data?.data ?? [];
      setPages(
        payload.map((page) => ({
          id: `page-${page.id}`,
          title: page.title,
          title_ar: page.title_ar ?? "",
          path: `/${page.slug}`,
        }))
      );
    } catch (error) {
      console.warn("Failed to load pages", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await request({ url: Category });
      const payload = response?.data?.data ?? [];
      setCategories(
        payload.map((cat) => ({
          id: `cat-${cat.id}`,
          title: cat.name ?? cat.title,
          title_ar: cat.name_ar ?? cat.title_ar ?? "",
          path: `/category/${cat.slug}`,
        }))
      );
    } catch (error) {
      console.warn("Failed to load categories", error);
    }
  };

  useEffect(() => {
    if (!hasMenuPermission) return;
    loadMenus();
    fetchPages();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMenuPermission]);

  useEffect(() => {
    if (!hasMenuPermission) return;
    if (selectedMenuId) {
      loadMenuDetails(selectedMenuId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenuId, hasMenuPermission]);

  useEffect(() => {
    if (!hasMenuPermission) return;
    if (
      menuSettings?.auto_add_new_top_level_pages &&
      Array.isArray(pages) &&
      pages.length > 0
    ) {
      setMenuItems((prev) => {
        const existingPaths = new Set(prev.map((item) => item?.path));
        const additions = pages
          .map((page) => ({
            title: page.title,
            title_ar: page.title_ar,
            path: page.slug ? `/${page.slug}` : page.url,
          }))
          .filter((page) => page.path && !existingPaths.has(page.path));

        if (!additions.length) {
          return prev;
        }

        return [...prev, ...additions.map((entry) => createMenuItem(entry))];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, menuSettings?.auto_add_new_top_level_pages]);

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) {
      setMessage({ type: "warning", text: "Menu name is required" });
      return;
    }

    try {
      setActionLoading(true);
      const response = await request({
        method: "POST",
        url: Menu,
        data: {
          name: newMenuName.trim(),
          name_ar: newMenuNameAr.trim() || null,
          items: [],
          settings: { ...menuSettings },
          locations: [],
        },
      });
      const created = response?.data?.data ?? {};
      setMessage({ type: "success", text: "Menu created" });
      setNewMenuName("");
      setNewMenuNameAr("");
      await loadMenus();
      if (created.id) {
        setSelectedMenuId(created.id);
      }
    } catch (error) {
      setMessage({ type: "danger", text: error?.response?.data?.message ?? "Unable to create menu" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameMenu = async () => {
    if (!details?.id) {
      return;
    }

    const trimmed = renameName.trim();
    const trimmedAr = renameNameAr.trim();
    const noEnglishChange = trimmed === (details.name || "");
    const noArabicChange = trimmedAr === (details.name_ar || "");
    if (!trimmed || (noEnglishChange && noArabicChange)) {
      return;
    }

    try {
      setActionLoading(true);
      await request({
        method: "PUT",
        url: `${Menu}/${details.id}`,
        data: {
          name: trimmed,
          name_ar: trimmedAr || null,
        },
      });
      setMessage({ type: "success", text: "Menu renamed" });
      await loadMenus();
      await loadMenuDetails(details.id);
    } catch (error) {
      setMessage({ type: "danger", text: error?.response?.data?.message ?? "Unable to rename menu" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    if (!details) {
      return;
    }

    try {
      setActionLoading(true);
      await request({
        method: "PUT",
        url: `${Menu}/${details.id}`,
        data: {
          name: renameName.trim() || details.name,
          name_ar: renameNameAr.trim() || null,
          items: menuItems,
          settings: menuSettings,
          locations: menuLocations,
        },
      });
      setMessage({ type: "success", text: "Menu saved" });
      await loadMenus();
      await loadMenuDetails(details.id);
    } catch (error) {
      setMessage({ type: "danger", text: error?.response?.data?.message ?? "Unable to save menu" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!details || !details.id) {
      return;
    }
    const confirmed = window.confirm("Delete this menu? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      await request({
        method: "DELETE",
        url: `${Menu}/${details.id}`,
      });
      setMessage({ type: "success", text: "Menu deleted" });
      setDetails(null);
      setMenuItems([]);
      setSelectedMenuId(null);
      setMenuSettings({ auto_add_new_top_level_pages: false });
      setMenuLocations([]);
      setRenameName("");
      setRenameNameAr("");
      await loadMenus();
    } catch (error) {
      setMessage({ type: "danger", text: error?.response?.data?.message ?? "Unable to delete menu" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddItems = (newItems, parentId) => {
    if (!Array.isArray(newItems) || newItems.length === 0) return;
    if (!parentId) {
      setMenuItems((prev) => [...prev, ...newItems]);
      return;
    }
    setMenuItems((prev) => {
      const path = findPathById(prev, parentId);
      if (!path) {
        return [...prev, ...newItems];
      }
      let updated = prev;
      newItems.forEach((item) => {
        updated = addChildAtPath(updated, path, item);
      });
      return updated;
    });
  };

  const updateItem = (path, modifier) => {
    setMenuItems((prev) =>
      updateItemsAtPath(prev, path, (node) => ({
        ...node,
        ...modifier(node),
      }))
    );
  };

  const removeItem = (path) => {
    setMenuItems((prev) => removeItemAtPath(prev, path));
  };

  const moveItem = (path, direction) => {
    setMenuItems((prev) => moveItemAtPath(prev, path, direction));
  };

  const addPlaceholderChild = (path) => {
    const child = createMenuItem({ title: "New Item", title_ar: "عنصر جديد", path: "#" });
    setMenuItems((prev) => addChildAtPath(prev, path, child));
  };

  const handleToggleLocation = (location) => {
    setMenuLocations((prev) =>
      prev.includes(location) ? prev.filter((item) => item !== location) : [...prev, location]
    );
  };

  const parentOptions = useMemo(() => flattenTree(menuItems), [menuItems]);

  const activeMenuLabel = details?.name || "Select a menu";
  const activeMenuLabelAr = details?.name_ar || "";

  if (!hasMenuPermission) {
    return (
      <div className="card card-spacing">
        <div className="card-body">
          <h5 className="mb-3">Menu Builder</h5>
          <div className="p-4 text-center">
            <div className="fw-semibold text-danger fs-4 mb-2">
              Permission Required
            </div>
            <div className="text-muted small fs-6">
              This section is available to administrators only.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-spacing">
      <div className="card-body">
        <h5 className="mb-3">Menu Builder</h5>
        <MenuSelector
          menus={menus}
          selectedMenuId={selectedMenuId}
          onChange={setSelectedMenuId}
          createMode={createMode}
          newMenuName={newMenuName}
          setNewMenuName={setNewMenuName}
          newMenuNameAr={newMenuNameAr}
          setNewMenuNameAr={setNewMenuNameAr}
          onCreate={handleCreateMenu}
          toggleCreateMode={() => setCreateMode((prev) => !prev)}
          loading={loading}
          activeLabel={activeMenuLabel}
          activeLabelAr={activeMenuLabelAr}
          message={message}
          clearMessage={() => setMessage(null)}
          renameName={renameName}
          setRenameName={setRenameName}
          renameNameAr={renameNameAr}
          setRenameNameAr={setRenameNameAr}
          onRename={handleRenameMenu}
        />

        <div className="row mt-4 g-3">
          <div className="col-md-4">
            <MenuItemsSidebar
              pages={pages}
              categories={categories}
              parentOptions={parentOptions}
              parentTarget={parentTarget}
              setParentTarget={setParentTarget}
              onAddItems={handleAddItems}
              customLink={customLink}
              setCustomLink={setCustomLink}
            />
          </div>
          <div className="col-md-8">
            <MenuStructurePanel
              items={menuItems}
              onUpdate={updateItem}
              onRemove={removeItem}
              onMove={moveItem}
              onAddChild={addPlaceholderChild}
              loading={loading}
            />
            <MenuSettingsPanel
              settings={menuSettings}
              onToggleAutoAdd={() =>
                setMenuSettings((prev) => ({
                  ...prev,
                  auto_add_new_top_level_pages: !prev.auto_add_new_top_level_pages,
                }))
              }
              availableLocations={availableLocations}
              selectedLocations={menuLocations}
              onToggleLocation={handleToggleLocation}
              locationsMap={locationsMap}
              onSave={handleSave}
              onDelete={handleDelete}
              saving={actionLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MenuSelector = ({
  menus,
  selectedMenuId,
  onChange,
  createMode,
  newMenuName,
  setNewMenuName,
  newMenuNameAr,
  setNewMenuNameAr,
  onCreate,
  toggleCreateMode,
  loading,
  activeLabel,
  activeLabelAr,
  message,
  clearMessage,
  renameName,
  setRenameName,
  renameNameAr,
  setRenameNameAr,
  onRename,
}) => {
  const renameDisabled =
    !renameName.trim() ||
    (renameName.trim() === activeLabel && renameNameAr.trim() === (activeLabelAr || ""));

  return (
    <div className="border rounded p-3">
      <div className="d-flex align-items-center flex-wrap gap-2">
        <label htmlFor="menu-picker" className="fw-semibold mb-0">
          Select a menu to edit:
        </label>
        <select
          id="menu-picker"
          className="form-control w-auto"
          value={selectedMenuId || ""}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">-- Choose a menu --</option>
          {menus.map((menu) => (
            <option key={menu.id} value={menu.id}>
              {menu.name || `Menu ${menu.id}`}
            </option>
          ))}
        </select>
        <Button color="primary" onClick={() => selectedMenuId && onChange(selectedMenuId)} disabled={loading}>
          Select
        </Button>
        <Button color={createMode ? "danger" : "secondary"} outline={!createMode} onClick={toggleCreateMode}>
          {createMode ? "Cancel" : "Create a new menu"}
        </Button>
        <div className="ms-auto fst-italic text-muted">Editing: {activeLabel}</div>
      </div>
      {createMode && (
        <div className="mt-3 border-top pt-3">
          <div className="mb-2">New menu name</div>
          <div className="d-flex gap-2 flex-wrap">
            <input
              className="form-control flex-grow-1"
              value={newMenuName}
              onChange={(event) => setNewMenuName(event.target.value)}
              placeholder="Enter menu title (English)"
            />
            <input
              className="form-control flex-grow-1"
              dir="rtl"
              value={newMenuNameAr}
              onChange={(event) => setNewMenuNameAr(event.target.value)}
              placeholder="Enter menu title (Arabic)"
            />
            <Button color="success" onClick={onCreate}>
              Create
            </Button>
          </div>
        </div>
      )}
      {selectedMenuId && !createMode && (
        <div className="mt-3 border-top pt-3">
          <div className="mb-2">Rename menu</div>
          <div className="d-flex gap-2 flex-wrap">
            <input
              className="form-control flex-grow-1"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              placeholder="Menu title (English)"
            />
            <input
              className="form-control flex-grow-1"
              dir="rtl"
              value={renameNameAr}
              onChange={(event) => setRenameNameAr(event.target.value)}
              placeholder="Menu title (Arabic)"
            />
            <Button color="info" onClick={onRename} disabled={renameDisabled}>
              Rename
            </Button>
          </div>
        </div>
      )}
      {message && (
        <div className={`alert alert-${message.type} mt-3 mb-0`} role="alert">
          {message.text}
          <button type="button" className="btn-close float-end" aria-label="Close" onClick={clearMessage} />
        </div>
      )}
    </div>
  );
};

const MenuItemsSidebar = ({
  pages,
  categories,
  parentOptions,
  parentTarget,
  setParentTarget,
  onAddItems,
  customLink,
  setCustomLink,
}) => {
  const tabs = ["pages", "categories", "static", "custom"];
  const [activeTab, setActiveTab] = useState("pages");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const available = useMemo(() => {
    if (activeTab === "pages") return pages;
    if (activeTab === "categories") return categories;
    if (activeTab === "static") return staticLinks;
    return [];
  }, [activeTab, categories, pages]);

  const handleAddSelections = () => {
    if (activeTab === "custom") {
      if (!customLink.title.trim() || !customLink.url.trim()) {
        return;
      }
      const item = createMenuItem({
        title: customLink.title.trim(),
        title_ar: customLink.title_ar.trim(),
        path: customLink.url.trim(),
        link_type: "link",
      });
      onAddItems([item], parentTarget || null);
      setCustomLink({ title: "", title_ar: "", url: "" });
      return;
    }

    const selectedItems = available.filter((item) => selectedIds.includes(item.id));
    if (!selectedItems.length) {
      return;
    }
    onAddItems(
      selectedItems.map((entry) =>
        createMenuItem({ title: entry.title, title_ar: entry.title_ar, path: entry.path })
      ),
      parentTarget || null
    );
    setSelectedIds([]);
  };

return (
  <div className="border rounded p-3 bg-white">
    <h6 className="mb-3">Add menu items</h6>
    <div className="d-flex gap-1 mb-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`btn btn-sm ${activeTab === tab ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>

    {activeTab !== "custom" && (
      <div className="border rounded p-2 max-height-270 overflow-auto mb-2">
        {available.length === 0 && <div className="text-muted">No items found</div>}
        {available.map((entry) => (
          <div className="form-check" key={entry.id}>
            <input
              className="form-check-input"
              type="checkbox"
              id={`menu-item-${entry.id}`}
              checked={selectedIds.includes(entry.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selectedIds, entry.id]
                  : selectedIds.filter((id) => id !== entry.id);
                setSelectedIds(next);
              }}
            />
            <label className="form-check-label" htmlFor={`menu-item-${entry.id}`}>
              <span>{entry.title}</span>
              {entry.title_ar ? <small className="d-block text-muted">{entry.title_ar}</small> : null}
            </label>
          </div>
        ))}
      </div>
    )}

    {activeTab === "custom" && (
      <div className="mb-3">
        <label className="form-label">Title</label>
        <input
          className="form-control"
          value={customLink.title}
          onChange={(event) => setCustomLink((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Menu label (English)"
        />
        <label className="form-label mt-2">Arabic Title</label>
        <input
          className="form-control"
          dir="rtl"
          value={customLink.title_ar}
          onChange={(event) => setCustomLink((prev) => ({ ...prev, title_ar: event.target.value }))}
          placeholder="Menu label (Arabic)"
        />
        <label className="form-label mt-2">URL</label>
        <input
          className="form-control"
          value={customLink.url}
          onChange={(event) => setCustomLink((prev) => ({ ...prev, url: event.target.value }))}
          placeholder="/shop"
        />
      </div>
    )}

    <div className="mb-3">
      <label className="form-label">Parent item</label>
      <select
        className="form-select"
        value={parentTarget || ""}
        onChange={(event) => setParentTarget(event.target.value || "")}
      >
        <option value="">Root level</option>
        {parentOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>

    <Button color="primary" className="w-100" onClick={handleAddSelections}>
      Add to Menu
    </Button>
  </div>
);
};

const MenuStructurePanel = ({ items, onUpdate, onRemove, onMove, onAddChild, loading }) => {
  if (loading) {
    return <div className="p-3">Loading menu...</div>;
  }

  if (!Array.isArray(items) || items.length === 0) {
    return <div className="p-3 border rounded text-muted">No menu items yet.</div>;
  }

  const renderItems = (nodes, depth = 0, parentPath = []) =>
    nodes.map((node, index) => {
      const path = [...parentPath, index];
      return (
        <div key={node.id} className="border rounded mb-2 p-2" style={{ marginLeft: depth * 12 }}>
          <div className="d-flex gap-2 flex-wrap align-items-start">
            <div className="flex-grow-1">
              <input
                className="form-control mb-1"
                value={node.title}
                onChange={(event) => onUpdate(path, () => ({ title: event.target.value }))}
                placeholder="Label (English)"
              />
              <input
                className="form-control mb-1"
                dir="rtl"
                value={node.title_ar || ""}
                onChange={(event) => onUpdate(path, () => ({ title_ar: event.target.value }))}
                placeholder="Label (Arabic)"
              />
              <input
                className="form-control"
                value={node.path}
                onChange={(event) => onUpdate(path, () => ({ path: event.target.value }))}
                placeholder="URL"
              />
            </div>
            <div className="d-flex flex-column gap-1">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onMove(path, -1)}>
                ↑
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onMove(path, 1)}>
                ↓
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onAddChild(path)}>
                Add child
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => onRemove(path)}>
                Delete
              </button>
            </div>
          </div>
          {Array.isArray(node.child) && node.child.length > 0 && (
            <div className="mt-2">{renderItems(node.child, depth + 1, path)}</div>
          )}
        </div>
      );
    });

  return (
    <div className="border rounded p-3 mb-3 bg-white">
      <h6 className="mb-3">Menu structure</h6>
      {renderItems(items)}
    </div>
  );
};

const MenuSettingsPanel = ({
  settings,
  onToggleAutoAdd,
  availableLocations,
  selectedLocations,
  onToggleLocation,
  locationsMap,
  onSave,
  onDelete,
  saving,
}) => (
  <div className="border rounded p-3 bg-white">
    <h6>Menu settings</h6>
    <div className="form-check mb-3">
      <input
        className="form-check-input"
        type="checkbox"
        checked={settings?.auto_add_new_top_level_pages}
        onChange={onToggleAutoAdd}
        id="auto-add-pages"
      />
      <label className="form-check-label" htmlFor="auto-add-pages">
        Automatically add new top-level pages to this menu
      </label>
    </div>
    <div className="mb-2 fw-semibold">Display locations</div>
    <div className="row row-cols-2 mb-3">
      {availableLocations.map((location) => (
        <div className="col" key={location}>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={selectedLocations.includes(location)}
              onChange={() => onToggleLocation(location)}
              id={`location-${location}`}
            />
            <label className="form-check-label" htmlFor={`location-${location}`}>
              {locationLabels[location] ?? location}
            </label>
          </div>
        </div>
      ))}
    </div>
    <div className="d-flex gap-2 flex-wrap">
      <Button color="primary" onClick={onSave} disabled={saving}>
        Save Menu
      </Button>
      <Button color="danger" outline onClick={onDelete} disabled={saving}>
        Delete Menu
      </Button>
    </div>
  </div>
);

export default MenuBuilder;
