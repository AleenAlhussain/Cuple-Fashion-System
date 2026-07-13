'use client'
import {
  useGetQuery,
  useUpdateFormMutation,
} from '../helpers/index';

const API = {
  GET: '/user/profile',
  UPDATE: '/user/profile',
  UPDATE_PASSWORD: '/user/password',
};

const KEY = 'profile';

export const useGetProfile = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useUpdateProfile = () => useUpdateFormMutation(KEY, API.UPDATE);
export const useUpdatePassword = () => useUpdateFormMutation(KEY, API.UPDATE_PASSWORD);

