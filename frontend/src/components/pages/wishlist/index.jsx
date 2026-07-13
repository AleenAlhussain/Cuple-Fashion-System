"use client";
import NoDataFound from "@/components/widgets/NoDataFound";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import { useSettings } from "@/utils/hooks/useSettings";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useWishlistState, useCartState } from "@/states";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { Href } from "@/utils/constants";
import Link from "next/link";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine, RiShoppingCartLine } from "react-icons/ri";
import { Table } from "reactstrap";
import emptyImage from "/public/assets/svg/empty-items.svg";

const WishlistContent = () => {
  const { wishlist, initWishlist, removeFromWishlist: removeFromWishlistState } = useWishlistState();
  const { t } = useTranslation("common");
  const { setCartCanvas } = useContext(ThemeOptionContext);
  const { addToCart: addToCartState } = useCartState();
  const { settingData } = useSettings();

  // Initialize wishlist on mount
  useEffect(() => {
    initWishlist();
  }, []);

  // Get product data from wishlist items
  const wishlistProducts = wishlist?.map(item => item.product).filter(Boolean) || [];

  const removeFromWishlist = (product) => {
    removeFromWishlistState(product.id);
  };

  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  // Helper function to get product image
  const getProductImage = (product) => {
    // Check for main_image first
    if (product?.main_image) {
      if (product.main_image.startsWith('http')) return product.main_image;
      return `${process.env.IMAGE_URL}storage/${product.main_image}`;
    }
    // Then check product_galleries
    if (product?.product_galleries?.[0]?.original_url) {
      return product.product_galleries[0].original_url;
    }
    // Check images array
    if (product?.images?.[0]?.url) {
      const url = product.images[0].url;
      if (url.startsWith('http')) return url;
      return `${process.env.IMAGE_URL}storage/${url}`;
    }
    // Fallback
    return '/assets/images/placeholder.png';
  };

  // Get product price
  const getProductPrice = (product) => {
    // Check variants first
    if (product?.variants?.length > 0) {
      const variant = product.variants[0];
      return {
        price: variant.sale_price > 0 ? variant.sale_price : variant.price,
        originalPrice: variant.sale_price > 0 ? variant.price : null
      };
    }
    // Use product prices
    return {
      price: product?.sale_price > 0 ? product.sale_price : product?.price,
      originalPrice: product?.sale_price > 0 ? product?.price : null
    };
  };

  const addToCart = (product) => {
    setCartCanvas(true);
    addToCartState(product, 1);
  };

  return (
    <>
      <Breadcrumbs title={"Wishlist"} subNavigation={[{ name: "Wishlist" }]} />
      <WrapperComponent classes={{ sectionClass: "wishlist-section section-b-space", row: "g-sm-3 g-2", col: "table-responsive-xs", fluidClass: "container" }} colProps={{ sm: "12" }}>
        {wishlistProducts?.length > 0 ? (
          <div className="table-responsive">
            <Table className="cart-table">
              <thead>
                <tr className="table-head">
                  <th scope="col">{t("Image")}</th>
                  <th scope="col">{t("ProductName")}</th>
                  <th scope="col">{t("Price")}</th>
                  <th scope="col">{t("Availability")}</th>
                  <th scope="col">{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {wishlistProducts?.map((product, i) => {
                  const { price, originalPrice } = getProductPrice(product);
                  const stockStatus = product?.stock_status || (product?.stock_quantity > 0 ? 'in_stock' : 'out_of_stock');

                  return (
                  <tr key={i}>
                    <td>
                      <Link href={`/product/${product?.slug || product?.id}`}>
                        <img
                          height={90}
                          width={90}
                          src={getProductImage(product)}
                          alt={product?.name || 'product'}
                          style={{ objectFit: 'cover' }}
                        />
                      </Link>
                    </td>
                    <td>
                      <Link href={`/product/${product?.slug || product?.id}`}>{product?.name}</Link>
                      <div className="mobile-cart-content row">
                        <div className="col">
                          <p>{typeof stockStatus === "string" ? stockStatus.split("_").join(" ") : stockStatus}</p>
                        </div>
                        <div className="col">
                          <h2>
                            {convertCurrency(price)} {originalPrice ? <del>{convertCurrency(originalPrice)}</del> : null}
                          </h2>
                        </div>
                        <div className="col">
                          <div className="icon-box d-flex gap-2 justify-content-center">
                            <a href={Href} className="icon " onClick={() => removeFromWishlist(product)}>
                              <RiCloseLine />
                            </a>
                            <a href={Href} className="cart" onClick={() => addToCart(product)}>
                              <RiShoppingCartLine />
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <h2>
                        {convertCurrency(price)} {originalPrice ? <del>{convertCurrency(originalPrice)}</del> : null}
                      </h2>
                    </td>
                    <td>
                      <p>{typeof stockStatus === "string" ? stockStatus.split("_").join(" ") : stockStatus}</p>
                    </td>

                    <td>
                      <div className="icon-box d-flex gap-2 justify-content-center">
                        <a href={Href} className="icon " onClick={() => removeFromWishlist(product)}>
                          <RiCloseLine />
                        </a>
                        <a href={Href} className="cart" onClick={() => addToCart(product)}>
                          <RiShoppingCartLine />
                        </a>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        ) : (
          <NoDataFound customClass="no-data-added" imageUrl={emptyImage} title="NoItemsAdded" description="NoWishListDescription" height="300" width="300" />
        )}
      </WrapperComponent>
    </>
  );
};

export default WishlistContent;
