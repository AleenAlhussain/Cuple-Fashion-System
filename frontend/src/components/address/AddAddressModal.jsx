import CustomModal from "@/components/widgets/CustomModal";
import AddAddressForm from "@/components/pages/checkout/common/AddAddressForm";

const AddAddressModal = ({
  isOpen,
  onClose,
  mutate,
  isLoading,
  type,
  editAddress,
  setEditAddress,
  modalValue = "add",
  method,
  autoLocationKey,
  isFooterDisplay = true,
}) => {
  const title = modalValue === "edit" ? "EditAddress" : "AddAddress";

  return (
    <CustomModal
      modal={Boolean(isOpen)}
      setModal={onClose}
      classes={{ modalClass: "theme-modal-2 view-modal address-modal", title }}
    >
      <div className="right-sidebar-box">
        <AddAddressForm
          mutate={mutate}
          isLoading={isLoading}
          setModal={onClose}
          setEditAddress={setEditAddress}
          editAddress={editAddress}
          modal={modalValue}
          method={modalValue === "edit" ? method : "POST"}
          type={type}
          isFooterDisplay={isFooterDisplay}
          autoLocationKey={modalValue === "edit" ? null : autoLocationKey}
        />
      </div>
    </CustomModal>
  );
};

export default AddAddressModal;
