'use client'
import { useQuery } from '@tanstack/react-query';
// import { useSearchParams } from 'react-router-dom';

import useAxios from './useAxios';
import { QueryPaginationEnum } from '@/enums/TankStackQueryEnum';

function useGetQueryPagination(
  KEY,
  url,
  params = {},
  options = {},
) {
  const axios = useAxios();

  // const [searchParams] = useSearchParams();

  const paginationEnabled = params.pagination !== false;

  const getNumberOrFallback = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const page = paginationEnabled
    ? getNumberOrFallback(
        searchParams.get('page') ?? params.page,
        QueryPaginationEnum.DEFAULT_PAGE,
      )
    : undefined;

  const per_page = paginationEnabled
    ? getNumberOrFallback(
        searchParams.get('per_page') ?? params.per_page,
        QueryPaginationEnum.DEFAULT_PER_PAGE,
      )
    : undefined;

  const { pagination, ...restParams } = params;

  const requestParams = {
    ...restParams,
    ...(paginationEnabled && { page, per_page }),
  };

  const KEYS = typeof KEY === 'string' ? [KEY, requestParams] : [...KEY, requestParams];

  return useQuery({
    queryKey: KEYS, // Use the stable query key array
    queryFn: async () => {
      const response = await axios.get(url, {
        params: requestParams,
      });
      return (
        response?.data ?? {
          data: [],
          meta: {
            page: paginationEnabled ? page : QueryPaginationEnum.DEFAULT_PAGE,
            per_page: paginationEnabled
              ? per_page
              : QueryPaginationEnum.DEFAULT_PER_PAGE,
            total: 0,
            pages: 1,
          },
        }
      );
    },
    // Ensure refetch happens even when navigating back to a previously visited page
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    staleTime: 0,
    ...options,
  });
}

export default useGetQueryPagination;

