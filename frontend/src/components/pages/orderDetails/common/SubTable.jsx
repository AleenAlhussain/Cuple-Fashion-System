import { useSettings } from "@/utils/hooks/useSettings";
import { dateFormat } from "@/utils/customFunctions/DateFormat";
import Link from "next/link";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { RiEyeLine } from "react-icons/ri";
import { Card, CardBody } from "reactstrap";


const SubTable = ({ data }) => {
  const { t } = useTranslation( 'common');
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  return (
    <Card>
      <CardBody>
        <div className="tracking-wrapper table-responsive">
          <table className="table product-table">
            <thead>
              <tr>
                <th scope="col">{t('Order Number')}</th>
                <th scope="col">{t('OrderDate')}</th>
                <th scope="col">{t('Total Amount')}</th>
                <th scope="col">{t('Status')}</th>
                <th scope="col">{t('Action')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((subOrder, i) => (
                <tr key={i}>
                  <td>
                    <h6>#{subOrder?.order_number}</h6>
                  </td>
                  <td>{dateFormat(subOrder?.created_at)}</td>
                  <td>{convertCurrency(subOrder?.amount)} </td>
                  <td>
                    <div className={`status-${subOrder.order_status.slug}`}>
                      <span>{subOrder.order_status.name}</span>
                    </div>
                  </td>
                  <td>
                    <Link href={`/account/order/details/${subOrder.order_number}`}>
                      <RiEyeLine />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
};

export default SubTable;
