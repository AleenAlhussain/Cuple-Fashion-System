'use client';

import { useQuery } from '@tanstack/react-query';

const ADMIN_MENU_URL = '/api/menu';
const DEFAULT_LOCATION = 'primary';

const fetchAdminMenu = async (location = DEFAULT_LOCATION) => {
  const query = new URLSearchParams({ location });
  const response = await fetch(`${ADMIN_MENU_URL}?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to load admin menu');
  }

  const json = await response.json();
  return json?.data ?? null;
};

const useAdminMenus = (config = {}) => {
  const { location = DEFAULT_LOCATION, ...queryOptions } = config;

  return useQuery({
    queryKey: ['admin-menus', location],
    queryFn: () => fetchAdminMenu(location),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...queryOptions,
  });
};

export default useAdminMenus;
