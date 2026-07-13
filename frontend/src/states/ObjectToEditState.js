import { create } from 'zustand';

export const useObjectToEdit = create((set) => ({
  objectToEdit: {},
  setObjectToEdit: (data) => set({ objectToEdit: data }),
}));

