<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Order Confirmation</title>
</head>

<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial, Helvetica, sans-serif;color:#333;">
  
  <!-- Preheader -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your order {{ $order->order_number }} has been confirmed.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.08);">

          <!-- ================= HEADER ================= -->
          <tr>
            <td style="background:#c9a86c;padding:26px 24px;text-align:center;">

              <!-- Logo -->
              @php
                $emailLogoPath = public_path('assets/images/settings/logo-dark.png');
                if (!file_exists($emailLogoPath)) {
                  $emailLogoPath = public_path('assets/images/logo.png');
                }

                $emailLogoSrc = file_exists($emailLogoPath)
                  ? $message->embed($emailLogoPath)
                  : asset('assets/images/logo.png');
              @endphp
              <img
                src="{{ $emailLogoSrc }}"
                alt="CUPLE"
                width="140"
                style="display:block;margin:0 auto 10px auto;max-width:140px;height:auto;border:0;"
              >

              <div style="font-size:26px;font-weight:800;letter-spacing:1px;color:#fff;">
                CUPLE
              </div>
              <div style="font-size:14px;color:#fff;opacity:.95;">
                كابلي
              </div>

            </td>
          </tr>

          <!-- ================= CONTENT ================= -->
          <tr>
            <td style="padding:28px 24px;">

              <h2 style="margin:0 0 12px 0;font-size:22px;color:#222;">
                Thank You for Your Order!
              </h2>

              <p style="font-size:15px;line-height:24px;color:#666;">
                Dear <strong style="color:#333;">{{ $order->shipping_full_name }}</strong>,<br>
                Thank you for your purchase! Your order has been successfully placed.
                Please find your invoice attached to this email.
              </p>

              <div style="height:1px;background:#eee;margin:20px 0;"></div>

              <!-- Order Summary -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fafafa;border:1px solid #eee;border-radius:12px;">
                <tr>
                  <td style="padding:18px;">

                    <h3 style="margin:0 0 12px 0;font-size:16px;color:#c9a86c;">
                      Order Summary
                    </h3>

                    <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;">
                      <tr>
                        <td style="color:#777;">Order Number</td>
                        <td align="right" style="font-weight:700;">{{ $order->order_number }}</td>
                      </tr>
                      <tr>
                        <td style="color:#777;">Invoice Number</td>
                        <td align="right" style="font-weight:700;">{{ $invoice->invoice_number }}</td>
                      </tr>
                      <tr>
                        <td style="color:#777;">Order Date</td>
                        <td align="right">{{ $order->created_at->format('d M Y, h:i A') }}</td>
                      </tr>
                      <tr>
                        <td style="color:#777;">Payment Method</td>
                        <td align="right">
                          {{ strtolower($order->payment_method) === 'cod' ? 'Cash on Delivery' : ucfirst(str_replace('_',' ', $order->payment_method)) }}
                        </td>
                      </tr>

                      <tr><td colspan="2"><div style="height:1px;background:#e5e5e5;margin:10px 0;"></div></td></tr>

                      <tr>
                        <td style="font-size:15px;font-weight:700;">Total Amount</td>
                        <td align="right" style="font-size:18px;font-weight:800;color:#c9a86c;">
                          {{ $invoice->currency }} {{ number_format($invoice->total, 2) }}
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Shipping Address -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td style="background:#fafafa;border:1px solid #eee;border-radius:12px;padding:16px;">
                    <h3 style="margin:0 0 10px 0;font-size:15px;color:#c9a86c;">
                      Shipping Address
                    </h3>
                    <p style="margin:0;font-size:14px;line-height:22px;color:#666;">
                      <strong>{{ $order->shipping_full_name }}</strong><br>
                      {{ $order->shipping_street }}<br>
                      @if($order->shipping_apartment){{ $order->shipping_apartment }}<br>@endif
                      {{ $order->shipping_city }}, {{ $order->shipping_state }}<br>
                      {{ $order->shipping_country }}<br>
                      Phone: {{ $order->shipping_phone }}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Support -->
              <p style="font-size:13px;color:#777;margin-top:18px;">
                If you have any questions, contact us at
                <a href="mailto:ert@ayzme.com" style="color:#c9a86c;font-weight:700;text-decoration:none;">
                  ert@ayzme.com
                </a>
              </p>

            </td>
          </tr>

          <!-- ================= FOOTER ================= -->
          <tr>
            <td style="background:#2f2f2f;padding:22px;text-align:center;">
              <p style="margin:0;color:#fff;font-size:13px;font-weight:700;">
                Thank you for shopping with CUPLE UAE
              </p>
              <p style="margin:6px 0 0 0;color:#bbb;font-size:12px;">
                © {{ date('Y') }} CUPLE. All rights reserved<br>
                 | UAE 
              </p>
              <p style="margin-top:10px;">
                <a href="https://cuple.ae" style="color:#c9a86c;text-decoration:none;font-weight:700;">
                  cuple.ae
                </a>
              </p>
            </td>
          </tr>

        </table>
        <!-- End Container -->

      </td>
    </tr>
  </table>
</body>
</html>
