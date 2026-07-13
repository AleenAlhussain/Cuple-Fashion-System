import ConfirmDeleteModal from "@/components/widgets/ConfirmDeleteModal";
import Btn from "@/elements/buttons/Btn";
import { useAuthState } from "@/states";
import { AddressAPI } from "@/utils/api";
import useDelete from "@/utils/hooks/useDelete";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import AddressTable from "./AddressTable";

const AddressData = ({ addressState, setAddressState, modal, setModal, setEditAddress }) => {
  const [deleteId, setDeleteId] = useState("");
  const { data, mutate, isLoading } = useDelete(AddressAPI, false);
  const { t } = useTranslation("common");
  const refetchAuth = useAuthState((state) => state.refetch);

  const removeAddress = () => {
    if (deleteId) {
      mutate(deleteId);
    }
  };
  useEffect(() => {
    if (data?.status === 200 || data?.data?.success) {
      setAddressState((prev) => prev.filter((elem) => elem.id !== deleteId));
      setModal("");
      setDeleteId("");
      // Refresh auth state so checkout page also gets updated
      refetchAuth();
    }
  }, [data]);

  return (
    <Row className="g-4">
      {addressState?.map((address, i) => (
        <Col xl={4} md={6} key={i}>
          <div className="select-box">
            <div className="address-box">
              <AddressTable address={address} />
              <div className="bottom">
                <Btn
                  color="transparent"
                  className="bottom_btn"
                  onClick={() => {
                    setEditAddress(address);
                    setModal("edit");
                  }}
                >
                  {t("Edit")}
                </Btn>
                <Btn
                  color="transparent"
                  className="bottom_btn"
                  onClick={() => {
                    setDeleteId(address?.id);
                    setModal("remove");
                  }}
                >
                  {t("Remove")}
                </Btn>
              </div>
            </div>
          </div>
        </Col>
      ))}
      <ConfirmDeleteModal modal={modal == "remove"} setModal={setModal} loading={isLoading} confirmFunction={removeAddress} setDeleteId={setDeleteId} />
    </Row>
  );
};

export default AddressData;
