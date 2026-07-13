'use client'
import {
  useGetQuery,
  useAddMutation,
} from '../helpers/index';

const API = {
  GET: '/wallet',
  ADD: '/wallet/add',
};

const KEY = 'wallet';

export const useGetWallet = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useAddToWallet = () => useAddMutation(KEY, API.ADD);

