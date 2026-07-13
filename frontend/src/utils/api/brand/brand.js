'use client'
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
  useUpdateFormMutation,
} from '../helpers/index';

const API = {
  GET: '/brands',
  ADD: '/brands',
  DELETE: '/brands',
  UPDATE: '/brands',
};

const KEY = 'brands';

export const useGetBrands = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useAddBrand = () => useAddMutation(KEY, API.ADD);
export const useUpdateBrand = () => useUpdateFormMutation(KEY, API.UPDATE);
export const useDeleteBrand = () => useDeleteMutation(KEY, API.DELETE);

