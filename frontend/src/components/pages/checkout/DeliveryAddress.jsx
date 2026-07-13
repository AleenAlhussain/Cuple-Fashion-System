import React, { useEffect, useState } from 'react';
import { Row } from 'reactstrap';
import { RiAddLine, RiMapPinLine } from 'react-icons/ri';
import { useTranslation } from "react-i18next";
import CheckoutCard from './common/CheckoutCard';
import AddAddressModal from "@/components/address/AddAddressModal";
import ShowAddress from './ShowAddress';
import ConfirmDeleteModal from '@/components/widgets/ConfirmDeleteModal';
import useDelete from '@/utils/hooks/useDelete';
import { AddressAPI } from '@/utils/api';
import { useAuthState } from '@/states';

const DeliveryAddress = ({ type, title, address, modal, mutate, isLoading, setModal, setFieldValue, values }) => {
  const { t } = useTranslation('common');
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { data: deleteData, mutate: deleteAddress, isLoading: deleteLoading } = useDelete(AddressAPI, false);
  const refetchAuth = useAuthState((state) => state.refetch);

  // Set default address when addresses load
  useEffect(() => {
    if (address?.length > 0) {
      setFieldValue(`${type}_address_id`, address[0].id);
      // Also set country_id from the address for the order
      if (address[0].country_id) {
        setFieldValue("country_id", address[0].country_id);
      }
    }
  }, [address, type, setFieldValue]);

  // Update country_id when address selection changes
  useEffect(() => {
    const addressId = type === "shipping" ? values?.shipping_address_id : values?.billing_address_id;
    if (addressId && address?.length > 0) {
      // Handle both number and string comparison
      const selectedAddress = address.find(addr => String(addr.id) === String(addressId));
      if (selectedAddress?.country_id) {
        setFieldValue("country_id", selectedAddress.country_id);
      }
    }
  }, [values?.shipping_address_id, values?.billing_address_id, address, type, setFieldValue]);

  // Handle successful deletion
  useEffect(() => {
    if (deleteData?.status === 200 || deleteData?.data?.success) {
      setShowDeleteModal(false);
      setDeleteId(null);
      // Refresh auth state to update address list
      refetchAuth();
    }
  }, [deleteData]);

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteAddress(deleteId);
    }
  };

  return (
    <>
      <CheckoutCard icon={<RiMapPinLine />}>
        <div className='checkout-title'>
          <h4>
            {title ? t(title) : t('Address')}
          </h4>
          <a className='d-flex align-items-center fw-bold' onClick={() => setModal(type)}>
            <RiAddLine className='me-1'></RiAddLine>
            {t('AddNew')}
          </a>
        </div>
        <div className='checkout-detail'>
          {
            <>
              {address?.length > 0 ? (
                <Row className='g-4'>
                  {address?.map((item, i) => (
                    <ShowAddress item={item} key={i} type={type} index={i} onDelete={handleDeleteClick} />
                  ))}
                </Row>
              ) : (
                <div className='empty-box'>
                  <h2>{t('NoaddressFound')}</h2>
                </div>
              )}
            </>
          }
          <AddAddressModal
            isOpen={modal === type}
            onClose={() => setModal("")}
            mutate={mutate}
            isLoading={isLoading}
            type={type}
            modalValue="add"
          />
        </div>
      </CheckoutCard>
      <ConfirmDeleteModal
        modal={showDeleteModal}
        setModal={setShowDeleteModal}
        loading={deleteLoading}
        confirmFunction={confirmDelete}
      />
    </>
  );
};

export default DeliveryAddress;
