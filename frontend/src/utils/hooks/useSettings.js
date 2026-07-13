'use client'
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsMockData } from '@/utils/api/settings/settingsMockData';
import { normalizeMediaUrlsDeep } from '@/utils/mediaUrl';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.cuple.shop/api';

const fetchSettings = async () => {
  const res = await fetch(`${API_BASE}/settings`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  const json = await res.json();
  return normalizeMediaUrlsDeep(json?.data ?? null);
};

// Fallback: mock data shape (used while loading or on error)
const fallbackData = settingsMockData?.values ?? settingsMockData;

/**
 * Hook to get application settings from backend API.
 * Falls back to mock data while loading or on error.
 *
 * @returns {Object} - { settingData, isLoading, error }
 */
export const useSettings = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['app-settings'],
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000,   // 5 min before refetch
    gcTime: 30 * 60 * 1000,     // 30 min cache retention
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Deep-merge API data over fallback so missing keys still have defaults
  // Memoize to keep stable reference and prevent unnecessary re-renders
  const settingData = useMemo(() => {
    if (!data) return fallbackData;
    return {
      ...fallbackData,
      ...data,
      general: { ...fallbackData.general, ...data.general },
      activation: { ...fallbackData.activation, ...data.activation },
      delivery: { ...fallbackData.delivery, ...data.delivery },
      wallet_points: { ...fallbackData.wallet_points, ...data.wallet_points },
    };
  }, [data]);

  return {
    settingData,
    isLoading,
    error: error ?? null,
  };
};
