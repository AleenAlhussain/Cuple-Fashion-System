'use client'
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
  useUpdateFormMutation,
} from '../helpers/index';

const API = {
  GET: '/blogs',
  ADD: '/blogs',
  DELETE: '/blogs',
  UPDATE: '/blogs',
};

const KEY = 'blogs';

export const useGetBlogs = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useAddBlog = () => useAddMutation(KEY, API.ADD);
export const useUpdateBlog = () => useUpdateFormMutation(KEY, API.UPDATE);
export const useDeleteBlog = () => useDeleteMutation(KEY, API.DELETE);

