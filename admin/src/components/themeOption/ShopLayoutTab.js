"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
  Row, Col, Card, CardBody, CardHeader, FormGroup, Label, Input, Button, Spinner,
} from "reactstrap";
import {
  RiArrowUpLine, RiArrowDownLine, RiDragMoveLine, RiDeleteBin6Line,
  RiSearchLine, RiCloseLine, RiSaveLine,
} from "react-icons/ri";
import request from "../../utils/axiosUtils";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";

const SHOP_LAYOUT_API = "/settings/shop-layout";

const DEFAULT_SETTINGS = {
  use_same_for_all: true,
  grid: { columns_desktop: 4, columns_tablet: 2, columns_mobile: 1, grid_gap: 16, row_gap: 24, products_per_page: 12, pagination_type: "normal" },
  card_image: { aspect_ratio: "4:5", image_fit: "cover", height_mode: "ratio", fixed_height: null },
  card_content: { show_category: true, show_title: true, show_price: true, show_sale_badge: true, show_rating: false, show_short_description: false, show_add_to_cart: true, show_wishlist: true, show_quick_view: true },
  card_order: ["category", "title", "price", "rating", "description", "add_to_cart", "wishlist", "quick_view"],
  text: { title_max_lines: 2, description_max_lines: 2, title_font_size: "medium", price_font_size: "medium" },
  sorting: { default_sort: "newest" },
  priority: { enabled: false, type: "pinned", pinned_product_ids: [], keep_pinned_order: true, new_arrivals_days: 14, custom_field: "created_at", custom_direction: "DESC" },
};

const CARD_ORDER_LABEL_KEYS = {
  category: "CategoryLabel",
  title: "TitleLabel",
  price: "PriceLabel",
  rating: "RatingLabel",
  description: "DescriptionLabel",
  add_to_cart: "AddToCartLabel",
  wishlist: "WishlistLabel",
  quick_view: "QuickViewLabel",
};

