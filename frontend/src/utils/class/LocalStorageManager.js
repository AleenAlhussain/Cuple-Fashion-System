import { HashLocalStorage } from './HashLocalStorage.js';
import { LocalStorage } from './LocalStorage.js';


const isHashed = process.env.REACT_APP_IS_HASH === 'true';

export class LocalStorageManagerClass extends (isHashed
  ? HashLocalStorage
  : LocalStorage) {
  static removeItem(key) {
    localStorage.removeItem(key);
  }

  static clearItems() {
    localStorage.clear();
  }
}

export const LocalStorageManager = LocalStorageManagerClass;

