import { useAuthState } from "@/states";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { Nav, NavItem, NavLink } from "reactstrap";
import ConfirmationModal from "./ConfirmationModal";

const NavTabTitles = ({ classes = {}, activeTab, setActiveTab, titleList, isLogout, callBackFun, noNavigation = false }) => {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const { logout } = useAuthState();
  const { t } = useTranslation("common");
  const checkType = (value, index) => {
    if (typeof activeTab == "object") {
      return activeTab.id == value.id;
    } else {
      return activeTab == String(index + 1);
    }
  };

  const handleLogout = async () => {
    await logout();
    Cookies.remove("CookieAccept");
    router.push(`/`);
    localStorage.clear();
    setModal(false);
  };

  const onNavClick = (elem, i) => {
    if (typeof activeTab === "object") {
      setActiveTab(elem);
    } else {
      setActiveTab(String(i + 1));
    }
    // Only navigate if noNavigation is explicitly false and path exists
    if (noNavigation !== true && elem.path) {
      try {
        router.push(`${elem.path}`);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
    callBackFun && callBackFun();
  };
  return (
    <>
      <Nav className={classes?.navClass}>
        {titleList.map((elem, i) => (
          <NavItem key={i}>
            <NavLink className={checkType(elem, i) ? "active" : ""} onClick={() => onNavClick(elem, i)}>
              {elem.icon && elem.icon}
              {t(elem?.title) || t(elem?.name)}
              {Number(elem?.badge) > 0 && <span className="nav-badge">{elem.badge}</span>}
            </NavLink>
          </NavItem>
        ))}
        {isLogout && (
          <NavItem className="logout-cls">
            <a className="btn loagout-btn" onClick={() => setModal(true)}>
              <RiLogoutBoxRLine className="me-2" />
              {t("LogOut")}
            </a>
          </NavItem>
        )}
      </Nav>
      <ConfirmationModal modal={modal} setModal={setModal} confirmFunction={handleLogout} />
    </>
  );
};

export default NavTabTitles;
