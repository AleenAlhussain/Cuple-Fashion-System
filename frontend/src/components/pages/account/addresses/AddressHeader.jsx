import NoDataFound from "@/components/widgets/NoDataFound";
import { useAuthState } from "@/states";
import { AddressAPI } from "@/utils/api";
import Btn from "@/elements/buttons/Btn";

import useCreate from "@/utils/hooks/useCreate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "reactstrap";
import AddAddressModal from "@/components/address/AddAddressModal";
import AddressData from "./AddressData";

const AddressHeader = () => {
  const { t } = useTranslation("common");
  const [addressState, setAddressState] = useState([]);
  const [editAddress, setEditAddress] = useState();
  const [modal, setModal] = useState("");
  const [autoLocationKey, setAutoLocationKey] = useState(0);
  const user = useAuthState((state) => state.user);
  const refetch = useAuthState((state) => state.refetch);

  // Refresh user data on mount to get latest addresses
  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    const addresses = user?.address || user?.addresses || [];
    if (addresses.length > 0) {
      setAddressState([...addresses]);
    }
  }, [user]);
  const { mutate, isLoading } = useCreate(AddressAPI, false, false, "Address Added successfully", (resDta) => {
    setAddressState((prev) => [...prev, resDta?.data]);
    setModal("");
    refetch(); // Update auth state with new address
  });
  const { mutate: editMutate, isLoading: editLoader } = useCreate(`${AddressAPI}/${editAddress?.id}`, false, false, "Address Updated successfully", (resDta) => {
    setAddressState((prev) =>
      prev.map((elem) => {
        if (elem?.id == resDta?.data?.id) {
          return (elem = resDta?.data);
        } else {
          return elem;
        }
      })
    );
    setModal("");
    setEditAddress("");
  });
  const openAddModal = () => {
    setModal("add");
    setEditAddress(undefined);
    setAutoLocationKey((prev) => prev + 1);
  };

  return (
    <Card>
      <CardBody>
        <div className="top-sec">
          <h3>{t("AddressBook")}</h3>
          <Btn tag="a" size="sm" color="transparent" className=" btn-solid" onClick={openAddModal}>
            + {t("AddNew")}
          </Btn>
        </div>
        {addressState?.length > 0 ? (
          <>
            <div className="address-book-section">
              <AddressData addressState={addressState} setAddressState={setAddressState} modal={modal} setModal={setModal} setEditAddress={setEditAddress} />
            </div>
          </>
        ) : (
          <NoDataFound customClass="no-data-added" imageUrl={`/assets/svg/empty-items.svg`} title="NoAddressFound" description="NoAddressDescription" height="300" width="300" />
        )}
        <AddAddressModal
          isOpen={modal === "add" || modal === "edit"}
          onClose={() => setModal("")}
          mutate={modal === "add" ? mutate : editMutate}
          isLoading={isLoading || editLoader}
          editAddress={editAddress}
          setEditAddress={setEditAddress}
          modalValue={modal === "edit" ? "edit" : "add"}
          autoLocationKey={modal === "add" ? autoLocationKey : null}
          method="PUT"
        />
      </CardBody>
    </Card>
  );
};

export default AddressHeader;
