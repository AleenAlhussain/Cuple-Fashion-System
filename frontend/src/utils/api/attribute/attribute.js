'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/attributes',
};

const KEY = 'attributes';

export const useGetAttributes = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

