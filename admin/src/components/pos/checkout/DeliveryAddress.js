import { useEffect, useState } from "react";
import { RiAddLine, RiMapPinLine } from "react-icons/ri";
import { Row } from "reactstrap";
import ShowModal from "../../../elements/alerts&Modals/Modal";
import request from "../../../utils/axiosUtils";
import { AddressAPI, user } from "../../../utils/axiosUtils/API";
import useCreate from "../../../utils/hooks/useCreate";
import CommonAddressForm from "./CommonAddressForm";
import ShowAddress from "./ShowAddress";
import CheckoutCard from "./common/CheckoutCard";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const DeliveryAddress = ({ values, updateId, type, title, setFieldValue }) => {
  const router = useRouter() 
  const { t } = useTranslation( 'common');
  const [modal, setModal] = useState(false);
  const [address, setAddress] = useState([])
  // Getting user by its id
  const { data, isLoading: load, refetch } = useCustomQuery(
    [user, updateId],
    () => request({ url: `/${user}/${updateId}` }, router),
    { enabled: false, refetchOnWindowFocus: false, select: (res) => res?.data?.data }
  );
  // Creating Address
  const {mutate: addressMutate, isLoading } = useCreate(AddressAPI, false, false, "Address Added successfully", () => {
    refetch(); setModal(false)
  });
  useEffect(() => {
    setAddress(data)
  }, [data ])
  useEffect(() => {
    if (updateId) {
      refetch();
    }
  }, [updateId, refetch]);

  useEffect(() => {
    if (!setFieldValue || !updateId) return;
    const addrKey = `${type}_address_id`;
    const list = data?.addresses || [];
    if (!list.length || values?.[addrKey]) return;
    const preferred =
      type === "shipping"
        ? list.find((item) => item?.is_default_shipping)
        : list.find((item) => item?.is_default_billing);
    const selected = preferred || list[0];
    if (selected?.id) {
      setFieldValue(addrKey, selected.id);
    }
  }, [data?.addresses, type, updateId, values, setFieldValue]);
  return (
    <>
      <CheckoutCard icon={<RiMapPinLine />}>
        <div className="checkout-title">
          <h4>{t(title)} {t("Address")}</h4>
          {values['consumer_id'] && <a className="d-flex align-items-center fw-bold" onClick={() => setModal(true)}><RiAddLine className="me-1"></RiAddLine>{t("AddNew")}</a>}
        </div>
        <div className="checkout-detail">
          {<>
            {values['consumer_id'] && data?.addresses?.length > 0 ?
              <Row className="g-4">
                {address?.addresses?.map((item, i) => (
                  <ShowAddress item={item} data={data} key={i} type={type} index={i} />
                ))}
              </Row>
              : <div className="empty-box">
                <h2>{t("NoaddressFound")}</h2>
              </div>}
          </>
          }
          <ShowModal modalAttr={{ className: "modal-lg" }} title={"AddShippingAddress"} open={modal} setModal={setModal}>
            <CommonAddressForm setModal={setModal} loading={isLoading} updateId={values["consumer_id"]} type={type} addressMutate={addressMutate} customerPhone={data?.phone} />
          </ShowModal>
        </div>
      </CheckoutCard>
    </>
  );
}

export default DeliveryAddress;
