'use client'
import {
  useGetQuery,
  useUpdateMutation,
} from '../helpers/index';

const API = {
  GET: '/notifications',
  MARK_READ: '/notifications/mark-as-read',
};

const KEY = 'notifications';

export const useGetNotifications = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useMarkAsRead = () => useUpdateMutation(KEY, API.MARK_READ);

