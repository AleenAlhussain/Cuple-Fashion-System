import React, { forwardRef } from 'react'
import UserTransactionsTable from './UserTransactionsTable'

const WrappedVendor = forwardRef(({ values, url, setFieldValue, dateRange, userIdParams, moduleName, role }, ref) => {

  let paramObj = {
    vendor_id: values['vendor_id'] ?? null
  }
  
  return (
     <UserTransactionsTable url={url} moduleName={moduleName} setFieldValue={setFieldValue} dateRange={dateRange} paramsProps={role !== "vendor" ? paramObj : {}} userIdParams={userIdParams} ref={ref} />
  )
})

export default WrappedVendor