'use client'
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
  useUpdateMutation,
} from '../helpers/index';

const API = {
  GET: '/cart',
  ADD: '/cart',
  DELETE: '/cart',
  UPDATE: '/cart',
};

const KEY = 'cart';

export const useGetCart = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useAddToCart = () => useAddMutation(KEY, API.ADD);
export const useUpdateCart = () => useUpdateMutation(KEY, API.UPDATE);
export const useDeleteFromCart = () => useDeleteMutation(KEY, API.DELETE);