const ShopLayoutTab = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] = useState("grid");
  const [pinnedProducts, setPinnedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);
  const initialRef = useRef(null);

  // Drag state for card order
  const [dragIndex, setDragIndex] = useState(null);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await request({ url: SHOP_LAYOUT_API }, router);
        const data = res?.data?.data;
        if (data?.settings) {
          const merged = deepMerge(DEFAULT_SETTINGS, data.settings);
          setSettings(merged);
          initialRef.current = JSON.stringify(merged);
          // Load pinned product details
          if (merged.priority?.pinned_product_ids?.length) {
            loadPinnedProducts(merged.priority.pinned_product_ids);
          }
        }
      } catch (e) {
        console.error("Failed to load shop layout settings", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const loadPinnedProducts = async (ids) => {
    if (!ids?.length) return;
    try {
      const res = await request({ url: `/product`, params: { ids: ids.join(","), paginate: 50 } }, router);
      const products = res?.data?.data?.data || res?.data?.data || [];
      // Maintain pinned order
      const ordered = ids.map(id => products.find(p => p.id === id)).filter(Boolean);
      setPinnedProducts(ordered);
    } catch (e) {
      console.error("Failed to load pinned products", e);
    }
  };

  // Track changes
  useEffect(() => {
    if (initialRef.current) {
      setDirty(JSON.stringify(settings) !== initialRef.current);
    }
  }, [settings]);

  const update = useCallback((path, value) => {
    setSettings(prev => {
      const next = { ...prev };
      const parts = path.split(".");
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  }, []);

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      await request({
        url: SHOP_LAYOUT_API,
        method: "put",
        data: { scope: "global", scope_id: null, settings },
      }, router);
      initialRef.current = JSON.stringify(settings);
      setDirty(false);
      ToastNotification("success", t("SettingsSaved"));
    } catch (e) {
      ToastNotification("error", e?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Product search for pinned
  const handleProductSearch = (query) => {
    setProductSearch(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await request({ url: `/product`, params: { search: query, paginate: 10 } }, router);
        const products = res?.data?.data?.data || res?.data?.data || [];
        const existingIds = settings.priority?.pinned_product_ids || [];
        setSearchResults(products.filter(p => !existingIds.includes(p.id)));
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const addPinnedProduct = (product) => {
    const ids = [...(settings.priority?.pinned_product_ids || []), product.id];
    update("priority.pinned_product_ids", ids);
    setPinnedProducts(prev => [...prev, product]);
    setSearchResults(prev => prev.filter(p => p.id !== product.id));
    setProductSearch("");
  };

  const removePinnedProduct = (productId) => {
    const ids = (settings.priority?.pinned_product_ids || []).filter(id => id !== productId);
    update("priority.pinned_product_ids", ids);
    setPinnedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const movePinnedProduct = (index, direction) => {
    const ids = [...(settings.priority?.pinned_product_ids || [])];
    const products = [...pinnedProducts];
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[index], ids[newIdx]] = [ids[newIdx], ids[index]];
    [products[index], products[newIdx]] = [products[newIdx], products[index]];
    update("priority.pinned_product_ids", ids);
    setPinnedProducts(products);
  };

  // Card order drag and drop
  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const order = [...(settings.card_order || [])];
    const [moved] = order.splice(dragIndex, 1);
    order.splice(targetIndex, 0, moved);
    update("card_order", order);
    setDragIndex(null);
  };
  const moveCardOrder = (index, direction) => {
    const order = [...(settings.card_order || [])];
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[index], order[newIdx]] = [order[newIdx], order[index]];
    update("card_order", order);
  };

  const sections = [
    { key: "grid", label: t("GridSettings") },
    { key: "card_image", label: t("CardImage") },
    { key: "card_content", label: t("CardContent") },
    { key: "text", label: t("TextControls") },
    { key: "sorting", label: t("Sorting") },
    { key: "priority", label: t("Priority") },
  ];

  if (loading) {
    return <div className="text-center py-5"><Spinner color="primary" /><p className="mt-2 text-muted">{t("LoadingShopLayout")}</p></div>;
  }

  return (
    <div className="theme-tab-content">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="fw-semibold mb-0">{t("ShopLayout")}</h4>
        <Button color="primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Spinner size="sm" className="me-1" /> : <RiSaveLine className="me-1" />}
          {dirty ? t("SaveChanges") : t("Saved")}
        </Button>
      </div>

      {dirty && <div className="alert alert-warning py-2 mb-3">{t("UnsavedChanges")}</div>}

      {/* Section navigation */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        {sections.map(s => (
          <Button key={s.key} size="sm" color={activeSection === s.key ? "primary" : "light"} onClick={() => setActiveSection(s.key)}>
            {s.label}
          </Button>
        ))}
      </div>

      {/* Section 1: Grid Settings */}
      {activeSection === "grid" && (
        <Card>
          <CardHeader><h5 className="mb-0">{t("GridSettings")}</h5></CardHeader>
          <CardBody>
            {/* Use same for all toggle */}
            <FormGroup className="mb-4">
              <div className="d-flex align-items-center gap-3">
                <FormGroup switch className="ps-0 form-switch custom-switch-flex form-check mb-0">
                  <label className="switch">
                    <input type="checkbox" checked={settings.use_same_for_all} onChange={e => update("use_same_for_all", e.target.checked)} />
                    <span className="switch-state"></span>
                  </label>
                </FormGroup>
                <Label className="mb-0">{t("UseSameSettingsForAll")}</Label>
              </div>
            </FormGroup>

            <Row>
              <Col md="4">
                <FormGroup>
                  <Label>{t("ColumnsDesktop")}</Label>
                  <div className="d-flex align-items-center gap-2">
                    <Input type="range" min={2} max={6} value={settings.grid?.columns_desktop || 4} onChange={e => update("grid.columns_desktop", Number(e.target.value))} />
                    <span className="badge bg-primary">{settings.grid?.columns_desktop}</span>
                  </div>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>{t("ColumnsTablet")}</Label>
                  <div className="d-flex align-items-center gap-2">
                    <Input type="range" min={1} max={3} value={settings.grid?.columns_tablet || 2} onChange={e => update("grid.columns_tablet", Number(e.target.value))} />
                    <span className="badge bg-primary">{settings.grid?.columns_tablet}</span>
                  </div>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>{t("ColumnsMobile")}</Label>
                  <div className="d-flex align-items-center gap-2">
                    <Input type="range" min={1} max={2} value={settings.grid?.columns_mobile || 1} onChange={e => update("grid.columns_mobile", Number(e.target.value))} />
                    <span className="badge bg-primary">{settings.grid?.columns_mobile}</span>
                  </div>
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md="4">
                <FormGroup>
                  <Label>{t("GridGap")}</Label>
                  <div className="d-flex align-items-center gap-2">
                    <Input type="range" min={8} max={40} value={settings.grid?.grid_gap || 16} onChange={e => update("grid.grid_gap", Number(e.target.value))} />
                    <span className="badge bg-secondary">{settings.grid?.grid_gap}px</span>
                  </div>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>{t("RowGap")}</Label>
                  <div className="d-flex align-items-center gap-2">
                    <Input type="range" min={8} max={60} value={settings.grid?.row_gap || 24} onChange={e => update("grid.row_gap", Number(e.target.value))} />
                    <span className="badge bg-secondary">{settings.grid?.row_gap}px</span>
                  </div>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>{t("ProductsPerPage")}</Label>
                  <Input type="number" min={4} max={60} value={settings.grid?.products_per_page || 12} onChange={e => update("grid.products_per_page", Number(e.target.value))} />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md="4">
                <FormGroup>
                  <Label>{t("PaginationType")}</Label>
                  <Input type="select" value={settings.grid?.pagination_type || "normal"} onChange={e => update("grid.pagination_type", e.target.value)}>
                    <option value="normal">{t("Normal")}</option>
                    <option value="load_more">{t("LoadMore")}</option>
                    <option value="infinite_scroll">{t("InfiniteScroll")}</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>
      )}

      {/* Section 2: Card Image */}
      {activeSection === "card_image" && (
        <Card>
          <CardHeader><h5 className="mb-0">{t("CardImage")}</h5></CardHeader>
          <CardBody>
            <FormGroup>
              <Label>{t("ImageAspectRatio")}</Label>
              <div className="d-flex gap-3 flex-wrap">
                {["1:1", "4:5", "3:4", "auto"].map(ratio => (
                  <Label key={ratio} className="d-flex align-items-center gap-2 cursor-pointer">
                    <Input type="radio" name="aspect_ratio" checked={settings.card_image?.aspect_ratio === ratio} onChange={() => update("card_image.aspect_ratio", ratio)} />
                    {ratio === "1:1" ? `1:1 (${t("Square")})` : ratio === "auto" ? t("Auto") : ratio}
                  </Label>
                ))}
              </div>
            </FormGroup>
            <FormGroup>
              <Label>{t("ImageFit")}</Label>
              <div className="d-flex gap-3">
                {[{ v: "cover", k: "Cover" }, { v: "contain", k: "Contain" }].map(opt => (
                  <Label key={opt.v} className="d-flex align-items-center gap-2 cursor-pointer">
                    <Input type="radio" name="image_fit" checked={settings.card_image?.image_fit === opt.v} onChange={() => update("card_image.image_fit", opt.v)} />
                    {t(opt.k)}
                  </Label>
                ))}
              </div>
            </FormGroup>
            <FormGroup>
              <Label>{t("ImageHeightMode")}</Label>
              <div className="d-flex gap-3">
                {[{ v: "ratio", k: "RatioBased" }, { v: "fixed", k: "FixedHeight" }].map(opt => (
                  <Label key={opt.v} className="d-flex align-items-center gap-2 cursor-pointer">
                    <Input type="radio" name="height_mode" checked={settings.card_image?.height_mode === opt.v} onChange={() => update("card_image.height_mode", opt.v)} />
                    {t(opt.k)}
                  </Label>
                ))}
              </div>
            </FormGroup>
            {settings.card_image?.height_mode === "fixed" && (
              <FormGroup>
                <Label>{t("FixedHeightPx")}</Label>
                <Input type="number" min={100} max={800} value={settings.card_image?.fixed_height || 300} onChange={e => update("card_image.fixed_height", Number(e.target.value))} style={{ maxWidth: 200 }} />
              </FormGroup>
            )}
          </CardBody>
        </Card>
      )}

      {/* Section 3: Card Content */}
      {activeSection === "card_content" && (
        <Card>
          <CardHeader><h5 className="mb-0">{t("CardContent")}</h5></CardHeader>
          <CardBody>
            <h6 className="mb-3">{t("ShowHideElements")}</h6>
            <Row>
              {[
                { key: "show_category", label: "ShowCategory" },
                { key: "show_title", label: "ShowTitle" },
                { key: "show_price", label: "ShowPrice" },
                { key: "show_sale_badge", label: "ShowSaleBadge" },
                { key: "show_rating", label: "ShowRating" },
                { key: "show_short_description", label: "ShowDescription" },
                { key: "show_add_to_cart", label: "ShowAddToCart" },
                { key: "show_wishlist", label: "ShowWishlist" },
                { key: "show_quick_view", label: "ShowQuickView" },
              ].map(item => (
                <Col md="6" key={item.key}>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <FormGroup switch className="ps-0 form-switch custom-switch-flex form-check mb-0">
                      <label className="switch">
                        <input type="checkbox" checked={settings.card_content?.[item.key] ?? false} onChange={e => update(`card_content.${item.key}`, e.target.checked)} />
                        <span className="switch-state"></span>
                      </label>
                    </FormGroup>
                    <Label className="mb-0">{t(item.label)}</Label>
                  </div>
                </Col>
              ))}
            </Row>

            <hr className="my-4" />
            <h6 className="mb-3">{t("CardContentOrder")}</h6>
            <p className="text-muted small mb-3">{t("DragToReorder")}</p>
            <div className="border rounded">
              {(settings.card_order || []).map((item, index) => (
                <div
                  key={item}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className="d-flex align-items-center gap-3 p-3 border-bottom"
                  style={{ backgroundColor: dragIndex === index ? "#e8f0fe" : "#fff", cursor: "grab" }}
                >
                  <RiDragMoveLine size={18} className="text-muted" />
                  <span className="badge bg-light text-dark">{index + 1}</span>
                  <span className="flex-grow-1">{t(CARD_ORDER_LABEL_KEYS[item] || item)}</span>
                  <div className="d-flex gap-1">
                    <Button size="sm" color="light" onClick={() => moveCardOrder(index, -1)} disabled={index === 0}><RiArrowUpLine /></Button>
                    <Button size="sm" color="light" onClick={() => moveCardOrder(index, 1)} disabled={index === (settings.card_order?.length || 0) - 1}><RiArrowDownLine /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Section 4: Text Controls */}
      {activeSection === "text" && (
        <Card>
          <CardHeader><h5 className="mb-0">{t("TextControls")}</h5></CardHeader>
          <CardBody>
            <Row>
              <Col md="6">
                <FormGroup>
                  <Label>{t("TitleMaxLines")}</Label>
                  <div className="d-flex align-items-center gap-2">
                    <Input type="range" min={1} max={3} value={settings.text?.title_max_lines || 2} onChange={e => update("text.title_max_lines", Number(e.target.value))} />
                    <span className="badge bg-primary">{settings.text?.title_max_lines}</span>
                  </div>
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label>{t("DescriptionMaxLines")}</Label>
                  <div className="d-flex align-items-center gap-2">
                    <Input type="range" min={0} max={4} value={settings.text?.description_max_lines ?? 2} onChange={e => update("text.description_max_lines", Number(e.target.value))} />
                    <span className="badge bg-primary">{settings.text?.description_max_lines}</span>
                  </div>
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label>{t("TitleFontSize")}</Label>
                  <Input type="select" value={settings.text?.title_font_size || "medium"} onChange={e => update("text.title_font_size", e.target.value)}>
                    <option value="small">{t("Small")}</option>
                    <option value="medium">{t("Medium")}</option>
                    <option value="large">{t("Large")}</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label>{t("PriceFontSize")}</Label>
                  <Input type="select" value={settings.text?.price_font_size || "medium"} onChange={e => update("text.price_font_size", e.target.value)}>
                    <option value="small">{t("Small")}</option>
                    <option value="medium">{t("Medium")}</option>
                    <option value="large">{t("Large")}</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>
      )}

      {/* Section 5: Sorting */}
      {activeSection === "sorting" && (
        <Card>
          <CardHeader><h5 className="mb-0">{t("Sorting")}</h5></CardHeader>
          <CardBody>
            <FormGroup>
              <Label>{t("DefaultSort")}</Label>
              <Input type="select" value={settings.sorting?.default_sort || "newest"} onChange={e => update("sorting.default_sort", e.target.value)} style={{ maxWidth: 400 }}>
                <option value="newest">{t("Newest")}</option>
                <option value="oldest">{t("Oldest")}</option>
                <option value="price_asc">{t("PriceLowToHigh")}</option>
                <option value="price_desc">{t("PriceHighToLow")}</option>
                <option value="best_selling">{t("BestSelling")}</option>
                <option value="top_selling">{t("HighestRated")}</option>
              </Input>
            </FormGroup>
          </CardBody>
        </Card>
      )}

      {/* Section 6: Priority */}
      {activeSection === "priority" && (
        <Card>
          <CardHeader><h5 className="mb-0">{t("Priority")}</h5></CardHeader>
          <CardBody>
            <FormGroup className="mb-4">
              <div className="d-flex align-items-center gap-3">
                <FormGroup switch className="ps-0 form-switch custom-switch-flex form-check mb-0">
                  <label className="switch">
                    <input type="checkbox" checked={settings.priority?.enabled ?? false} onChange={e => update("priority.enabled", e.target.checked)} />
                    <span className="switch-state"></span>
                  </label>
                </FormGroup>
                <Label className="mb-0">{t("EnablePriority")}</Label>
              </div>
            </FormGroup>

            {settings.priority?.enabled && (
              <>
                <FormGroup>
                  <Label>{t("PriorityType")}</Label>
                  <Input type="select" value={settings.priority?.type || "pinned"} onChange={e => update("priority.type", e.target.value)} style={{ maxWidth: 400 }}>
                    <option value="pinned">{t("PinnedProductsFirst")}</option>
                    <option value="featured">{t("FeaturedProductsFirst")}</option>
                    <option value="in_stock">{t("InStockFirst")}</option>
                    <option value="new_arrivals">{t("NewArrivalsFirst")}</option>
                    <option value="custom">{t("CustomFieldPriority")}</option>
                  </Input>
                </FormGroup>

                {/* Pinned Products */}
                {settings.priority?.type === "pinned" && (
                  <div className="mt-4">
                    <FormGroup className="mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <FormGroup switch className="ps-0 form-switch custom-switch-flex form-check mb-0">
                          <label className="switch">
                            <input type="checkbox" checked={settings.priority?.keep_pinned_order ?? true} onChange={e => update("priority.keep_pinned_order", e.target.checked)} />
                            <span className="switch-state"></span>
                          </label>
                        </FormGroup>
                        <Label className="mb-0">{t("KeepPinnedOrder")}</Label>
                      </div>
                    </FormGroup>

                    {/* Product search */}
                    <FormGroup>
                      <Label>{t("SearchProducts")}</Label>
                      <div className="position-relative">
                        <Input
                          type="text"
                          placeholder={t("SearchProductPlaceholder")}
                          value={productSearch}
                          onChange={e => handleProductSearch(e.target.value)}
                        />
                        {searching && <Spinner size="sm" className="position-absolute" style={{ top: 10, right: 10 }} />}
                        {!searching && productSearch && (
                          <RiCloseLine size={18} className="position-absolute cursor-pointer" style={{ top: 10, right: 10 }} onClick={() => { setProductSearch(""); setSearchResults([]); }} />
                        )}
                      </div>
                      {searchResults.length > 0 && (
                        <div className="border rounded mt-1" style={{ maxHeight: 200, overflowY: "auto" }}>
                          {searchResults.map(p => (
                            <div key={p.id} className="d-flex align-items-center gap-2 p-2 border-bottom cursor-pointer" style={{ cursor: "pointer" }} onClick={() => addPinnedProduct(p)}>
                              {p.product_thumbnail?.original_url && <img src={p.product_thumbnail.original_url} alt="" width={32} height={32} style={{ objectFit: "cover", borderRadius: 4 }} />}
                              <div className="flex-grow-1">
                                <div className="small fw-semibold">{p.name}</div>
                                <div className="small text-muted">{p.sku || `ID: ${p.id}`}</div>
                              </div>
                              <span className="badge bg-success">+ {t("Add")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </FormGroup>

                    {/* Pinned products list */}
                    {pinnedProducts.length > 0 && (
                      <div className="border rounded mt-3">
                        <div className="p-2 bg-light border-bottom fw-semibold small">
                          {t("PinnedProducts")} ({pinnedProducts.length})
                        </div>
                        {pinnedProducts.map((p, index) => (
                          <div key={p.id} className="d-flex align-items-center gap-2 p-2 border-bottom">
                            <span className="badge bg-light text-dark">{index + 1}</span>
                            {p.product_thumbnail?.original_url && <img src={p.product_thumbnail.original_url} alt="" width={36} height={36} style={{ objectFit: "cover", borderRadius: 4 }} />}
                            <div className="flex-grow-1">
                              <div className="small fw-semibold">{p.name}</div>
                              <div className="small text-muted">{p.sku || `ID: ${p.id}`}</div>
                            </div>
                            <div className="d-flex gap-1">
                              <Button size="sm" color="light" onClick={() => movePinnedProduct(index, -1)} disabled={index === 0}><RiArrowUpLine /></Button>
                              <Button size="sm" color="light" onClick={() => movePinnedProduct(index, 1)} disabled={index === pinnedProducts.length - 1}><RiArrowDownLine /></Button>
                              <Button size="sm" color="danger" outline onClick={() => removePinnedProduct(p.id)}><RiDeleteBin6Line /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Featured */}
                {settings.priority?.type === "featured" && (
                  <div className="alert alert-info mt-3">
                    {t("FeaturedPriorityInfo")}
                  </div>
                )}

                {/* In Stock */}
                {settings.priority?.type === "in_stock" && (
                  <div className="alert alert-info mt-3">
                    {t("InStockPriorityInfo")}
                  </div>
                )}

                {/* New Arrivals */}
                {settings.priority?.type === "new_arrivals" && (
                  <div className="mt-3">
                    <FormGroup>
                      <Label>{t("Days")}</Label>
                      <Input type="number" min={1} max={90} value={settings.priority?.new_arrivals_days || 14} onChange={e => update("priority.new_arrivals_days", Number(e.target.value))} style={{ maxWidth: 200 }} />
                      <small className="text-muted">{t("NewArrivalsPriorityInfo", { days: settings.priority?.new_arrivals_days || 14 })}</small>
                    </FormGroup>
                  </div>
                )}

                {/* Custom */}
                {settings.priority?.type === "custom" && (
                  <Row className="mt-3">
                    <Col md="6">
                      <FormGroup>
                        <Label>{t("Field")}</Label>
                        <Input type="select" value={settings.priority?.custom_field || "created_at"} onChange={e => update("priority.custom_field", e.target.value)}>
                          <option value="price">{t("Price")}</option>
                          <option value="created_at">{t("CreatedDate")}</option>
                          <option value="total_sold">{t("TotalSold")}</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label>{t("Direction")}</Label>
                        <div className="d-flex gap-3 mt-1">
                          <Label className="d-flex align-items-center gap-2 cursor-pointer">
                            <Input type="radio" name="custom_dir" checked={settings.priority?.custom_direction === "ASC"} onChange={() => update("priority.custom_direction", "ASC")} />
                            {t("Ascending")}
                          </Label>
                          <Label className="d-flex align-items-center gap-2 cursor-pointer">
                            <Input type="radio" name="custom_dir" checked={settings.priority?.custom_direction === "DESC"} onChange={() => update("priority.custom_direction", "DESC")} />
                            {t("Descending")}
                          </Label>
                        </div>
                      </FormGroup>
                    </Col>
                  </Row>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export default ShopLayoutTab;
