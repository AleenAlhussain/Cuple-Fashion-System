'use client'
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
  useUpdateFormMutation,
} from '../helpers/index';

const API = {
  GET: '/categories',
  GET_ONE: '/categories/',
  ADD: '/categories',
  DELETE: '/categories',
  UPDATE: '/categories',
};

const KEY = 'categories';

export const useGetCategories = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

export const useGetOneCategories = (params = {}, options = {}) => {
  const { id, ...restParams } = params || {};

  return useGetQuery([KEY, "one", id], API.GET_ONE + id, restParams, {
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });
};

export const useAddCategories = () => useAddMutation(KEY, API.ADD);
export const useUpdateCategories = () => useUpdateFormMutation(KEY, API.UPDATE);

export const useDeleteCategories = () => useDeleteMutation(KEY, API.DELETE);
