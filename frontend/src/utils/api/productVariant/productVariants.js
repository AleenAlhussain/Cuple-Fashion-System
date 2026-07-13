'use client'
import {
  useGetQuery,
  useGetQueryPagination,
} from '../helpers/index';

const API = {
  GET: '/product-variants',
  GET_ONE: '/product-variants',
  GET_COLORS: '/product-variants/colors',
};

const KEY = 'productVariants';

export const useGetProductVariants = (params, options) =>
  useGetQueryPagination(KEY, API.GET, params, options);
export const useGetOneProductVariant = (params, options) =>
  useGetQuery(KEY, API.GET_ONE, params, options);
export const useGetProductVariantColors = (params, options) =>
  useGetQuery(KEY, API.GET_COLORS, params, options);
