'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/menus',
};

const KEY = 'menus';

export const useGetMenus = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

