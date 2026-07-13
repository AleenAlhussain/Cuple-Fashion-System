import NoDataFound from "@/components/widgets/NoDataFound";
import useAxios from "@/utils/api/helpers/useAxios";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { useEffect, useState } from "react";
import { Card, CardBody } from "reactstrap";
import PointTable from "./PointTable";
import { useTranslation } from "react-i18next";
import { formatPointsValue } from "./pointHelpers";

const PointAPI = "/wallet/points";

const skeletonRows = Array.from({ length: 3 });

const PointTopBar = () => {
  const [page, setPage] = useState(1);
  const { t } = useTranslation("common");
  const axios = useAxios();
  const { data, isLoading, refetch } = useFetchQuery([PointAPI], () => axios({ url: PointAPI, params: { page, paginate: 10 } }), {
    enabled: false,
    refetchOnWindowFocus: false,
    select: (res) => res?.data?.data ?? null,
  });

  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const hasTransactions = data?.transactions?.data?.length > 0;

  if (isLoading) {
    return (
      <div className="points-dashboard-wrapper">
        <Card className="loyalty-info-card loyalty-skeleton-card">
          <CardBody className="loyalty-card-body">
            <div className="loyalty-card-icon skeleton skeleton-circle" />
            <div className="flex-grow-1">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
            </div>
          </CardBody>
        </Card>
        <Card className="points-highlight-card loyalty-skeleton-card">
          <CardBody className="points-highlight-body">
            <div>
              <div className="skeleton skeleton-title" style={{ width: "120px" }} />
              <div className="skeleton skeleton-amount" />
            </div>
            <div className="skeleton skeleton-line" style={{ width: "100px" }} />
          </CardBody>
        </Card>
        <Card className="dashboard-table mt-0 points-table-card">
          <CardBody className="table-responsive-sm p-0">
            <div className="points-skeleton">
              {skeletonRows.map((_, index) => (
                <div key={index} className="points-skeleton-row skeleton" />
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="points-dashboard-wrapper">
      <Card className="loyalty-info-card">
        <CardBody className="loyalty-card-body">
          <div className="loyalty-card-icon" aria-hidden="true">
            <span>🎖️</span>
          </div>
          <div className="loyalty-card-content">
            <h5>{t("LoyaltyProgramTitle")}</h5>
            <p>{t("LoyaltyProgramDescription")}</p>
            <ul className="loyalty-info-list">
              <li>{t("LoyaltyProgramEarnRegistration")}</li>
              <li>{t("LoyaltyProgramEarnOrders")}</li>
              <li>{t("LoyaltyProgramEarnPromotions")}</li>
            </ul>
            <p className="mb-0 text-muted small">{t("LoyaltyProgramUsageHint")}</p>
          </div>
        </CardBody>
      </Card>

      <Card className="points-highlight-card">
        <CardBody className="points-highlight-body">
          <div>
            <p className="points-label">{t("TotalPoints")}</p>
            <h2 className="points-value">{formatPointsValue(data?.balance ?? 0)}</h2>
            <p className="points-subtitle">{t("LoyaltyPointsSubtitle")}</p>
          </div>
          <div className="points-highlight-icon" aria-hidden="true">
            <span>⭐</span>
          </div>
        </CardBody>
      </Card>

      <Card className="dashboard-table mt-0 points-table-card">
        <CardBody className="table-responsive-sm p-0">
          {hasTransactions ? (
            <PointTable data={data} setPage={setPage} />
          ) : (
            <NoDataFound
              customClass="no-data-added"
              imageUrl={`/assets/svg/empty-items.svg`}
              title="NoPointTransactionsYet"
              description="StartEarningPointsDescription"
              height="300"
              width="300"
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default PointTopBar;
