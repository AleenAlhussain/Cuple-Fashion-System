import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RiDeleteBin2Line } from "react-icons/ri";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";

const MoveToTrashButton = ({ id, mutate, modalContent }) => {
  const { t } = useTranslation("common");
  const [modal, setModal] = useState(false);

  if (!id || !mutate) return null;

  const titleKey = modalContent?.titleKey || "MoveProductToTrash";
  const descriptionKey = modalContent?.descriptionKey || "MoveProductToTrashDescription";
  const confirmKey = modalContent?.confirmKey || "Move";
  const triggerKey = modalContent?.triggerKey || "MoveToTrash";

  const handleConfirm = () => {
    mutate(id);
    setModal(false);
  };

  return (
    <>
      <a style={{ color: "#f17c0a" }} onClick={() => setModal(true)} title={t(triggerKey)}>
        <RiDeleteBin2Line />
      </a>
      <ShowModal
        open={modal}
        close={false}
        setModal={setModal}
        buttons={
          <>
            <Btn
              title="No"
              onClick={() => {
                setModal(false);
              }}
              className="btn-md btn-outline fw-bold"
            />
            <Btn title={confirmKey} onClick={handleConfirm} className="btn-theme btn-md fw-bold" />
          </>
        }
      >
        <div className="remove-box">
          <div className="remove-icon">
            <RiDeleteBin2Line className="icon-box" />
          </div>
          <h2 className="mt-2">{t(titleKey)}</h2>
          <p>{t(descriptionKey)}</p>
        </div>
      </ShowModal>
    </>
  );
};

export default MoveToTrashButton;
