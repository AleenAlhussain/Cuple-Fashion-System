'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  GET: '/countries',
  STATES: '/states',
};

const KEY = 'countries';

export const CountryAPI = API.GET;
export const CountryStatesAPI = API.STATES;

export const useGetCountries = (params, options) =>
  useGetQuery(KEY, API.GET, params, options);
export const useGetStates = (params, options) =>
  useGetQuery([KEY, 'states'], API.STATES, params, options);

