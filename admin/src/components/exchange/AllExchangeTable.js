import { ExchangeAPI } from '../../utils/axiosUtils/API';
import TableWrapper from '../../utils/hoc/TableWrapper';
import ShowTable from '../table/ShowTable';
import { useTranslation } from "react-i18next";

const AllExchangeTable = ({ data, ...props }) => {
    
    const { t } = useTranslation('common');
    const normalizedData = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    const headerObj = {
        checkBox: false, isOption: true, noEdit: true, isSerial: true, isSerialNo: false,

        optionHead: { title: "Action", type: 'View', url: ExchangeAPI, message: "Exchange Status Updated Successfully", showModalData: data, modalTitle: t("Exchange"), permissionKey: "exchange" },
        column: [
            { title: "OrderNumber", apiKey: "order_id" },
            { title: "ConsumerName", apiKey: "consumer_name", sorting: true, sortBy: "desc" },
            { title: "Reason", apiKey: "reason" },
            { title: "Status", apiKey: "exchange_status" },
            { title: "CreateAt", apiKey: "created_at", sorting: true, sortBy: "desc", type: "date" },
        ],
        data: normalizedData
    };
    let exchanges = headerObj?.data?.filter((element) => {
        element.consumer_name = element?.user?.name
        element.order_id = <span className="fw-bolder">#{element?.order?.order_number}</span>
        element.exchange_status = element.status ? <div className={`status-${element.status}`}><span>{element.status.replace(/_/g, " ")}</span></div> : '-';
        return element;
    });
    headerObj.data = headerObj ? exchanges : [];
    return <>
        <ShowTable {...props} headerData={headerObj} />
    </>
}

export default TableWrapper(AllExchangeTable)
