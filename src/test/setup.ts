import '@testing-library/jest-dom';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(key => delete store[key]); },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_STORAGE_MODE: 'local',
    VITE_API_URL: '',
    VITE_API_KEY: '',
    DEV: true,
    MODE: 'test',
  },
  writable: true,
});
