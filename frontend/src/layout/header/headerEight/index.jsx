import ThemeOptionContext from "@/context/themeOptionsContext";
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
import { Href } from "@/utils/constants";
import { useWishlistState } from "@/states";

const HeaderEight = () => {
  const { setOpenAuthModal, mobileSideBar, setMobileSideBar } = useContext(ThemeOptionContext);
  const { wishlist, initWishlist } = useWishlistState();
  const { t } = useTranslation("common");
  const isAuthenticated = Cookies.get("uat");
  const router = useRouter();

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

  return (
    <header className="full-scroll-menu">
      <Container fluid>
        <Row>
          <Col sm="12">
            <div className="main-menu">
              <div className="menu-left">
                <div className="navbar white-navbar">
                  <div className="bar-style" onClick={() => setMobileSideBar(!mobileSideBar)}>
                    <RiMenuLine className="sidebar-bar" />
                  </div>
                  <div id="mySideNav" className={`sidenav ${mobileSideBar ? "open-side" : ""} `} style={{ left: mobileSideBar ? "0px" : "" }}>
                    <nav>
                      <div className="sidebar-back text-start" onClick={() => setMobileSideBar(false)}>
                        {t("Back")}
                      </div>
                      <div className="main-navbar">
                        <div id="mainnav">
                          <div className="header-nav-middle">
                            <div className="main-nav navbar navbar-expand-xl navbar-light navbar-sticky">
                              <div className={`offcanvas offcanvas-collapse order-xl-2  `}>
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
                    </nav>
                  </div>
                </div>
                <div className="brand-logo">
                  <HeaderLogo />
                </div>
              </div>
              <div className="menu-right pull-right">
                <div>
                  <div className="icon-nav white-icon">
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

export default HeaderEight;
