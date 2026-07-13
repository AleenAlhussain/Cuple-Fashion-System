'use client'
import {
  useGetQuery,
} from '../helpers/index';

const API = {
  FASHION_ONE: '/home/fashion-one',
  FASHION_TWO: '/home/fashion-two',
  FASHION_THREE: '/home/fashion-three',
  FASHION_FOUR: '/home/fashion-four',
  FASHION_FIVE: '/home/fashion-five',
  FASHION_SIX: '/home/fashion-six',
  FASHION_SEVEN: '/home/fashion-seven',
  VIDEO: '/home/video',
  VIDEO_SLIDER: '/home/video-slider',
  SINGLE_PRODUCT: '/home/single-product',
  DIGITAL_DOWNLOAD: '/home/digital-download',
};

const KEY = 'home';

// Combined homepage endpoint - fetches all homepage data in one request
export const useGetHomepage = (params, options) =>
  useGetQuery([KEY, 'homepage'], '/homepage', params, {
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });

export const useGetHomeFashionOne = (params, options) =>
  useGetQuery([KEY, 'fashion_one'], API.FASHION_ONE, params, options);
export const useGetHomeFashionTwo = (params, options) =>
  useGetQuery([KEY, 'fashion_two'], API.FASHION_TWO, params, options);
export const useGetHomeFashionThree = (params, options) =>
  useGetQuery([KEY, 'fashion_three'], API.FASHION_THREE, params, options);
export const useGetHomeFashionFour = (params, options) =>
  useGetQuery([KEY, 'fashion_four'], API.FASHION_FOUR, params, options);
export const useGetHomeFashionFive = (params, options) =>
  useGetQuery([KEY, 'fashion_five'], API.FASHION_FIVE, params, options);
export const useGetHomeFashionSix = (params, options) =>
  useGetQuery([KEY, 'fashion_six'], API.FASHION_SIX, params, options);
export const useGetHomeFashionSeven = (params, options) =>
  useGetQuery([KEY, 'fashion_seven'], API.FASHION_SEVEN, params, options);
export const useGetHomeVideo = (params, options) =>
  useGetQuery([KEY, 'video'], API.VIDEO, params, options);
export const useGetHomeVideoSlider = (params, options) =>
  useGetQuery([KEY, 'video_slider'], API.VIDEO_SLIDER, params, options);
export const useGetHomeSingleProduct = (params, options) =>
  useGetQuery([KEY, 'single_product'], API.SINGLE_PRODUCT, params, options);
export const useGetHomeDigitalDownload = (params, options) =>
  useGetQuery([KEY, 'digital_download'], API.DIGITAL_DOWNLOAD, params, options);

