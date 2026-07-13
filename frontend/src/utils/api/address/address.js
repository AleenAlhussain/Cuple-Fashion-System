'use client'
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
  useUpdateMutation,
} from '../helpers/index';

const API = {
  GET: '/address',
  ADD: '/address',
  DELETE: '/address',
  UPDATE: '/address',
};

const KEY = 'address';

export const AddressAPI = '/address';
export const AddToCartAPI = '/cart';

export const useGetAddresses = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useAddAddress = () => useAddMutation(KEY, API.ADD);
export const useUpdateAddress = () => useUpdateMutation(KEY, API.UPDATE);
export const useDeleteAddress = () => useDeleteMutation(KEY, API.DELETE);
