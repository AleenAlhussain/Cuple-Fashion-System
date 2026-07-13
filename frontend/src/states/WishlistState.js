'use client'
import { create } from 'zustand';

const useWishlistState = create((set, get) => ({
  // State
  wishlist: [],

  // Initialize wishlist from localStorage
  initWishlist: () => {
    if (typeof window === 'undefined') return;
    
    const savedWishlist = localStorage.getItem('wishlist');
    if (savedWishlist) {
      try {
        const items = JSON.parse(savedWishlist);
        set({ wishlist: items || [] });
      } catch (error) {
        console.error('Failed to load wishlist:', error);
      }
    }
  },

  // Save wishlist to localStorage
  saveWishlist: () => {
    const { wishlist } = get();
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  },

  // Add to wishlist
  addToWishlist: (product) => {
    const { wishlist } = get();
    const exists = wishlist.find(item => item.product_id === product.id);
    
    if (!exists) {
      const newWishlist = [...wishlist, {
        id: null,
        product_id: product.id,
        product: product
      }];
      set({ wishlist: newWishlist });
      get().saveWishlist();
      return true;
    }
    return false;
  },

  // Remove from wishlist
  removeFromWishlist: (productId) => {
    const { wishlist } = get();
    const newWishlist = wishlist.filter(item => item.product_id !== productId);
    set({ wishlist: newWishlist });
    get().saveWishlist();
  },

  // Check if product in wishlist
  isInWishlist: (productId) => {
    const { wishlist } = get();
    return wishlist.some(item => item.product_id === productId);
  },

  // Clear wishlist
  clearWishlist: () => {
    set({ wishlist: [] });
    localStorage.removeItem('wishlist');
  },

  // Get wishlist count
  getWishlistCount: () => {
    return get().wishlist.length;
  },
}));

export default useWishlistState;

