'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/themes',
};

const KEY = 'themes';

export const useGetThemes = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

