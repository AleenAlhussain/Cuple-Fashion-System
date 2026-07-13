import NavTabTitles from "@/components/widgets/NavTabs";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { sidebarMenu } from "@/data/pages/Account";
import Btn from "@/elements/buttons/Btn";
import Loader from "@/layout/loader";
import React, { useContext, useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine } from "react-icons/ri";
import { Col } from "reactstrap";
import SidebarProfile from ".";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import useAxios from "@/utils/api/helpers/useAxios";
import { useAuthState } from "@/states";

const AccountSidebar = ({ tabActive, controlledActiveTab, onTabChange, noNavigation = false }) => {
  // Use controlled state if provided, otherwise use local state
  const [localActiveTab, setLocalActiveTab] = useState({ id: tabActive });

  // Determine which state to use
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : localActiveTab;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setLocalActiveTab;

  const { accountMobileSideBar, setAccountMobileSideBar, setMobileSideBar, isLoading } = useContext(ThemeOptionContext);
  const { isAuthenticated } = useAuthState();
  const axios = useAxios();
  const closeAccountSidebar = () => {
    setAccountMobileSideBar(false);
  };
  const { t } = useTranslation("common");

  // Sync local state with tabActive prop when not controlled
  useEffect(() => {
    if (controlledActiveTab === undefined && tabActive) {
      setLocalActiveTab({ id: tabActive });
    }
  }, [tabActive, controlledActiveTab]);

  useEffect(() => {
    setMobileSideBar(false);
  }, [setMobileSideBar]);

  const { data: notifications = [] } = useFetchQuery(
    ["account-notifications"],
    () => axios({ url: "/notifications" }),
    {
      enabled: isAuthenticated,
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data || [],
    }
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const menuWithBadges = useMemo(
    () =>
      sidebarMenu.map((item) =>
        item.id === "notification" ? { ...item, badge: unreadCount } : item
      ),
    [unreadCount]
  );

  if (isLoading) return <Loader />;
  return (
    <Col lg={3}>
      <div className={`dashboard-sidebar ${accountMobileSideBar ? "open" : ""}`}>
        <Btn color="transparent" className="back-btn" onClick={closeAccountSidebar}>
          <RiCloseLine />
          <span>{t("Close")}</span>
        </Btn>
        <SidebarProfile />
        <div className="faq-tab">
          <NavTabTitles
            classes={{ navClass: "nav nav-tabs" }}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            titleList={menuWithBadges}
            isLogout
            callBackFun={closeAccountSidebar}
            noNavigation={noNavigation}
          />
        </div>
      </div>
    </Col>
  );
};

export default AccountSidebar;
