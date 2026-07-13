import { useAuthState } from "@/states";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import { useSettings } from "@/utils/hooks/useSettings";
import { ImagePath } from "@/utils/constants";
import ProfileInformation from "./ProfileInformation";

const DashboardContent = () => {
  const { t } = useTranslation("common");
  const { accountData, initAuth, refetch } = useAuthState();
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Initialize auth from localStorage and fetch fresh data
    initAuth();
    refetch();
  }, []);

  // Use consistent values for SSR to prevent hydration mismatch
  const displayName = mounted ? (accountData?.name ?? t("User")) : t("User");
  const walletBalance = mounted ? (accountData?.wallet?.balance ?? 0) : 0;
  const pointBalance = mounted ? (accountData?.point?.balance ?? 0) : 0;
  const ordersCount = mounted ? (accountData?.orders_count ?? 0) : 0;

  return (
    <div className="counter-section">
      <div className="welcome-msg">
        <h4>
          {t("Hello")}, {displayName} !
        </h4>
        <p>{t("DashboardDescription")}</p>
      </div>

      <div className="total-box">
        <Row>
          <Col md={4}>
            <div className="counter-box">
              <Image src={`${ImagePath}/icon/dashboard/account1.png`} alt="wallerSvg" height={50} width={50} className="img-fluid" />
              <div>
                <h3>{convertCurrency(walletBalance)}</h3>
                <h5>{t("Balance")}</h5>
              </div>
            </div>
          </Col>
          <Col md={4}>
            <div className="counter-box">
              <Image src={`${ImagePath}/icon/dashboard/account2.png`} className="img-fluid" alt="coinSvg" height={50} width={50} />
              <div>
                <h3>{convertCurrency(pointBalance)}</h3>
                <h5>{t("TotalPoints")}</h5>
              </div>
            </div>
          </Col>
          <Col md={4}>
            <div className="counter-box">
              <Image src={`${ImagePath}/icon/dashboard/account3.png`} className="img-fluid" alt="orderSvg" height={50} width={50} />
              <div>
                <h3>{Number(ordersCount)}</h3>
                <h5>{t("TotalOrders")}</h5>
              </div>
            </div>
          </Col>
          <ProfileInformation />
        </Row>
      </div>
    </div>
  );
};

export default DashboardContent;
