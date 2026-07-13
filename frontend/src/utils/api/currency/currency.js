'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/currencies',
};

const KEY = 'currencies';

export const useGetCurrencies = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

