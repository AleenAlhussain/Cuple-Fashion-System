import { Hash } from './Hash.js';

export class HashLocalStorage extends Hash {
  static getItem(key) {
    const hashedValue = localStorage.getItem(key);
    if (!hashedValue) return null;

    try {
      const unHashedValue = this.unHash(hashedValue);
      return JSON.parse(unHashedValue);
    } catch {
      return null;
    }
  }

  static setItem(key, value) {
    const stringifyValue = JSON.stringify(value);
    const hashedValue = this.hash(stringifyValue);
    localStorage.setItem(key, hashedValue);
  }
}

