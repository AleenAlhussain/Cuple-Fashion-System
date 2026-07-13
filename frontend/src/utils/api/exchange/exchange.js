'use client'
import {
  useAddMutation,
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/exchanges',
  ADD: '/exchanges',
};

const KEY = 'exchanges';

export const useGetExchanges = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useCreateExchange = () => useAddMutation(KEY, API.ADD);

