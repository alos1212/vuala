// src/stores/usePageStore.ts
import { create } from 'zustand';

type PageState = {
  page: string;
  countryId: string;
  setPage: (page: string) => void;
  setCountryId: (countryId: string) => void;
};

export const usePageStore = create<PageState>((set) => ({
  page: '',
  countryId: '1',
  setPage: (page) => set({ page }),
  setCountryId: (countryId) => set({ countryId }),
}));
