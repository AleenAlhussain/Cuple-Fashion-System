'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/points',
};

const KEY = 'points';

export const useGetPoints = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

