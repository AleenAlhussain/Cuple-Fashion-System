import React, { useContext } from 'react'
import { Table } from 'reactstrap'
import Avatar from '@/components/commonComponent/Avatar';
import SettingContext from '@/helper/settingContext';
import { useTranslation } from "react-i18next";
import { placeHolderImage } from '@/data/CommonPath';

const NumberTable = ({ data }) => {
    
    const { t } = useTranslation( 'common');
    const { convertCurrency } = useContext(SettingContext)
    return (
        <div className="tracking-wrapper table-responsive">
            <Table className="product-table">
                <thead>
                    <tr>
                        <th scope="col">{t("Item") || "Item"}</th>
                        <th scope="col">{t("Price")}</th>
                        <th scope="col">{t("Qty") || "Qty"}</th>
                        <th scope="col">{t("Total") || "Total"}</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.products?.map((elem, index) => {
                        const itemSubtotal = elem?.pivot?.subtotal ?? 0;
                        const orderSubtotal = data?.subtotal ?? data?.amount ?? 0;
                        const orderDiscount = data?.coupon_total_discount ?? data?.discount_amount ?? 0;
                        const itemDiscount =
                            orderDiscount > 0 && orderSubtotal > 0
                                ? (itemSubtotal / orderSubtotal) * orderDiscount
                                : 0;
                        const colorValue =
                            elem?.color ??
                            elem?.options?.color ??
                            elem?.options?.Color ??
                            elem?.options?.colour ??
                            elem?.options?.Colour ??
                            "-";
                        const sizeValue =
                            elem?.size ??
                            elem?.options?.size ??
                            elem?.options?.Size ??
                            "-";

                        return (
                            <tr key={index}>
                                <td>
                                    <div className="d-flex gap-2 align-items-start">
                                        <div className="product-image">
                                            <Avatar customClass={'img-fluid'} data={elem?.product_thumbnail} placeHolder={placeHolderImage} name={elem?.name} />
                                        </div>
                                        <div>
                                            <h6 className="mb-1">
                                                {elem?.pivot?.variation ? elem?.pivot?.variation?.name : elem?.name}
                                            </h6>
                                            <div className="small text-muted">SKU: {elem?.pivot?.variation?.sku || elem?.sku || "-"}</div>
                                            <div className="small text-muted">Variation ID: {elem?.pivot?.variation?.id || "-"}</div>
                                            <div className="small text-muted">color: {colorValue}</div>
                                            <div className="small text-muted">size: {sizeValue}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <h6>{convertCurrency(elem?.pivot?.single_price)}</h6>
                                </td>
                                <td>
                                    <h6>x {elem?.pivot?.quantity}</h6>
                                </td>
                                <td>
                                    <h6>{convertCurrency(itemSubtotal)}</h6>
                                    {itemDiscount > 0 ? (
                                        <div className="small text-muted">
                                            {convertCurrency(itemDiscount)} discount
                                        </div>
                                    ) : null}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    )
}

export default NumberTable
