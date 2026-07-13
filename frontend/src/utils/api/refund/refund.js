'use client'
import {
  useAddMutation,
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/refunds',
  ADD: '/refunds',
};

const KEY = 'refunds';

export const useGetRefunds = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useCreateRefund = () => useAddMutation(KEY, API.ADD);

