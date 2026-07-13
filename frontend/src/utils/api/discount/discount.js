'use client'
import { useMutation, useQuery } from '@tanstack/react-query';
import useAxios from '../helpers/useAxios';

const API = {
  CALCULATE: '/cart/calculate-discounts',
};

const KEY = 'discount';

/**
 * Hook to calculate discounts for cart items
 * Sends cart data to backend and receives calculated discounts
 */
export function useCalculateDiscount() {
  const axios = useAxios();

  return useMutation({
    mutationKey: [KEY, 'calculate'],
    mutationFn: async (cartData) => {
      const response = await axios.post(API.CALCULATE, cartData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    },
    onError: (error) => {
      console.error('Discount calculation error:', error?.response?.data?.message || error.message);
      return error;
    },
  });
}

/**
 * Hook to get discount calculation with automatic refetch
 * Use this when you want the discount to auto-update on cart changes
 */
export function useDiscountQuery(cartData, options = {}) {
  const axios = useAxios();

  return useQuery({
    queryKey: [KEY, 'calculate', JSON.stringify(cartData)],
    queryFn: async () => {
      if (!cartData?.items?.length) {
        return { success: true, data: { discounts: [], totals: { subtotal: 0, total_discount: 0, final_total: 0 } } };
      }
      const response = await axios.post(API.CALCULATE, cartData);
      return response.data;
    },
    enabled: !!cartData?.items?.length,
    staleTime: 30000, // 30 seconds before refetch
    gcTime: 60000, // 1 minute cache
    refetchOnWindowFocus: false,
    ...options,
  });
}

export default {
  useCalculateDiscount,
  useDiscountQuery,
};
