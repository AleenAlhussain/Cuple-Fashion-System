// HashManager.js

export class Hash {
  static getOffset(num) {
    return num !== undefined
      ? num
      : Number(import.meta.env.REACT_APP_HASH_NUMBER) || 4;
  }

  static hash(str, num) {
    const offset = this.getOffset(num);
    return str
      .split('')
      .map((char) => {
        const charCode = char.charCodeAt(0) + offset;
        return String.fromCharCode(charCode);
      })
      .join('');
  }
  static unHash(str, num) {
    const offset = this.getOffset(num);
    return str
      .split('')
      .map((char) => {
        const charCode = char.charCodeAt(0) - offset;
        return String.fromCharCode(charCode);
      })
      .join('');
  }
}

