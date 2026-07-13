'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/faqs',
};

const KEY = 'faqs';

export const useGetFaqs = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);

