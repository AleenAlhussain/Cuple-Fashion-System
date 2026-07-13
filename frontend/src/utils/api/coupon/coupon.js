'use client'
import {
  useAddMutation,
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/coupons',
  ADD: '/coupons/apply',
};

const KEY = 'coupons';

export const useGetCoupons = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useApplyCoupon = () => useAddMutation(KEY, API.ADD);

