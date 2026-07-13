"use client";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { Container } from "reactstrap";
import Loader from "../components/commonComponent/Loader";
import AccountContext from "../helper/accountContext";
import ConvertPermissionArr from "../utils/customFunctions/ConvertPermissionArr";
import { replacePath } from "../utils/customFunctions/ReplacePath";
import useForceDarkText from "../utils/hooks/useForceDarkText";
import { getStoredAdminRoleName, isOrdersOnlyAdminRole } from "../utils/customFunctions/adminRoles";
import Footer from "./footer";
import Header from "./header";
import Sidebar from "./sidebar";

const Layout = (props) => {
  const [mode, setMode] = useState(false);

  // Force dark text colors in light mode (fallback for CSS issues)
  useForceDarkText();
  const [ltr, setLtr] = useState(true);
  const [mounted, setMounted] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { accountData, isAuthLoading } = useContext(AccountContext);

  const storedAccountData = useMemo(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("account");
    if (stored && stored !== "undefined" && stored !== "null") {
      try {
        return JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem("account");
        return {};
      }
    }
    return {};
  }, []);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("version=1.0.0");
  }, []);

  useEffect(() => {
    if (mode) {
      document.body.classList.add("dark-only");
    } else {
      document.body.classList.remove("dark-only");
    }
  }, [mode]);

  useEffect(() => {
    if (!mounted) return;
    const securePaths = ConvertPermissionArr(storedAccountData?.permissions);
    const currentPath = replacePath(path?.split("/")[1]);
    if (securePaths.length > 0 && !securePaths.find((item) => item?.name === currentPath)) {
      // Permission guard handled inside page components.
    }
  }, [mounted, storedAccountData, path]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!accountData) {
      router.push("/auth/login");
    }
  }, [isAuthLoading, accountData, router]);

  useEffect(() => {
    if (!mounted || isAuthLoading || !accountData) return;

    const roleName = accountData?.role?.name || getStoredAdminRoleName();
    const currentPath = path || "";

    if (isOrdersOnlyAdminRole(roleName) && !currentPath.startsWith("/order")) {
      router.replace("/order");
    }
  }, [mounted, isAuthLoading, accountData, path, router]);

  if (isAuthLoading) {
    return <Loader />;
  }

  if (!accountData) {
    return null;
  }
  return (
    <>
      <div className="page-wrapper compact-wrapper" id="pageWrapper">
        <Header setMode={setMode} mode={mode} setLtr={setLtr} settingData={"settingData"} />
        <div className="page-body-wrapper">
          <Sidebar />
          <div className="page-body">
            <Container fluid={true}>{props.children}</Container>
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
