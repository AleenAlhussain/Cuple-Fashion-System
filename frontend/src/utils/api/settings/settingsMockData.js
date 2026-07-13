export const settingsMockData = {
  values: {
    general: {
      mode: "light-only",
      site_url: "https://multikart-frontend-next-json.vercel.app/",
      copyright: "Copyright © 2026 Cuple.ae, All rights reserved.",
      site_name: "Cuple UAE",
      site_title: "Cuple UAE: Shoes & Accessories",
      site_tagline: "Shop women's shoes & accessories in the UAE",
      default_timezone: "Asia/Dubai",
      favicon_image_id: 10,
      min_order_amount: 0,
      dark_logo_image_id: 3948,
      product_sku_prefix: "FS",
      tiny_logo_image_id: 1302,
      default_currency_id: 1,
      light_logo_image_id: 3950,
      min_order_free_shipping: 50,
      cod_fee: 0,
      admin_site_language_direction: "ltr",
      light_logo_image: {
        id: 3950,
        name: "f6",
        file_name: "f6.png",
        mime_type: "image/png",
        disk: "public",
        created_by_id: "1",
        created_at: "2024-06-25T11:42:51.000000Z",
        asset_url: "/storage/3950/f6.png",
        original_url: "/assets/images/settings/logo-white.png"
      },
      dark_logo_image: {
        id: 3948,
        name: "12",
        file_name: "12.png",
        mime_type: "image/png",
        disk: "public",
        created_by_id: "1",
        created_at: "2024-06-25T11:40:46.000000Z",
        asset_url: "/storage/3948/12.png",
        original_url: "/assets/images/settings/logo-dark.png"
      },
      favicon_image: {
        id: 10,
        name: "favicon",
        file_name: "favicon.png",
        mime_type: "image/png",
        disk: "public",
        created_by_id: "1",
        created_at: "2024-05-02T08:54:01.000000Z",
        asset_url: "/storage/10/favicon.png",
        original_url: "/assets/images/settings/favicon.png"
      },
      tiny_logo_image: {
        id: 1302,
        name: "Frame 44",
        file_name: "Frame-44.png",
        mime_type: "image/png",
        disk: "public",
        created_by_id: "1",
        created_at: "2024-05-15T12:33:58.000000Z",
        asset_url: "/storage/1302/Frame-44.png",
        original_url: "/assets/images/settings/tiny-logo.png"
      },
      default_currency: {
        id: 1,
        code: "AE",
        symbol: "AED",
        no_of_decimal: 2,
        exchange_rate: 1,
        symbol_position: "before_price",
        thousands_separator: "comma",
        decimal_separator: "comma",
        system_reserve: 0,
        status: 1,
        created_by_id: null,
        created_at: "2024-05-02T08:34:46.000000Z",
        updated_at: "2024-05-02T08:34:46.000000Z",
        deleted_at: null
      }
    },
    delivery: {
      default: {
        title: "Standard Delivery",
        description: "Approx 5 to 7 Days"
      },
      same_day: {
        title: "Express Delivery",
        description: "Schedule"
      },
      default_delivery: 1,
      same_day_delivery: true,
      same_day_intervals: [
        {
          title: "Morning",
          description: "8.00 AM - 12.00 AM"
        },
        {
          title: "Noon",
          description: "12.00 PM - 2.00 PM"
        },
        {
          title: "Afternoon",
          description: "02.00 PM - 05.00 PM"
        },
        {
          title: "Evening",
          description: "05.00 PM - 08.00 PM"
        }
      ]
    },
    analytics: {
      facebook_pixel: [],
      google_analytics: []
    },
    activation: {
      multivendor: true,
      track_order: true,
      login_number: true,
      point_enable: true,
      coupon_enable: true,
      wallet_enable: true,
      guest_checkout: true,
      stock_product_hide: false,
      store_auto_approve: true,
      product_auto_approve: true
    },
    maintenance: {
      title: "We'll be back Soon..",
      end_date: "2024-7-31",
      start_date: null,
      description: "We are busy to updating our store for you.",
      maintenance_mode: false,
      maintenance_image_id: 3863,
      maintenance_image: {
        id: 3863,
        name: "maintenance",
        file_name: "maintenance.png",
        mime_type: "image/png",
        disk: "public",
        created_by_id: "1",
        created_at: "2024-06-21T12:10:25.000000Z",
        asset_url: "/storage/3863/maintenance.png",
        original_url: "/assets/images/placeholder/maintenance.png"
      }
    },
    wallet_points: {
      signup_points: 100,
      min_per_order_amount: 100,
      point_currency_ratio: 30,
      reward_per_order_amount: 10
    },
    google_reCaptcha: {
      secret: "ENTER_YOUR_SECRET_KEY",
      status: false,
      site_key: "ENTER_YOUR_SITE_KEY"
    },
    payment_methods: [
      {
        name: "cod",
        title: "Cash On Delivery",
        status: true
      },
      {
        name: "stripe_card",
        title: "Credit/Debit Cards",
        status: true,
        mode: "live",
        test_publishable_key: "",
        test_secret_key: "",
        live_publishable_key: "",
        live_secret_key: ""
      },
      {
        name: "apple_pay",
        title: "Apple Pay",
        status: true
      },
      {
        name: "google_pay",
        title: "Google Pay",
        status: true
      },
      {
        name: "tabby",
        title: "Pay later with Tabby",
        status: true
      }
    ],
    sms_methods: [
      {
        name: "twilio",
        title: "Twilio",
        status: true
      }
    ]
  }
};
