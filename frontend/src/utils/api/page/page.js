'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/pages',
};

const KEY = 'pages';

export const useGetPages = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

