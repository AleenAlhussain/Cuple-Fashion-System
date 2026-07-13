import SettingContext from '@/helper/settingContext';
import Image from 'next/image';
import { useContext } from 'react';
import { CardBody } from 'reactstrap';
import { useTranslation } from "react-i18next";
import { placeHolderImage } from '@/data/CommonPath';

const SidebarCheckoutCard = ({ values }) => {

    const { t } = useTranslation('common');
    const { convertCurrency } = useContext(SettingContext)
    return (
        <CardBody>
            <div className="title-header">
                <h5 className="fw-bold">{t("Checkout")}</h5>
            </div>
            <div className="product-details">
                <>
                    <ul className="cart-listing">
                        {values['products']?.map((item, i) => (
                            (() => {
                              const variant = item?.variant ?? item?.variation;
                              const basePrice =
                                variant?.final_price ??
                                variant?.sale_price ??
                                variant?.price ??
                                item?.final_price ??
                                item?.sale_price ??
                                item?.price ??
                                item?.product?.sale_price ??
                                item?.product?.price ??
                                0;
                              const quantity = item?.quantity ?? 1;
                              const lineTotal = basePrice * quantity;
                              return (
                            <li key={i}>
                                <div className='checkout-product-list-box'>
                                    <Image src={variant && variant?.variation_image ? variant?.variation_image?.original_url
                                        : item?.product?.product_thumbnail ? item?.product?.product_thumbnail?.original_url
                                            : placeHolderImage} className="img-fluid" alt={item?.product?.name || ''} width={70} height={70} />
                                    <div className="cart-content">
                                        <h4>{variant ? variant?.name : item?.product?.name}</h4>
                                        <h5 className='text-theme'>
                                            {convertCurrency(basePrice)}
                                        </h5>
                                        <h5 className='price'>{convertCurrency(lineTotal)}</h5>
                                    </div>
                                </div>
                            </li>
                              );
                            })()
                        ))}
                    </ul>
                </>
            </div>
        </CardBody>
    )
}

export default SidebarCheckoutCard
