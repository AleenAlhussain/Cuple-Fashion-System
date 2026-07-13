'use client'
import { useGetQuery, useGetQueryPagination } from '../helpers/index';

const KEY = 'shop';

/**
 * Combined shop page endpoint - fetches products, categories, and filters in one request
 * Reduces 3+ API calls to 1 for better performance
 *
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.paginate - Items per page (default: 12)
 * @param {string} params.sortBy - Sort by: newest, price_asc, price_desc, best_seller
 * @param {string} params.category - Category slug or ID
 * @param {string} params.color - Color filter (comma-separated IDs)
 * @param {string} params.size - Size filter (comma-separated values)
 * @param {Object} options - React Query options
 *
 * @returns {Object} { products, categories, filters, meta }
 */
export const useGetShopPage = (params = {}, options = {}) => {
  // Build query key from params for proper cache invalidation
  const queryKey = [KEY, 'page', params];

  return useGetQuery(queryKey, '/shop', params, {
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useGetShopProducts = (params = {}, options = {}) =>
  useGetQueryPagination([KEY, 'products'], '/shop/products', params, options);

export const useGetShopFacets = (params = {}, options = {}) =>
  useGetQuery([KEY, 'facets'], '/shop/facets', params, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });

/**
 * Get shop page data for a specific category
 * Convenience wrapper around useGetShopPage
 */
export const useGetCategoryPage = (categorySlug, params = {}, options = {}) => {
  return useGetShopPage(
    { ...params, category: categorySlug },
    {
      enabled: !!categorySlug,
      ...options,
    }
  );
};
