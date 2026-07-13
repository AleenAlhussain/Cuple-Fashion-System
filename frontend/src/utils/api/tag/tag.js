'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/tags',
};

const KEY = 'tags';

export const useGetTags = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

