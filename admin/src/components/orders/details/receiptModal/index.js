import ShowModal from "@/elements/alerts&Modals/Modal";
import SettingContext from "@/helper/settingContext";
import { dateFormat } from "@/utils/customFunctions/DateFormat";
import React, { useContext } from "react";
import ReceiptModalTable from "./ReceiptModalTable";
import Btn from "@/elements/buttons/Btn";
import { useTranslation } from "react-i18next";

const ReceiptModal = ({ open, setOpen, data }) => {
    
    const { t } = useTranslation( 'common');
    const { settingObj } = useContext(SettingContext);
    return (
        <ShowModal
            open={open}
            setModal={setOpen}
            modalAttr={{ className: "theme-modal modal-sm invoice-modal" }}
            buttons={
                <div className="modal-btn-group d-flex align-items-center gap-2 justify-content-center">
                    <Btn className="btn-sm btn-animation theme-bg-color" onClick={() => { window.print() }}>{t("Print")}</Btn>
                    <Btn className="btn-sm btn-outline" onClick={() => { setOpen(false) }}>{t("Cancel")}</Btn>
                </div>
            }
            close={false}
        >
            <div className="ticket">
                <div className="title-text text-center">
                    <img
                        src="/assets/images/settings/logo-dark.png"
                        alt={settingObj?.general?.site_name || "Logo"}
                        style={{ maxHeight: 60, display: "inline-block" }}
                    />
                </div>
                <ul className="centered">
                    <li>{t("OrderNumber")}: {data.order_number}</li>
                    <li>{t("Date")}: {dateFormat(data.created_at)}</li>
                    {!data.is_digital_only &&
                        <li>{t("Address")}:
                            {data?.shipping_address?.street}
                            {data?.shipping_address?.city} {data?.shipping_address?.state?.name}
                            {data?.shipping_address?.country?.name}
                            {data?.shipping_address?.pincode}
                        </li>
                    }

                    <li>{t("Email")}: {data?.consumer?.email}</li>
                    <li>{t("Phone")}: {data?.shipping_address?.phone}</li>
                    <li>{t("Customer")}: {data?.consumer?.name}</li>
                </ul>
            </div>
            <ReceiptModalTable data={data} />
            <p className="text-point">{t("Thank You For Shopping")}.</p>
        </ShowModal>
    )
}

export default ReceiptModal;
