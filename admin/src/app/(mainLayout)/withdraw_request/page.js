'use client'
import VendorDetails from "@/components/withdrawRequest/VendorDetails"
import { checkPermission } from "@/components/common/CheckPermissionList";
import { useMemo } from "react";

const WithdrawRequest = () => {
    const hasWithdrawPermission = useMemo(() => checkPermission("withdraw_request.index"), []);

    if (!hasWithdrawPermission) {
        return (
            <div className="card">
                <div className="card-body">
                    <div className="p-4 text-center">
                        <div className="fw-semibold text-danger fs-4 mb-2">
                            Permission Required
                        </div>
                        <div className="text-muted small fs-6">
                            This section is available to administrators only.
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return <VendorDetails />
}

export default WithdrawRequest
