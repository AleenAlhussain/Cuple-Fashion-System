

export class LocalStorage {
  static getItem(key) {
    const value = localStorage.getItem(key);
    if (value === null) {
      return null; // Return null if the item doesn't exist
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      // console.error(
      //   `Error parsing value from localStorage for key "${key}":`,
      //   error,
      // );
      return value;
    }
  }

  static setItem(key, value) {
    const stringifyValue = JSON.stringify(value);
    localStorage.setItem(key, stringifyValue);
  }
}

