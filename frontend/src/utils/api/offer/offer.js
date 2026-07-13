'use client'
import { useGetQuery } from '../helpers/index';

const API = {
  GET_ACTIVE: '/products/active-offers',
};

const KEY = 'activeOffers';

export const useGetActiveOffers = (params = {}, options = {}) =>
  useGetQuery(KEY, API.GET_ACTIVE, params, {
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    ...options,
  });
