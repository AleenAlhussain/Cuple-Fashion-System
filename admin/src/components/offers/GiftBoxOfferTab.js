"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, Col, FormGroup, Input, Label, Row } from "reactstrap";
import { useRouter } from "next/navigation";
import request from "@/utils/axiosUtils";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { Category, product } from "@/utils/axiosUtils/API";
import Btn from "@/elements/buttons/Btn";
import Loader from "@/components/commonComponent/Loader";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const giftBoxOfferApi = "/gift-box-offer";

const toDateTimeLocal = (value) => (value ? value.replace(" ", "T").slice(0, 16) : "");
const normalizeList = (res) => res?.data?.data?.data || res?.data?.data || [];
const maxCategories = 5;
const maxProducts = 5;

const GiftBoxOfferTab = () => {
  const router = useRouter();
  const [offerId, setOfferId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    is_active: false,
    start_at: "",
    end_at: "",
    discount_type: "percentage",
    discount_value: "",
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryItems, setCategoryItems] = useState({});
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [productSearchByCategory, setProductSearchByCategory] = useState({});
  const [productOptionsByCategory, setProductOptionsByCategory] = useState({});
  const [productLoadingByCategory, setProductLoadingByCategory] = useState({});
  const [blockCrossCategoryDuplicates, setBlockCrossCategoryDuplicates] = useState(false);

  const { data: categoryData = [], isLoading: categoryLoading } = useCustomQuery(
    ["gift-box-categories", categoryQuery],
    () =>
      request(
        {
          url: Category,
          params: { status: 1, type: "product", search: categoryQuery || undefined },
        },
        router
      ),
    { select: normalizeList, refetchOnWindowFocus: false }
  );

  const { data: offerData, isLoading: offerLoading, refetch: refetchOffer } = useCustomQuery(
    ["gift-box-offer"],
    () => request({ url: giftBoxOfferApi, method: "get" }, router),
    { select: (res) => res?.data?.data || null, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (!offerData) return;

    setOfferId(offerData.id);
    setFormState({
      is_active: Boolean(offerData.is_active),
      start_at: toDateTimeLocal(offerData.start_at),
      end_at: toDateTimeLocal(offerData.end_at),
      discount_type: offerData.discount_type || "percentage",
      discount_value: offerData.discount_value ?? "",
    });

    const categories = offerData.categories || [];
    const selected = categories.map((cat) => ({
      id: String(cat.category_id),
      name: cat.category_name || "Category",
    }));
    setSelectedCategories(selected);

    const nextItems = {};
    categories.forEach((cat) => {
      const items = (cat.items || [])
        .slice()
        .sort((a, b) => Number(a.position) - Number(b.position))
        .map((item) => ({
          id: String(item.product_id),
          name: item.product_name || "Product",
        }));
      nextItems[String(cat.category_id)] = items;
    });
    setCategoryItems(nextItems);
  }, [offerData]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCategoryQuery(categorySearch || "");
    }, 400);
    return () => clearTimeout(timeout);
  }, [categorySearch]);

  useEffect(() => {
    if (selectedCategories.length === 0) return;
    const timeout = setTimeout(() => {
      selectedCategories.forEach(async (category) => {
        const categoryId = category.id;
        setProductLoadingByCategory((prev) => ({ ...prev, [categoryId]: true }));
        try {
          const res = await request(
            {
              url: product,
              params: {
                status: 1,
                category_ids: categoryId,
                search: productSearchByCategory[categoryId] || undefined,
                paginate: 20,
              },
            },
            router
          );
          setProductOptionsByCategory((prev) => ({
            ...prev,
            [categoryId]: normalizeList(res),
          }));
        } catch (error) {
          setProductOptionsByCategory((prev) => ({ ...prev, [categoryId]: [] }));
        } finally {
          setProductLoadingByCategory((prev) => ({ ...prev, [categoryId]: false }));
        }
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [selectedCategories, productSearchByCategory, router]);

  const selectedCategoryIds = useMemo(
    () => selectedCategories.map((category) => category.id),
    [selectedCategories]
  );

  const handleAddCategory = (category) => {
    if (selectedCategories.length >= maxCategories) {
      ToastNotification("error", "You can select up to five categories.");
      return;
    }
    const categoryId = String(category.id);
    if (selectedCategoryIds.includes(categoryId)) {
      ToastNotification("error", "Category already selected");
      return;
    }
    setSelectedCategories((prev) => [
      ...prev,
      {
        id: categoryId,
        name: category.name,
      },
    ]);
    setCategoryItems((prev) => ({
      ...prev,
      [categoryId]: [],
    }));
  };

  const handleRemoveCategory = (categoryId) => {
    setSelectedCategories((prev) => prev.filter((category) => category.id !== categoryId));
    setCategoryItems((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    setProductSearchByCategory((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    setProductOptionsByCategory((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  const handleAddProduct = (categoryId, productOption) => {
    const items = categoryItems[categoryId] || [];
    const productId = String(productOption.id);
    if (items.some((item) => item.id === productId)) {
      ToastNotification("error", "Product already selected in this category");
      return;
    }
    if (blockCrossCategoryDuplicates) {
      const usedElsewhere = selectedCategories.some(
        (category) =>
          category.id !== categoryId &&
          (categoryItems[category.id] || []).some((item) => item.id === productId)
      );
      if (usedElsewhere) {
        ToastNotification("error", "Product already used in another category");
        return;
      }
    }
    if (items.length >= maxProducts) {
      ToastNotification("error", "Each category can have up to five products.");
      return;
    }
    setCategoryItems((prev) => {
      const next = { ...prev };
      next[categoryId] = [
        ...(next[categoryId] || []),
        { id: productId, name: productOption.name },
      ];
      return next;
    });
  };

  const handleRemoveProduct = (categoryId, productId) => {
    setCategoryItems((prev) => {
      const next = { ...prev };
      next[categoryId] = (next[categoryId] || []).filter((item) => item.id !== productId);
      return next;
    });
  };

  const validatePayload = () => {
    if (selectedCategories.length < 1 || selectedCategories.length > maxCategories) {
      ToastNotification("error", "Select between one and five categories.");
      return false;
    }

    for (const category of selectedCategories) {
      const items = categoryItems[category.id] || [];
      if (items.length < 1 || items.length > maxProducts) {
        ToastNotification("error", "Each category must have between one and five products.");
        return false;
      }

      const productIds = items.map((item) => item.id);
      const uniqueItems = new Set(productIds);
      if (uniqueItems.size !== productIds.length) {
        ToastNotification("error", "Each category must have unique products.");
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validatePayload()) return;

    const payload = {
      is_active: Boolean(formState.is_active),
      start_at: formState.start_at || null,
      end_at: formState.end_at || null,
      discount_type: formState.discount_type,
      discount_value: Number(formState.discount_value || 0),
      categories: selectedCategories.map((category) => ({
        category_id: Number(category.id),
        items: (categoryItems[category.id] || []).map((item, index) => ({
          product_id: Number(item.id),
          position: index + 1,
        })),
      })),
    };

    setSaving(true);
    try {
      if (offerId) {
        await request({ url: `${giftBoxOfferApi}/${offerId}`, method: "put", data: payload }, router);
      } else {
        const response = await request({ url: giftBoxOfferApi, method: "post", data: payload }, router);
        const newId = response?.data?.data?.id;
        if (newId) {
          setOfferId(newId);
        }
      }
      ToastNotification("success", "Gift box offer saved.");
      refetchOffer();
    } catch (error) {
      ToastNotification("error", "Failed to save gift box offer.");
    } finally {
      setSaving(false);
    }
  };

  if (categoryLoading || offerLoading) {
    return <Loader />;
  }

  const availableCategories = (categoryData || []).filter(
    (category) => !selectedCategoryIds.includes(String(category.id))
  );

  return (
    <Card>
      <CardBody>
        <div className="title-header option-title">
          <h5>Gift Box Offer</h5>
        </div>

        <Row className="g-3">
          <Col md="4">
            <FormGroup>
              <Label for="giftbox-status">Status</Label>
              <Input
                id="giftbox-status"
                type="select"
                value={formState.is_active ? "1" : "0"}
                onChange={(event) => setFormState((prev) => ({ ...prev, is_active: event.target.value === "1" }))}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Input>
            </FormGroup>
          </Col>
          <Col md="4">
            <FormGroup>
              <Label for="giftbox-start">Start At</Label>
              <Input
                id="giftbox-start"
                type="datetime-local"
                value={formState.start_at}
                onChange={(event) => setFormState((prev) => ({ ...prev, start_at: event.target.value }))}
              />
            </FormGroup>
          </Col>
          <Col md="4">
            <FormGroup>
              <Label for="giftbox-end">End At</Label>
              <Input
                id="giftbox-end"
                type="datetime-local"
                value={formState.end_at}
                onChange={(event) => setFormState((prev) => ({ ...prev, end_at: event.target.value }))}
              />
            </FormGroup>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col md="4">
            <FormGroup>
              <Label for="giftbox-discount-type">Discount Type</Label>
              <Input
                id="giftbox-discount-type"
                type="select"
                value={formState.discount_type}
                onChange={(event) => setFormState((prev) => ({ ...prev, discount_type: event.target.value }))}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="price_override">Price Override</option>
              </Input>
            </FormGroup>
          </Col>
          <Col md="4">
            <FormGroup>
              <Label for="giftbox-discount-value">Discount Value</Label>
              <Input
                id="giftbox-discount-value"
                type="number"
                min="0"
                step="0.01"
                value={formState.discount_value}
                onChange={(event) => setFormState((prev) => ({ ...prev, discount_value: event.target.value }))}
              />
            </FormGroup>
          </Col>
          <Col md="4">
            <div className="border rounded p-2 h-100 d-flex flex-column justify-content-center">
              <small className="text-muted">Only Logged In: Yes</small>
              <small className="text-muted">Selection Limit: 1</small>
              <small className="text-muted">Show Once Per Session: Yes</small>
              <small className="text-muted">Reuse Policy: Once per user</small>
            </div>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col md="6">
            <FormGroup>
              <Label for="giftbox-categories">Category Search</Label>
              <Input
                id="giftbox-categories"
                type="search"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                disabled={selectedCategories.length >= maxCategories}
              />
            </FormGroup>
            <div className="border rounded p-2">
              {selectedCategories.length >= maxCategories && (
                <small className="text-muted d-block">Maximum categories reached.</small>
              )}
              {availableCategories.length === 0 ? (
                <small className="text-muted d-block">No categories available.</small>
              ) : (
                availableCategories.map((category) => (
                  <div
                    key={category.id}
                    className="d-flex align-items-center justify-content-between border-bottom py-2"
                  >
                    <span>{category.name}</span>
                    <Button
                      size="sm"
                      color="primary"
                      onClick={() => handleAddCategory(category)}
                      disabled={selectedCategories.length >= maxCategories}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Col>
          <Col md="6">
            <div className="border rounded p-2 h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <strong>Selected Categories ({selectedCategories.length}/5)</strong>
                {selectedCategories.length === 0 && <small className="text-muted">None selected</small>}
              </div>
              {selectedCategories.map((category) => (
                <div
                  key={category.id}
                  className="d-flex align-items-center justify-content-between border-bottom py-2"
                >
                  <span>{category.name}</span>
                  <Button size="sm" color="danger" onClick={() => handleRemoveCategory(category.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col md="6">
            <FormGroup check className="mt-2">
              <Input
                id="giftbox-prevent-cross"
                type="checkbox"
                checked={blockCrossCategoryDuplicates}
                onChange={(event) => setBlockCrossCategoryDuplicates(event.target.checked)}
              />
              <Label for="giftbox-prevent-cross" check>
                Prevent duplicate products across categories
              </Label>
            </FormGroup>
          </Col>
        </Row>

        {selectedCategories.map((category) => {
          const categoryId = category.id;
          const items = categoryItems[categoryId] || [];
          const selectedProductIds = new Set(items.map((item) => item.id));
          const usedProductIds = blockCrossCategoryDuplicates
            ? new Set(
                selectedCategories.flatMap((cat) =>
                  (categoryItems[cat.id] || []).map((item) => item.id)
                )
              )
            : new Set();
          const availableProducts = (productOptionsByCategory[categoryId] || []).filter((option) => {
            const optionId = String(option.id);
            if (selectedProductIds.has(optionId)) return false;
            if (blockCrossCategoryDuplicates && usedProductIds.has(optionId)) return false;
            return true;
          });

          return (
            <div key={categoryId} className="mt-3 border rounded p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0">{category.name || "Category"}</h6>
                <small className="text-muted">
                  {items.length}/{maxProducts} products
                </small>
              </div>
              <FormGroup>
                <Label for={`product-search-${categoryId}`}>Product Search</Label>
                <Input
                  id={`product-search-${categoryId}`}
                  type="search"
                  value={productSearchByCategory[categoryId] || ""}
                  onChange={(event) =>
                    setProductSearchByCategory((prev) => ({
                      ...prev,
                      [categoryId]: event.target.value,
                    }))
                  }
                  placeholder="Search products"
                />
              </FormGroup>
              <div className="border rounded p-2">
                {productLoadingByCategory[categoryId] && (
                  <small className="text-muted d-block">Loading products...</small>
                )}
                {!productLoadingByCategory[categoryId] && availableProducts.length === 0 && (
                  <small className="text-muted d-block">No products available.</small>
                )}
                {availableProducts.map((option) => (
                  <div
                    key={option.id}
                    className="d-flex align-items-center justify-content-between border-bottom py-2"
                  >
                    <span>{option.name}</span>
                    <Button size="sm" color="primary" onClick={() => handleAddProduct(categoryId, option)}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
              <Row className="g-3 mt-2">
                {items.length === 0 && (
                  <Col md="12">
                    <small className="text-muted d-block">Select at least one product.</small>
                  </Col>
                )}
                {items.map((item, index) => (
                  <Col md="6" key={`${categoryId}-${item.id}`}>
                    <div className="d-flex align-items-center justify-content-between border rounded p-2">
                      <div>
                        <strong>Position {index + 1}</strong>
                        <div>{item.name}</div>
                      </div>
                      <Button
                        size="sm"
                        color="danger"
                        onClick={() => handleRemoveProduct(categoryId, item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          );
        })}

        <div className="mt-4">
          <Btn className="btn btn-solid" onClick={handleSave} loading={saving}>
            Save Gift Box Offer
          </Btn>
        </div>
      </CardBody>
    </Card>
  );
};

export default GiftBoxOfferTab;
