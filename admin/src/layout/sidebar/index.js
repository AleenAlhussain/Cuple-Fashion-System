import LogoWrapper from "@/components/commonComponent/logoWrapper";
import AccountContext from "@/helper/accountContext";
import SettingContext from "@/helper/settingContext";
import dynamic from "next/dynamic";
import { useContext, useEffect, useState } from "react";
import MENUITEMS from "./MenuData";

const MenuList = dynamic(() => import("./MenuList"), {
  ssr: false,
});
const Sidebar = () => {
  const [activeMenu, setActiveMenu] = useState([]);
  const { role, setRole } = useContext(AccountContext);
  const { sidebarOpen, setSidebarOpen } = useContext(SettingContext);

  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    let storedRole;
    const ISSERVER = typeof window === "undefined";
    if (!ISSERVER) {
      storedRole = localStorage.getItem("role");
    } else {
      storedRole = null;
    }

    if (storedRole && storedRole !== "undefined" && storedRole !== "null") {
      try {
        const parsedRole = JSON.parse(storedRole);
        if (parsedRole?.name) {
          setRole(parsedRole.name);
        }
      } catch (e) {
        // Invalid JSON, clear the stored value
        localStorage.removeItem("role");
      }
    }
  }, []);


  return (
    <div className={`sidebar-wrapper ${sidebarOpen ? "close_icon" : ""}`}>
      <div className={`${mounted ? "skeleton-loader" : ""}`}>
        <LogoWrapper setSidebarOpen={setSidebarOpen} />
        <nav className="sidebar-main">
          <div id="sidebar-menu">
            <ul className="sidebar-links" id="simple-bar">
               <MenuList menu={MENUITEMS} level={0} activeMenu={activeMenu} setActiveMenu={setActiveMenu} key={role} />
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
