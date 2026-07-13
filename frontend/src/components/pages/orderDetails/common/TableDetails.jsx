import Avatar from '@/components/widgets/Avatar';
import { placeHolderImage } from '@/components/widgets/Placeholder';
import { useSettings } from '@/utils/hooks/useSettings';
import { useTranslation } from "react-i18next";
import { Card, CardBody, Table } from 'reactstrap';

const TableDetails = ({ data }) => {
  const { t } = useTranslation('common');
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  return (
    <>
      <Card className='border-0 dashboard-table'>
        <CardBody className='p-0'>
          <div className="wallet-table">
            <div className='tracking-wrapper table-responsive'>
              <Table className='product-table order-table'>
                <thead>
                  <tr>
                    <th scope='col'>{t('Image')}</th>
                    <th scope='col'>{t('FullName')}</th>
                    <th scope='col'>{t('Price')}</th>
                    <th scope='col'>{t('Quantity')}</th>
                    <th scope='col'>{t('Subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.products?.length > 0
                    ? data?.products?.map((product, i) => (
                      <tr key={i}>
                        <td className='product-image'>
                          <Avatar
                            data={
                              product?.pivot?.variation && product?.pivot?.variation?.variation_image
                                ? product?.pivot?.variation?.variation_image
                                : product?.product_thumbnail
                                  ? product?.product_thumbnail
                                  : placeHolderImage
                            }
                            name={product?.pivot?.variation ? product?.pivot?.variation?.name : product?.name}
                            customImageClass='img-fluid'
                          />
                        </td>
                        <td>
                          <h6>{product?.pivot?.variation ? product?.pivot?.variation?.name : product?.name}</h6>
                        </td>
                        <td>
                          <h6>{convertCurrency(product?.pivot?.single_price)}</h6>
                        </td>
                        <td>
                          <h6>{product?.pivot?.quantity}</h6>
                        </td>
                        <td>
                          <h6>{convertCurrency(product?.pivot?.subtotal)}</h6>
                        </td>
                      </tr>
                    ))
                    : null}
                </tbody>
              </Table>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default TableDetails;
