import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const DiscountBar = ({ productId }) => {
  const [discountBars, setDiscountBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    fetchDiscountBars();
  }, [productId]);

  const fetchDiscountBars = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_WEBSITE_API_URL || process.env.API_URL || 'https://api.cuple.shop/api/website';
      const response = await axios.get(`${apiUrl}/product/${productId}/discount-bars`);
      if (response.data.success) {
        setDiscountBars(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch discount bars:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || discountBars.length === 0) return null;

  const locale = i18n.language || 'en';
  const isRTL = locale === 'ar';

  return (
    <div className="discount-bars" style={{ marginTop: '15px', marginBottom: '15px' }}>
      {discountBars.map((bar, index) => (
        <DiscountBarItem key={index} bar={bar} locale={locale} isRTL={isRTL} />
      ))}
    </div>
  );
};

const DiscountBarItem = ({ bar, locale, isRTL }) => {
  const title = locale === 'ar' ? (bar.title_ar || bar.title) : bar.title;
  const content = locale === 'ar' ? (bar.content_ar || bar.content) : bar.content;
  const bgColor = bar.background_color || '#ef0101';
  const textColor = bar.text_color || '#ffffff';
  const fallbackText = [title, content].filter(Boolean).join(title && content ? ': ' : '');
  const htmlContent = (content || fallbackText || '').replace(/\n/g, '<br />');

  return (
    <div
      className="discount-bar"
      style={{
        marginBottom: '10px',
        direction: isRTL ? 'rtl' : 'ltr',
        fontFamily: 'inherit',
        fontSize: '14px',
        lineHeight: '1.6',
        padding: '10px 15px',
        borderRadius: '6px',
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <span
        dangerouslySetInnerHTML={{
          __html: htmlContent,
        }}
      />
    </div>
  );
};

export default DiscountBar;
