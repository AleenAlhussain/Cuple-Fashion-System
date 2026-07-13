"use client";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useHeaderScroll } from "@/utils/hooks/HeaderScroll";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { RiHeartLine, RiHeartFill, RiMenuLine, RiUserLine } from "react-icons/ri";
import { Button, Col, Container, Row } from "reactstrap";
import HeaderCart from "../widgets/headerCart";
import HeaderLogo from "../widgets/HeaderLogo";
import HeaderSearchbar from "../widgets/headerSearchbar";
import MainHeaderMenu from "../widgets/mainHeaderMenu";
import TopBar from "../widgets/TopBar";
import { useTranslation } from "react-i18next";
import { useCartState, useWishlistState } from "@/states";

const HeaderOne = () => {
  const {
    themeOption,
    setOpenAuthModal,
    openAuthModal,
    mobileSideBar,
    setMobileSideBar,
  } = useContext(ThemeOptionContext);
  const { initCart } = useCartState();
  const { wishlist, initWishlist } = useWishlistState();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initCart();
    initWishlist();
    // Ensure sidebar is closed on mount
    setMobileSideBar(false);
  }, []);
  const UpScroll = useHeaderScroll(false);
  const { t } = useTranslation("common");
  const router = useRouter();
  const isAuthenticated = Cookies.get("uat");
  const handleProfileClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setOpenAuthModal(true);
    }
  };
  const handleWishlistClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setOpenAuthModal(true);
    }
  };

  return (
    <header
      className={`${
        themeOption?.header?.sticky_header_enable && UpScroll
          ? "sticky fixed"
          : ""
      }`}
    >
      {themeOption?.header?.page_top_bar_enable && <TopBar />}
      <div className="metro">
        <Container>
          <Row>
            <Col sm="12">
              <div className="main-menu d-flex align-items-center justify-content-between">
                {/* Left: Logo + Mobile Toggle */}
                <div className="menu-left d-flex align-items-center">
                  <div
                    className="toggle-nav d-xl-none"
                    onClick={() => setMobileSideBar(!mobileSideBar)}
                  >
                    <RiMenuLine className="sidebar-bar" />
                  </div>
                  <div className="brand-logo">
                    <HeaderLogo />
                  </div>
                </div>

                {/* Center: Desktop Navigation */}
                <nav className="main-navbar d-none d-xl-block">
                  <MainHeaderMenu />
                </nav>

                {/* Right: Icons */}
                <div className="header-icons">
                  <div className="icon-nav">
                    <ul className="d-flex align-items-center list-unstyled mb-0">
                      <li className="onhover-div d-none d-sm-block">
                        <HeaderSearchbar />
                      </li>
                      <li className="onhover-div d-none d-md-block">
                        <Link
                          href="/wishlist"
                          onClick={handleWishlistClick}
                          className="wishlist-link"
                        >
                          {wishlist?.length > 0 ? <RiHeartFill className="theme-color" /> : <RiHeartLine />}
                          {wishlist?.length > 0 && (
                            <span className="cart_qty_cls">{wishlist.length}</span>
                          )}
                        </Link>
                      </li>
                      <li className="onhover-div mt-2">
                        <HeaderCart />
                      </li>
                      <li className="onhover-div d-none d-md-block">
                        <Link
                          href="/account/dashboard"
                          onClick={handleProfileClick}
                        >
                          <RiUserLine />
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Mobile Sidebar Offcanvas */}
                {isMounted && mobileSideBar && (
                  <div
                    className="offcanvas-backdrop show d-xl-none"
                    onClick={() => setMobileSideBar(false)}
                  />
                )}
                <div
                  className={`offcanvas offcanvas-start d-xl-none ${
                    isMounted && mobileSideBar ? "show" : ""
                  }`}
                >
                  <div className="offcanvas-header">
                    <h5>{t("Menu")}</h5>
                    <Button
                      close
                      type="button"
                      onClick={() => setMobileSideBar(false)}
                    >
                      <i className="ri-close-fill"></i>
                    </Button>
                  </div>
                  <div className="offcanvas-body">
                    <MainHeaderMenu className="mobile-menu-list" />
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </header>
  );
};

export default HeaderOne;
