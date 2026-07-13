'use client'
import { useQuery } from '@tanstack/react-query';
import useAxios from './useAxios';

function useGetQuery(
  KEY,
  url,
  params = {},
  options = {},
) {
  const axios = useAxios();

  const KEYS = typeof KEY === 'string' ? [KEY, params] : [...KEY, params];
  const {show ,...restParams} = params ;   
  const baseUrl = !!show ? url + show : url;
  
  return useQuery({
    queryKey: KEYS,
    queryFn: async () => {
      const response = await axios.get(baseUrl, { params:restParams });
      return response?.data ?? null;
    },
    ...options,
  });
}

export default useGetQuery;

