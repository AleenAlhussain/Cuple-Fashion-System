import SettingContext from "@/helper/settingContext";
import Link from "next/link";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiFullscreenExitLine, RiFullscreenFill, RiGlobalLine, RiMoonLine, RiSearchLine, RiSunLine } from "react-icons/ri";
import { Col } from "reactstrap";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import { canCreateAdminOrders, isOrdersOnlyAdminRole, getStoredAdminRoleName } from "@/utils/customFunctions/adminRoles";
import Language from "./Language";
import NotificationBox from "./NotificationBox";
import ProfileNav from "./ProfileNav";
import QuickLinks from "./QuickLinks";
import HeaderTooltip from "./HeaderTooltip";

const RightNav = ({ setMode, mode, setOpenSearchBar }) => {
  const { t } = useTranslation("common");
  const [isOrderCreate] = usePermissionCheck(["create"], "order");
  const showCreateOrder = isOrderCreate && canCreateAdminOrders();
  const roleName = getStoredAdminRoleName();
  const showQuickLinks = !isOrdersOnlyAdminRole(roleName);
  const { settingObj } = useContext(SettingContext);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const storeUrl = /*process.env.NEXT_PUBLIC_STORE_URL || settingObj?.general?.site_url ||*/ "https://cuplefashion.com/";

  const toggleFullScreen = () => {
    if ((document.fullScreenElement && document.fullScreenElement !== null) || (!document.mozFullScreen && !document.webkitIsFullScreen)) {
      setIsFullScreen((prev) => (prev = true));
      if (document.documentElement.requestFullScreen) {
        document.documentElement.requestFullScreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullScreen) {
        document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else {
      setIsFullScreen((prev) => (prev = false));
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
    }
  };

  return (
    <Col className="nav-right pull-right right-header p-0">
      <div className="header-btns d-none d-lg-flex">
        {showQuickLinks ? <QuickLinks /> : null}
        {showCreateOrder && (
          <Link href={"/order/create"} className="btn btn-animation">
            {t("Pos")}
          </Link>
        )}
      </div>
      <ul className="nav-menus">
        <li>
          <span className="header-search" onClick={() => setOpenSearchBar(true)}>
            <RiSearchLine />
          </span>
        </li>
        {storeUrl && (
          <li id="store">
            <a className="global-box" href={storeUrl} target="_blank" rel="noreferrer">
              <RiGlobalLine />
            </a>
            <HeaderTooltip target={"store"} />
          </li>
        )}

        <li>
          <div className="full-screen-box">{isFullScreen ? <RiFullscreenExitLine className="header-fullscreen" onClick={toggleFullScreen} /> : <RiFullscreenFill className="header-fullscreen" onClick={toggleFullScreen} />}</div>
        </li>
        <Language />
        <NotificationBox />
        <li id="Mode">
          <div className="mode">{mode == false ? <RiMoonLine className="ri-moon-line" onClick={() => setMode((prev) => !prev)} /> : <RiSunLine className="ri-sun-line" onClick={() => setMode((prev) => !prev)} />}</div>
          <HeaderTooltip target={"Mode"} />
        </li>
        <ProfileNav />
      </ul>
    </Col>
  );
};

export default RightNav;
