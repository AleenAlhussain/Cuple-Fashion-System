'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/stores',
};

const KEY = 'stores';

export const useGetStores = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

