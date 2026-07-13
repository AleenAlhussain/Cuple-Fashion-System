'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/order-statuses',
};

const KEY = 'orderStatuses';

export const useGetOrderStatuses = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

