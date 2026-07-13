import React, { useEffect } from 'react'
import { Card } from 'reactstrap'
import SidebarCheckoutCard from './SidebarCheckoutCard'

const CheckoutSidebar = ({ addToCartData, values, setFieldValue, loading, mutate, userData, setStoreCoupon }) => {
    // Checking point and wallet for particular user
    useEffect(() => {
        userData?.filter((elem) => {
            if (elem.id == values['consumer_id']) {
                if (elem?.point) {
                    setFieldValue('isPoint', elem?.point)
                } else {
                    setFieldValue('isPoint', '')
                }
                if (elem?.wallet) {
                    setFieldValue('isWallet', elem?.wallet)
                } else {
                    setFieldValue('isWallet', '')
                }
            }
        })
    }, [values['consumer_id']])

    // Submitting data on Checkout
    useEffect(() => {
        if (values['billing_address_id'] && values['shipping_address_id'] && values['delivery_description'] && values['payment_method']) {
            values["variation_id"] = ""
            if (loading) { setStoreCoupon(''),setFieldValue('coupon','') }
            // Put your logic here
        }
        if (addToCartData?.is_digital_only && values['billing_address_id'] && values['payment_method']) {
            // mutate(values)
            // Put your logic here
        }
    }, [values['billing_address_id'], values['shipping_address_id'], values['payment_method'], values['delivery_description'], values['points_amount'], values['wallet_balance']])
    return (
        <Card className="pos-detail-card">
            <SidebarCheckoutCard values={values} setFieldValue={setFieldValue} />
        </Card>
    )
}

export default CheckoutSidebar