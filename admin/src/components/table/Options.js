import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RiPencilLine, RiHistoryLine, RiRefreshLine, RiFileCopyLine, RiDeleteBinLine, RiEyeLine, RiSettings3Line, RiMore2Fill } from "react-icons/ri";
import NoSsr from "../../utils/hoc/NoSsr";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import AnswerModal from "../q&a/widgets/AnswerModal";
import DeleteButton from "./DeleteButton";
import ViewDetails from "./ViewDetails";
import MoveToTrashButton from "./MoveToTrashButton";
import OrderQuickView from "../orders/OrderQuickView";
import request from "@/utils/axiosUtils";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";

const Options = ({ fullObj, mutate, type, moduleName, optionPermission, refetch, keyInPermission, isTrashedView, forceDeleteMutate, restoreMutate }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation("common");
  const [modal, setModal] = useState(false);
  const [forceDeleteModal, setForceDeleteModal] = useState(false);
  const skipPermission = optionPermission?.allowAllOptions;
  const [permEdit, permDestroy] = usePermissionCheck(["edit", "destroy"], keyInPermission ?? keyInPermission);
  const edit = skipPermission ? true : permEdit;
  const destroy = skipPermission ? true : permDestroy;
  const isTrashed = isTrashedView || fullObj?.deleted_at || fullObj?.is_deleted || fullObj?.is_trashed;
  const duplicateAction = optionPermission?.optionHead?.duplicateAction || optionPermission?.optionHead?.onDuplicate;

  const getOrderId = () => fullObj?.id;
  const isOrderModule = moduleName?.toLowerCase?.() === "order";
  const isProductModule = moduleName?.toLowerCase?.() === "product";
  const isViewOnly = optionPermission?.optionHead.type == "View";
  const orderId = getOrderId();
  const canRenderOrderActions = isOrderModule && orderId;

  const handleRestore = async () => {
    try {
      if (restoreMutate) {
        restoreMutate(fullObj?.id);
      } else {
        await request({ url: `/${moduleName?.toLowerCase?.()}/${fullObj?.id}/restore`, method: "post" }, router);
        refetch && refetch();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleForceDelete = () => {
    if (forceDeleteMutate) {
      forceDeleteMutate(fullObj?.id);
    }
    setForceDeleteModal(false);
  };

  return (
    <div className="custom-ul">
      <NoSsr>
        {isViewOnly ? (
          canRenderOrderActions ? (
            <div className="orders-actions">
              <div className="orders-actions-icons">
                <OrderQuickView order={fullObj} modalTitle={optionPermission?.optionHead?.modalTitle} />
                <Link href={`/order/details/${orderId}`} title={t("Manage") || "Manage"}>
                  <RiSettings3Line />
                </Link>
              </div>
              <details className="orders-actions-dropdown">
                <summary aria-label={t("Actions") || "Actions"}>
                  <RiMore2Fill />
                </summary>
                <div className="orders-actions-menu">
                  <Link href={`/order/details/${orderId}`}>{t("View") || "View"}</Link>
                  <Link href={`/order/details/${orderId}`}>{t("Manage") || "Manage"}</Link>
                </div>
              </details>
            </div>
          ) : (
            <ViewDetails fullObj={fullObj} tableData={optionPermission?.optionHead} refetch={refetch} />
          )
            ) : (
              <>
                {isProductModule ? (
                  <div className="products-actions-dropdown">
                    <details>
                      <summary aria-label={t("Actions") || "Actions"}>
                        <RiMore2Fill />
                      </summary>
                      <div className="products-actions-menu">
                        {edit && fullObj?.id && !optionPermission?.noEdit && (
                          <Link href={`/product/edit/${fullObj.id}`}>{t("Edit") || "Edit"}</Link>
                        )}
                        {fullObj?.id && (
                          <Link href={`/product/edit/${fullObj.id}`}>{t("View") || "View"}</Link>
                        )}
                        {duplicateAction && (
                          <button
                            type="button"
                            className="products-action-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              duplicateAction(fullObj);
                            }}
                          >
                            {t("Duplicate") || "Duplicate"}
                          </button>
                        )}
                        {isTrashed && (
                          <>
                            <button type="button" className="products-action-btn" onClick={handleRestore}>
                              {t("Restore") || "Restore"}
                            </button>
                            {forceDeleteMutate && (
                              <button
                                type="button"
                                className="products-action-btn text-danger"
                                onClick={() => setForceDeleteModal(true)}
                              >
                                {t("PermanentDelete") || "Permanent Delete"}
                              </button>
                            )}
                          </>
                        )}
                        {!isTrashed && destroy && !optionPermission?.noDelete && (
                          <div className="products-action-btn danger">
                            <DeleteButton id={fullObj?.id} mutate={mutate} noImage={true} />
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                ) : (
                  <>
                <div>
                  {keyInPermission == "question_and_answer" && edit ? (
                    <a onClick={() => setModal(true)}>
                  <RiPencilLine />
                </a>
                  ) : (
                    edit &&
                    fullObj?.id &&
                    !optionPermission?.noEdit && (
                      <>
                    {moduleName?.toLowerCase?.() === "order" ? (
                      <Link href={`/order/details/${getOrderId()}`}>
                        <RiPencilLine />
                      </Link>
                    ) : optionPermission?.editRedirect ? (
                      <Link href={`/` + optionPermission?.editRedirect + "/edit/" + fullObj.id}>
                        <RiPencilLine />
                      </Link>
                    ) : type == "post" && moduleName?.toLowerCase() == "tag" ? (
                      <Link href={`/${pathname.split("/")[1]}/tag/edit/${fullObj.id}`}>
                        <RiPencilLine />
                      </Link>
                    ) : type == "post" ? (
                      <Link href={`/${pathname.split("/")[1]}/category/edit/${fullObj.id}`}>
                        <RiPencilLine />
                      </Link>
                    ) : (
                      <Link href={`/${pathname.split("/")[1]}/edit/${fullObj.id}`}>
                        <RiPencilLine />
                      </Link>
                    )}
                      </>
                    )
                  )}
                </div>
                {duplicateAction && (
                  <div>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        duplicateAction(fullObj);
                      }}
                      title="Duplicate"
                    >
                      <RiFileCopyLine />
                    </a>
                  </div>
                )}
                {moduleName?.toLowerCase?.() === "product" && (
                  <div>
                    <Link href={`/product/edit/${fullObj?.id}`}>
                      <RiHistoryLine />
                    </Link>
                  </div>
                )}
                {isTrashed && (
                  <>
                    <div>
                      <a onClick={handleRestore} title={t("Restore") || "Restore"}>
                        <RiRefreshLine />
                      </a>
                    </div>
                    {forceDeleteMutate && (
                      <div>
                        <a onClick={() => setForceDeleteModal(true)} title={t("PermanentDelete") || "Permanent Delete"}>
                          <RiDeleteBinLine className="text-danger" />
                        </a>
                      </div>
                    )}
                  </>
                )}
                {!isTrashed && optionPermission?.optionHead?.trashAction && mutate && (
                  <div>
                    <MoveToTrashButton id={fullObj?.id} mutate={mutate} modalContent={optionPermission?.optionHead?.trashAction} />
                  </div>
                )}
            {!isTrashed && <div>{destroy && !optionPermission?.noDelete && <DeleteButton id={fullObj?.id} mutate={mutate} />}</div>}
                  </>
                )}
          </>
        )}
        {modal && <AnswerModal fullObj={fullObj} modal={modal} setModal={setModal} />}
        <ShowModal
          open={forceDeleteModal}
          close={false}
          setModal={setForceDeleteModal}
          buttons={
            <>
              <Btn
                title="No"
                onClick={() => setForceDeleteModal(false)}
                className="btn-md btn-outline fw-bold"
              />
              <Btn
                title="Yes, Delete Permanently"
                onClick={handleForceDelete}
                className="btn-danger btn-md fw-bold"
              />
            </>
          }
        >
          <div className="remove-box">
            <div className="remove-icon">
              <RiDeleteBinLine className="icon-box text-danger" />
            </div>
            <h2>{t("PermanentlyDeleteItem") || "Permanently Delete Item"}?</h2>
            <p>{t("ThisActionCannotBeUndone") || "This action cannot be undone. The item will be permanently removed."}</p>
          </div>
        </ShowModal>
      </NoSsr>
    </div>
  );
};

export default Options;
