'use client'
import Cookies from 'js-cookie';
import { create } from 'zustand';
import { LocalStorageEnum } from '@/utils/constants';

// Helper to safely get localStorage (for SSR)
const getStorageItem = (key) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

// Helper to safely set localStorage (for SSR)
const setStorageItem = (key, value) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

// Helper to safely remove localStorage (for SSR)
const removeStorageItem = (key) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

const getCookieItem = (key) => {
  if (typeof window === 'undefined') return null;
  return Cookies.get(key) || null;
};

const clearAuthStorage = () => {
  removeStorageItem(LocalStorageEnum.TOKEN_KEY);
  removeStorageItem(LocalStorageEnum.USER_KEY);
  removeStorageItem('account');

  if (typeof window !== 'undefined') {
    Cookies.remove('uat', { path: '/' });
    Cookies.remove('ue');
    Cookies.remove('account');
    Cookies.remove('showAuthToast');
    Cookies.remove('CallBackUrl');
    Cookies.remove('up');
    Cookies.remove('uc');
    Cookies.remove('upts');
  }
};

const emptyAuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
  accountData: null,
  role: null,
};

const useAuthState = create((set, get) => {
  // Initialize from localStorage
  const initFromStorage = () => {
    let token = getStorageItem(LocalStorageEnum.TOKEN_KEY) || getCookieItem(LocalStorageEnum.TOKEN_KEY);
    let user = null;
    let accountData = null;

    const userStr = getStorageItem(LocalStorageEnum.USER_KEY);
    if (userStr) {
      try {
        user = JSON.parse(userStr);
        accountData = user;
      } catch {
        user = null;
      }
    }

    const accountStr = getStorageItem('account') || getCookieItem('account');
    if (accountStr) {
      try {
        const parsed = JSON.parse(accountStr);
        user = user || parsed?.user || parsed;
        accountData = parsed?.user || parsed;
      } catch {
        // ignore
      }
    }

    return { token, user, accountData };
  };

  const initial = initFromStorage();

  return {
    token: initial.token,
    user: initial.user,
    accountData: initial.accountData,
    role: initial.user?.role,
    isAuthenticated: !!initial.token,

    // Initialize auth state from storage (call on app mount)
    initAuth: () => {
      const { token, user, accountData } = initFromStorage();
      set({
        token,
        user,
        accountData,
        role: user?.role,
        isAuthenticated: !!token,
      });
    },

    login: async (data) => {
      // Store token as plain string
      setStorageItem(LocalStorageEnum.TOKEN_KEY, data.token);
      // Store user as JSON string
      const userData = {...data.user, role: data.role};
      setStorageItem(LocalStorageEnum.USER_KEY, JSON.stringify(userData));

      set(() => ({
        isAuthenticated: true,
        token: data.token,
        user: userData,
        accountData: userData,
        role: data?.user?.role || data?.role,
      }));
    },

    // Set account data (for profile updates)
    setAccountData: (data) => {
      if (data) {
        setStorageItem(LocalStorageEnum.USER_KEY, JSON.stringify(data));
      } else {
        removeStorageItem(LocalStorageEnum.USER_KEY);
      }

      set({ accountData: data || null, user: data || null });
    },

    // Refetch account data from API
    refetch: async () => {
      const token = get().token;
      if (!token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_WEBSITE_API_URL || 'https://api.cuple.shop/api/website'}/self`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          // API returns { success, data: { user, address } }
          const userData = result.data?.user || result.data || result;
          const addressList = result.data?.address || result.data?.addresses || [];
          const fullData = {
            ...userData,
            address: addressList,
            addresses: addressList,
          };
          setStorageItem(LocalStorageEnum.USER_KEY, JSON.stringify(fullData));
          set({ accountData: fullData, user: fullData });
        }
      } catch (error) {
        console.error('Failed to fetch account data:', error);
      }
    },

    logout: async () => {
      clearAuthStorage();
      set(() => emptyAuthState);
    },
  };
});

export default useAuthState;
