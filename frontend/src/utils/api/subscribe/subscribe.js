'use client'
import {
  useAddMutation,
} from '../helpers/index';

const API = {
  ADD: '/subscribe',
};

const KEY = 'subscribe';

export const useSubscribe = () => useAddMutation(KEY, API.ADD, "Subscribed Successfully");

