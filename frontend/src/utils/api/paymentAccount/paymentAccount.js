'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/payment-accounts',
};

const KEY = 'paymentAccounts';

export const useGetPaymentAccounts = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

