import ThemeOptionContext from "@/context/themeOptionsContext";
import { useHeaderScroll } from "@/utils/hooks/HeaderScroll";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RiHeartLine, RiHeartFill, RiMenuLine, RiUserLine } from "react-icons/ri";
import { Button, Col, Container, Row } from "reactstrap";
import HeaderCart from "../widgets/headerCart";
import HeaderLogo from "../widgets/HeaderLogo";
import HeaderSearchbar from "../widgets/headerSearchbar";
import MainHeaderMenu from "../widgets/mainHeaderMenu";
import TopBar from "../widgets/TopBar";
import { Href } from "@/utils/constants";
import { useWishlistState } from "@/states";

const HeaderFour = () => {
  const { t } = useTranslation("common");
  const { themeOption, mobileSideBar, setMobileSideBar, setOpenAuthModal } = useContext(ThemeOptionContext);
  const { wishlist, initWishlist } = useWishlistState();
  const router = useRouter();
  const isAuthenticated = Cookies.get("uat");

  useEffect(() => {
    initWishlist();
  }, []);
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
  const UpScroll = useHeaderScroll(false);

  return (
    <header className={`header-5 overlay-style ${themeOption?.header?.sticky_header_enable && UpScroll ? "sticky fixed" : ""}`}>
      {themeOption?.header?.page_top_bar_enable && <TopBar />}
      <Container>
        <Row>
          <Col sm="12">
            <div className="main-menu">
              <div className="menu-left">
                <div className="toggle-nav" onClick={() => setMobileSideBar(!mobileSideBar)}>
                  <RiMenuLine className="sidebar-bar" />
                </div>
                <div className="brand-logo">
                  <HeaderLogo />
                </div>
              </div>
              <div className="menu-right pull-right">
                <div className="main-navbar">
                  <div id="mainnav">
                    <div className="header-nav-middle">
                      <div className="main-nav navbar navbar-expand-xl navbar-light navbar-sticky">
                        <div className={`offcanvas offcanvas-collapse order-xl-2 ${mobileSideBar ? "show" : ""} `}>
                          <div className="offcanvas-header navbar-shadow">
                            <h5>{t("Menu")}</h5>
                            <Button close className="lead" id="toggle_menu_btn" type="button" onClick={() => setMobileSideBar(false)}>
                              <div>
                                <i className="ri-close-fill"></i>
                              </div>
                            </Button>
                          </div>
                          <div className="offcanvas-body">
                            <MainHeaderMenu />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="icon-nav">
                    <ul>
                      <li className="onhover-div">
                        <HeaderSearchbar />
                      </li>
                      <li className="onhover-div">
                        <Link href="/wishlist" onClick={handleWishlistClick} className="wishlist-link">
                          {wishlist?.length > 0 ? <RiHeartFill className="theme-color" /> : <RiHeartLine />}
                          {wishlist?.length > 0 && (
                            <span className="cart_qty_cls">{wishlist.length}</span>
                          )}
                        </Link>
                      </li>
                      <li className="onhover-div">
                        <HeaderCart />
                      </li>
                      <li className="onhover-div">
                        <Link href="/account/dashboard" onClick={handleProfileClick}>
                          <RiUserLine />
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </header>
  );
};

export default HeaderFour;
