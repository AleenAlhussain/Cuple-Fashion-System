'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/downloads',
};

const KEY = 'downloads';

export const useGetDownloads = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

