'use client'
import {
  useAddMutation,
  useGetQuery,
  useGetQueryPagination,
} from '../helpers/index';

const API = {
  GET: '/orders',
  ADD: '/orders',
};

const KEY = 'orders';

export const useGetOrders = (params, options) =>
  useGetQueryPagination(KEY, API.GET, params, options);
export const useGetOrder = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useCreateOrder = () => useAddMutation(KEY, API.ADD);

