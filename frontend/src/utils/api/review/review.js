'use client'
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
  useUpdateMutation,
} from '../helpers/index';

const API = {
  GET: '/reviews',
  ADD: '/reviews',
  DELETE: '/reviews',
  UPDATE: '/reviews',
};

const KEY = 'reviews';

export const useGetReviews = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useAddReview = () => useAddMutation(KEY, API.ADD);
export const useUpdateReview = () => useUpdateMutation(KEY, API.UPDATE);
export const useDeleteReview = () => useDeleteMutation(KEY, API.DELETE);

