import { useGetCurrencies } from "@/utils/api";
import { useSettings } from "@/utils/hooks/useSettings";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { Href } from "@/utils/constants";
import { useHeaderScroll } from "@/utils/hooks/HeaderScroll";
import i18next from "i18next";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiEqualizer2Line, RiHeartLine, RiHeartFill, RiMenuLine, RiUserLine } from "react-icons/ri";
import { Button, Col, Container, Row } from "reactstrap";
import HeaderCart from "../widgets/headerCart";
import HeaderLogo from "../widgets/HeaderLogo";
import HeaderSearchbar from "../widgets/headerSearchbar";
import MainHeaderMenu from "../widgets/mainHeaderMenu";
import { useWishlistState } from "@/states";

const HeaderSeven = () => {
  const { themeOption, setMobileSideBar, mobileSideBar, setOpenAuthModal } = useContext(ThemeOptionContext);
  const { wishlist, initWishlist } = useWishlistState();
  const isAuthenticated = Cookies.get("uat");
  const UpScroll = useHeaderScroll(false);
  const { t } = useTranslation("common");
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initWishlist();
  }, []);
  const handleProfileClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setOpenAuthModal(true);
    }
  };
  // For Updating Currency
  const [activeCurr, setActiveCurr] = useState();
  const { settingData } = useSettings();
  const { data: currencyData } = useGetCurrencies({}, { enabled: true }); const { currencyState } = currencyData || {};

  useEffect(() => {
    let getDefaultCurrency = JSON.parse(localStorage.getItem("selectedCurrency"));
    if (getDefaultCurrency) {
      setActiveCurr(getDefaultCurrency.title);
    }
  }, []);

  const handleClick = (value) => {
    setActiveCurr(value?.title);
    localStorage.setItem("selectedCurrency", JSON.stringify(value));
  };

  // For Updating Language
  const { i18n } = useTranslation("common");
  const currentLanguage = i18n.resolvedLanguage;
  const [selectedLang, setSelectedLang] = useState({});

  const language = [
    { id: 1, title: "English", icon: "en", image: "us", isLang: "/en/" },
    { id: 2, title: "Arabic", icon: "ar", image: "ar", isLang: "/ar/" },
    { id: 3, title: "French", icon: "fr", image: "fr", isLang: "/fr/" },
    { id: 4, title: "Spanish", icon: "es", image: "es", isLang: "/es/" },
  ];
  useEffect(() => {
    const defaultLanguage = language.find((data) => data.icon == currentLanguage);
    setSelectedLang(defaultLanguage);
  }, []);
  const handleChangeLang = (value) => {
    setSelectedLang(value);
    i18next.changeLanguage(value.icon);
    router.refresh();
  };
  const handleWishlistClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setOpenAuthModal(true);
    }
  };

  return (
    <header className={`header-tools header-style ${themeOption?.header?.sticky_header_enable && UpScroll ? "sticky fixed" : ""}`}>
      <div className="logo-menu-part">
        <Container className="border-bottom-0">
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
                          <Link href="/wishlist" onClick={handleWishlistClick} className="wishlist-link">
                            {mounted && wishlist?.length > 0 ? <RiHeartFill className="theme-color" /> : <RiHeartLine />}
                            {mounted && wishlist?.length > 0 && (
                              <span className="cart_qty_cls">{wishlist.length}</span>
                            )}
                          </Link>
                        </li>
                        <li className="onhover-div">
                          <Link href="/account/dashboard" onClick={handleProfileClick}>
                            <RiUserLine />
                          </Link>
                        </li>
                        <li className="onhover-div">
                          <HeaderSearchbar />
                        </li>
                        <li className="onhover-div">
                          <RiEqualizer2Line />

                          <div className="show-div setting">
                            <h6>{t("Language")}</h6>
                            <ul>
                              {language.map((elem, i) => (
                                <li key={i}>
                                  <a onClick={() => handleChangeLang(elem)} key={i}>
                                    {elem?.image && <div className={`iti-flag ${elem?.image}`} />}
                                    {elem.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                            <h6>{t("Currency")}</h6>
                            <ul className="list-inline">
                              {currencyState?.map((elem, i) => (
                                <li id={elem.title} key={i} className={activeCurr == elem.title ? "active" : ""} onClick={() => handleClick(elem)}>
                                  <a href={Href}>
                                    {elem?.symbol} {elem?.code}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </li>
                        <li className="onhover-div">
                          <HeaderCart />
                        </li>
                      </ul>
                    </div>
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

export default HeaderSeven;
