<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        @page {
            margin: 25px;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11px;
            color: #333;
            line-height: 1.5;
        }
        .invoice-container {
            padding: 10px;
        }

        /* Header tables */
        .header-table {
            width: 100%;
            margin-bottom: 15px;
        }
        .header-table td {
            vertical-align: top;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            font-style: italic;
            color: #1a3a5c;
            letter-spacing: 1px;
        }
        .barcode-img {
            height: 50px;
        }
        .logo-img {
            max-width: 180px;
            max-height: 60px;
        }
        .from-title {
            font-weight: bold;
            font-size: 12px;
            color: #1a3a5c;
            margin-bottom: 5px;
        }
        .from-content {
            font-size: 11px;
            color: #444;
            line-height: 1.6;
        }
        .section-title {
            font-weight: bold;
            font-size: 12px;
            color: #1a3a5c;
            margin-bottom: 5px;
        }
        .section-content {
            font-size: 11px;
            color: #444;
            line-height: 1.6;
        }
        .invoice-number-title {
            font-size: 20px;
            font-weight: bold;
            color: #1a3a5c;
            margin-bottom: 10px;
        }
        .invoice-meta {
            font-size: 11px;
            color: #444;
        }
        .invoice-meta p {
            margin: 3px 0;
        }
        .invoice-meta strong {
            color: #1a3a5c;
        }
        .payment-method {
            color: #c9a86c !important;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #f8f8f8;
            border-bottom: 2px solid #ddd;
            padding: 10px 8px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            color: #1a3a5c;
        }
        .items-table td {
            border-bottom: 1px solid #eee;
            padding: 10px 8px;
            font-size: 10px;
            vertical-align: top;
        }
        .item-name {
            font-weight: 600;
            color: #1a3a5c;
        }
        .item-options {
            font-size: 9px;
            color: #666;
            margin-top: 3px;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }

        /* Totals Section */
        .totals-wrapper {
            width: 100%;
        }
        .totals-table {
            width: 280px;
            margin-left: auto;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 8px 10px;
            font-size: 11px;
            border-bottom: 1px solid #eee;
        }
        .totals-table .label {
            text-align: left;
            color: #555;
        }
        .totals-table .value {
            text-align: right;
            color: #333;
        }
        .totals-table tr.total-row td {
            border-top: 2px solid #c9a86c;
            border-bottom: none;
            font-size: 14px;
            font-weight: bold;
            color: #1a3a5c;
            padding-top: 12px;
        }
        .totals-table tr.total-row .value {
            color: #c9a86c;
        }

        /* Footer */
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .footer p {
            margin: 3px 0;
            font-size: 10px;
            color: #777;
        }
        .footer .thanks {
            font-size: 12px;
            color: #333;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    @php
        use Picqer\Barcode\BarcodeGeneratorPNG;

        // Generate barcode for order number
        $barcodeData = '';
        try {
            $generator = new BarcodeGeneratorPNG();
            $barcodeData = 'data:image/png;base64,' . base64_encode($generator->getBarcode($order->order_number, $generator::TYPE_CODE_128, 2, 50));
        } catch (\Exception $e) {
            $barcodeData = '';
        }

        // Get logo
        $logoPath = public_path('assets/images/logo.png');
        $logoData = '';
        if (file_exists($logoPath)) {
            $logoData = 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
        }
    @endphp

    <div class="invoice-container">
        <!-- Row 1: INVOICE title (left) | Barcode (right) -->
        <table class="header-table" style="margin-bottom: 10px;">
            <tr>
                <td style="width: 60%; vertical-align: top;">
                    <div class="invoice-title">INVOICE</div>
                </td>
                <td style="width: 40%; vertical-align: top; text-align: left;">
                    @if($barcodeData)
                        <img src="{{ $barcodeData }}" alt="{{ $order->order_number }}" class="barcode-img">
                    @endif
                </td>
            </tr>
        </table>

        <!-- Row 2: Logo (left) | From (right) -->
        <table class="header-table" style="margin-bottom: 20px;">
            <tr>
                <td style="width: 60%; vertical-align: top;">
                    @if($logoData)
                        <img src="{{ $logoData }}" alt="CUPLE" class="logo-img">
                    @else
                        <div style="font-size: 24px; font-weight: bold;">CUPLE <span style="font-size: 18px;">كابلي</span></div>
                    @endif
                </td>
                <td style="width: 40%; vertical-align: top; text-align: lift;">
                    <div class="from-title">From</div>
                    <div class="from-content">
                        cuple.ae<br>
                        Warehouse no 3, Al Garhoud<br>
                        Near Garhoud Private Hospital<br>
                        Dubai<br>
                        300544<br>
                        0504673789
                    </div>
                </td>
            </tr>
        </table>

        <!-- Row 3: Bill to + Ship to (left) | Invoice Info (right) -->
        <table class="header-table" style="margin-bottom: 25px;">
            <tr>
                <td style="width: 60%; vertical-align: top;">
                    <!-- Bill to and Ship to side by side -->
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 60%; vertical-align: top; padding-right: 15px;">
                                <div class="section-title">Bill to</div>
                                <div class="section-content">
                                    {{ $order->shipping_full_name }}<br>
                                    {{ $order->shipping_street }}<br>
                                    {{ $order->shipping_city }}<br>
                                    @if($order->shipping_email){{ $order->shipping_email }}<br>@endif
                                    {{ $order->shipping_phone }}
                                </div>
                            </td>
                            <td style="width: 60%; vertical-align: top;">
                                <div class="section-title">Ship to</div>
                                <div class="section-content">
                                    {{ $order->shipping_full_name }}<br>
                                    {{ $order->shipping_street }}<br>
                                    {{ $order->shipping_city }}<br>
                                    {{ $order->shipping_phone }}
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width: 40%; vertical-align: top; text-align: left;">
                    <!-- Invoice Info -->
                    <div class="invoice-number-title">Invoice no: {{ $order->order_number }}</div>
                    <div class="invoice-meta">
                        <p><strong>Invoice date:</strong> {{ $invoice->created_at->format('m-d-Y') }}</p>
                        <p><strong>Order no:</strong> {{ $order->order_number }}</p>
                        <p><strong>Order date:</strong> {{ $order->created_at->format('m-d-Y') }}</p>
                        <p><strong>Payment method:</strong> <span class="payment-method">{{ ucfirst(str_replace('_', ' ', $order->payment_method)) }}</span></p>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40px;">S.No</th>
                    <th style="width: 100px;">SKU</th>
                    <th>Product</th>
                    <th style="width: 70px;" class="text-center">Quantity</th>
                    <th style="width: 90px;" class="text-right">Unit price</th>
                    <th style="width: 90px;" class="text-right">Total price</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->items as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item->sku ?? $item->variant_sku ?? '-' }}</td>
                    <td>
                        <div class="item-name">{{ $item->product_name }}</div>
                        @php
                            $options = is_string($item->options) ? json_decode($item->options, true) : $item->options;
                        @endphp
                        @if($item->variant_name)
                            <div class="item-options">{{ $item->variant_name }}</div>
                        @endif
                        @if($options && is_array($options))
                            <div class="item-options">
                                @if(isset($options['color']))
                                    Color: {{ $options['color'] }}
                                @endif
                                @if(isset($options['color']) && isset($options['size']))
                                    &nbsp;|&nbsp;
                                @endif
                                @if(isset($options['size']))
                                    Size: {{ $options['size'] }}
                                @endif
                            </div>
                        @endif
                    </td>
                    <td class="text-center">{{ $item->quantity }}</td>
                    <td class="text-right">{{ $invoice->currency }} {{ number_format($item->price, 2) }}</td>
                    <td class="text-right">{{ $invoice->currency }} {{ number_format($item->total, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-wrapper">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal</td>
                    <td class="value">{{ $invoice->currency }} {{ number_format($invoice->subtotal, 2) }}</td>
                </tr>
                <tr>
                    <td class="label">Shipping</td>
                    <td class="value">
                        @if($invoice->shipping_amount > 0)
                            {{ $invoice->currency }} {{ number_format($invoice->shipping_amount, 2) }}
                        @else
                            Free
                        @endif
                    </td>
                </tr>
                @if($invoice->gift_box_discount_amount > 0)
                <tr>
                    <td class="label">Gift Box Discount</td>
                    <td class="value">-{{ $invoice->currency }} {{ number_format($invoice->gift_box_discount_amount, 2) }}</td>
                </tr>
                @endif
                @if($invoice->discount_amount > 0)
                <tr>
                    <td class="label">Fee (COD)</td>
                    <td class="value">{{ $invoice->currency }} {{ number_format($invoice->discount_amount, 2) }}</td>
                </tr>
                @endif
                @if($invoice->tax_amount > 0)
                <tr>
                    <td class="label">Tax</td>
                    <td class="value">{{ $invoice->currency }} {{ number_format($invoice->tax_amount, 2) }}</td>
                </tr>
                @endif
                <tr class="total-row">
                    <td class="label">Total</td>
                    <td class="value">{{ $invoice->currency }} {{ number_format($invoice->total, 2) }}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p class="thanks">Thank you for shopping with CUPLE UAE!</p>
            <p>For any questions, contact ert@ayzme.com</p>
            <p>cuple.ae | UAE </p>
        </div>
    </div>
</body>
</html>
