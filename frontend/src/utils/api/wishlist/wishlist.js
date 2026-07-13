'use client'
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/wishlist',
  ADD: '/wishlist',
  DELETE: '/wishlist',
};

const KEY = 'wishlist';

export const useGetWishlist = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useAddToWishlist = () => useAddMutation(KEY, API.ADD);
export const useDeleteFromWishlist = () => useDeleteMutation(KEY, API.DELETE);

