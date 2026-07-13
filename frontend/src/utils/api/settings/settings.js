'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/settings',
};

const KEY = 'settings';

export const useGetSettings = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

