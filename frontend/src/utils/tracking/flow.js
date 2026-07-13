export const DETECTION_LABELS = {
  awb: {
    en: 'Detected as AWB',
    ar: 'تم الكشف عن رقم تتبع',
  },
  order: {
    en: 'Detected as order number',
    ar: 'تم الكشف عن رقم الطلب',
  },
  mobile: {
    en: 'Detected as UAE mobile',
    ar: 'تم الكشف عن رقم جوال إماراتي',
  },
  unknown: {
    en: 'Format not recognized',
    ar: 'النمط غير معروف',
  },
};

const isUaeMobileCandidate = (raw, digits) => {
  if (digits.length < 9) {
    return false;
  }
  const tail = digits.slice(-9);
  if (!/^5[0-9]{8}$/.test(tail)) {
    return false;
  }
  const normalized = raw.replace(/\s+/g, '');
  if (normalized.startsWith('05')) return true;
  if (normalized.startsWith('+9715')) return true;
  if (normalized.startsWith('9715')) return true;
  if (normalized.startsWith('009715')) return true;
  return digits.length === 9;
};

export const detectInputType = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length >= 10 && !isUaeMobileCandidate(trimmed, digits)) {
    return 'awb';
  }
  if (isUaeMobileCandidate(trimmed, digits)) {
    return 'mobile';
  }
  const orderCandidate = trimmed.replace(/[\s#]/g, '');
  if (/^[0-9]{4,9}$/.test(orderCandidate)) {
    return 'order';
  }
  return 'unknown';
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};
