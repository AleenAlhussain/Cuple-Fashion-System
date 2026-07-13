<html>
<head>
    <meta charset="utf-8">
    <title>Orders Export</title>
    <style>
        @page {
            margin: 24px;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 11px;
            color: #222;
        }
        h2 {
            margin: 0 0 6px 0;
            font-size: 16px;
        }
        .meta {
            margin-bottom: 12px;
            font-size: 10px;
            color: #555;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #cfcfcf;
            padding: 6px 8px;
            vertical-align: top;
        }
        th {
            background: #f2f4f7;
            text-align: left;
        }
        .empty {
            text-align: center;
            padding: 20px;
            color: #777;
        }
    </style>
</head>
<body>
    <h2>Orders Export</h2>
    <div class="meta">Generated at: {{ $generatedAt }}</div>

    <table>
        <thead>
            <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th>Country</th>
                <th>Channel</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Shipping Status</th>
                <th>Tracking Number</th>
                <th>Order Total</th>
                <th>Item Name</th>
                <th>Variant SKU</th>
                <th>Variant ID</th>
                <th>Product ID</th>
                <th>Color</th>
                <th>Size</th>
                <th>Item Price</th>
                <th>Qty</th>
                <th>Item Total</th>
                <th>Currency</th>
                <th>Client IP</th>
                <th>Shipping Address</th>
                <th>Shipping Address IP</th>
                <th>Billing Address</th>
                <th>Billing Address IP</th>
                <th>Shipping Latitude</th>
                <th>Shipping Longitude</th>
                <th>Billing Latitude</th>
                <th>Billing Longitude</th>
                <th>Shipping Map URL</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    <td>{{ $row['order_number'] }}</td>
                    <td>{{ $row['customer_name'] }}</td>
                    <td>{{ $row['order_date'] }}</td>
                    <td>{{ $row['country'] }}</td>
                    <td>{{ $row['channel'] }}</td>
                    <td>{{ $row['payment_method'] }}</td>
                    <td>{{ $row['payment_status'] }}</td>
                    <td>{{ $row['shipping_status'] }}</td>
                    <td>{{ $row['tracking_number'] }}</td>
                    <td>{{ $row['order_total'] }}</td>
                    <td>{{ $row['item_name'] }}</td>
                    <td>{{ $row['variant_sku'] }}</td>
                    <td>{{ $row['variant_id'] }}</td>
                    <td>{{ $row['product_id'] }}</td>
                    <td>{{ $row['color'] }}</td>
                    <td>{{ $row['size'] }}</td>
                    <td>{{ $row['item_price'] }}</td>
                    <td>{{ $row['qty'] }}</td>
                    <td>{{ $row['item_total'] }}</td>
                    <td>{{ $row['currency'] }}</td>
                    <td>{{ $row['client_ip'] }}</td>
                    <td>{{ $row['shipping_address'] }}</td>
                    <td>{{ $row['shipping_address_ip'] }}</td>
                    <td>{{ $row['billing_address'] }}</td>
                    <td>{{ $row['billing_address_ip'] }}</td>
                    <td>{{ $row['shipping_latitude'] }}</td>
                    <td>{{ $row['shipping_longitude'] }}</td>
                    <td>{{ $row['billing_latitude'] }}</td>
                    <td>{{ $row['billing_longitude'] }}</td>
                    <td>{{ $row['shipping_map_url'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="30" class="empty">No orders found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
