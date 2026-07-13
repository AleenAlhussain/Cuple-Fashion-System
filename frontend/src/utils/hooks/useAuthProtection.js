import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { ToastNotification } from '@/utils/customFunctions/ToastNotification';

const PROTECTED_ROUTES = [
  `/account/dashboard`,
  `/account/notification`,
  `/account/wallet`,
  `/account/bank-details`,
  `/account/point`,
  `/account/refund`,
  `/account/exchange`,
  `/account/order`,
  `/account/addresses`,
  `/wishlist`,
];

export const useAuthProtection = (pathName, setOpenAuthModal) => {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check cookies fresh on every path change (not memoized)
    const accountVerified = Cookies.get("uat");
    const authToast = Cookies.get("showAuthToast");

    if (!accountVerified && authToast && PROTECTED_ROUTES.includes(pathName)) {
      ToastNotification("error", "Unauthenticated");
      setOpenAuthModal(true);
    }

    // Clean up authToast cookie
    if (authToast) {
      Cookies.remove("showAuthToast");
    }

    setChecked(true);
  }, [pathName, setOpenAuthModal]);
};

