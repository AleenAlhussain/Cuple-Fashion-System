import { usePathname, useRouter } from "next/navigation";
import { useContext, useState } from "react";
import { RiEyeLine } from "react-icons/ri";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";
import BadgeContext from "../../helper/badgeContext";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import ViewDetailBody from "./ViewDetailBody";
import request from "@/utils/axiosUtils";
import SuccessHandle from "../../utils/customFunctions/SuccessHandle";

const ViewDetails = ({ fullObj, tableData, refetch }) => {
  const [loadingState, setLoadingState] = useState("");
  const [action] = usePermissionCheck(["action"], tableData?.permissionKey);
  const router = useRouter();
  const pathname = usePathname();
  const { state, dispatch } = useContext(BadgeContext);
  const [modal, setModal] = useState(false);
  const OnStatusClick = async (value) => {
    if (!tableData?.url || !fullObj?.id) return;
    setLoadingState(value);
    try {
      const res = await request({ url: `${tableData.url}/${fullObj.id}`, method: "put", data: { status: value } }, router);
      SuccessHandle(res, false, false, tableData?.message);
      setModal(false);
      tableData?.refetch && tableData?.refetch();
      refetch && refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingState("");
    }
  };
  const getOrderNumber = () => {
    if (fullObj?.order_number?.props?.children?.[1]) {
      return fullObj.order_number.props.children[1];
    }
    return fullObj?.order_number;
  };
  const redirectLink = () => {
    const redirectUrl = tableData?.redirectUrl || "";
    const orderTarget = fullObj?.id ?? getOrderNumber();
    const target = redirectUrl.includes("/order/details") ? orderTarget : fullObj?.id ?? getOrderNumber();
    router.push(`${redirectUrl}/${target}`);
  };
  return (
    <>
      <div>
        <a
          onClick={() => {
            tableData?.redirectUrl ? redirectLink() : setModal(true);
          }}
        >
          <RiEyeLine className="ri-pencil-line" />
        </a>
      </div>
      <ShowModal
        open={modal}
        title={tableData.modalTitle}
        close={true}
        setModal={setModal}
        buttons={
          <>
            {action && (
              <>
                <Btn title="Under Review" onClick={() => OnStatusClick("under_review")} loading={Number(loadingState == "under_review")} className="btn-md btn-outline fw-bold" />
                <Btn title="Approve" onClick={() => OnStatusClick("approved")} loading={Number(loadingState == "approved")} className="btn-theme btn-md fw-bold" />
                <Btn title="Processing" onClick={() => OnStatusClick("processing")} loading={Number(loadingState == "processing")} className="btn-md btn-outline fw-bold" />
                <Btn title="Completed" onClick={() => OnStatusClick("completed")} loading={Number(loadingState == "completed")} className="btn-theme btn-md fw-bold" />
                <Btn title="Reject" onClick={() => OnStatusClick("rejected")} loading={Number(loadingState == "rejected")} className="btn-md btn-outline fw-bold" />
              </>
            )}
          </>
        }
      >
        <ViewDetailBody fullObj={fullObj} refetch={refetch} />
      </ShowModal>
    </>
  );
};

export default ViewDetails;
