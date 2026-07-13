"use client";
import { useState } from "react";
import {QueryClientProvider,QueryClient, HydrationBoundary} from "@tanstack/react-query";
import AccountProvider from "@/helper/accountContext/AccountProvider";
import SettingProvider from "@/helper/settingContext/SettingProvider";
import BadgeProvider from "@/helper/badgeContext/BadgeProvider";
import CategoryProvider from "@/helper/categoryContext/CategoryProvider";
import CartProvider from "@/helper/cartContext/CartProvider";
import MenuProvider from "@/helper/menuContext/MenuProvider";

const TanstackWrapper = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={children.dehydratedState}>
        <AccountProvider>
          <SettingProvider>
            <BadgeProvider>
              <CategoryProvider>
                <CartProvider>
                  <MenuProvider>{children}</MenuProvider>
                </CartProvider>
              </CategoryProvider>
            </BadgeProvider>
          </SettingProvider>
        </AccountProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
};

export default TanstackWrapper;
