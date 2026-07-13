<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Address;
use App\Models\Cart;
use App\Models\Country;
use App\Models\Coupon;
use App\Models\DiscountRuleUsage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Point;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\GeneralSettingService;
use App\Services\OfferEngine\OfferEngineService;
use App\Services\OrderCalculationService;
use App\Services\ShippingCalculator;
use App\Services\ZapierWebhookService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\Api\Traits\SmartSearchable;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class OrderController extends BaseController
{
    use SmartSearchable;

    protected OrderCalculationService $orderCalculationService;
    protected ShippingCalculator $shippingCalculator;
    protected GeneralSettingService $generalSettingService;
    protected OfferEngineService $offerEngineService;
    protected InvoiceService $invoiceService;

    public function __construct(
        OrderCalculationService $orderCalculationService,
        ShippingCalculator $shippingCalculator,
        GeneralSettingService $generalSettingService,
        OfferEngineService $offerEngineService,
        InvoiceService $invoiceService
    ) {
        $this->orderCalculationService = $orderCalculationService;
        $this->shippingCalculator = $shippingCalculator;
        $this->generalSettingService = $generalSettingService;
        $this->offerEngineService = $offerEngineService;
        $this->invoiceService = $invoiceService;
    }
    /**
     * List all orders with filters and pagination
     */
    public function index(Request $request)
    {
        $query = $this->buildOrderListQuery($request, true, true);

        // Sort
        $sortBy = $request->input('sortBy', 'newest');
        switch ($sortBy) {
            case 'oldest':
                $query->oldest();
                break;
            case 'total_asc':
                $query->orderBy('total', 'asc');
                break;
            case 'total_desc':
                $query->orderBy('total', 'desc');
                break;
            default:
                $query->latest();
        }

        $orders = $query->paginate($request->input('paginate', 15));

        // Transform orders for admin panel
        $transformedOrders = $orders->getCollection()->map(function ($order) {
            return $this->transformOrderForList($order);
        });

        $orders->setCollection($transformedOrders);

        return $this->paginated($orders);
    }

    /**
     * Export orders to XLSX
     */
    public function exportXlsx(Request $request)
    {
        $query = $this->buildOrderListQuery($request, true, false);
        $orders = $query->get();
        $rows = $orders->flatMap(fn ($order) => $this->mapOrderItemsForExport($order))->values();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Orders');

        $headers = [
            'A1' => 'Order #',
            'B1' => 'Customer',
            'C1' => 'Order Date',
            'D1' => 'Country',
            'E1' => 'Channel',
            'F1' => 'Payment Method',
            'G1' => 'Payment Status',
            'H1' => 'Shipping Status',
            'I1' => 'Tracking Number',
            'J1' => 'Order Total',
            'K1' => 'Item Name',
            'L1' => 'Variant SKU',
            'M1' => 'Variant ID',
            'N1' => 'Product ID',
            'O1' => 'Color',
            'P1' => 'Size',
            'Q1' => 'Item Price',
            'R1' => 'Qty',
            'S1' => 'Item Total',
            'T1' => 'Currency',
            'U1' => 'Client IP',
            'V1' => 'Shipping Address',
            'W1' => 'Shipping Address IP',
            'X1' => 'Billing Address',
            'Y1' => 'Billing Address IP',
            'Z1' => 'Shipping Latitude',
            'AA1' => 'Shipping Longitude',
            'AB1' => 'Billing Latitude',
            'AC1' => 'Billing Longitude',
            'AD1' => 'Shipping Map URL',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1F4E78'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ];
        $sheet->getStyle('A1:AD1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(22);

        $rowNumber = 2;
        foreach ($rows as $row) {
            $sheet->setCellValue('A' . $rowNumber, $row['order_number']);
            $sheet->setCellValue('B' . $rowNumber, $row['customer_name']);
            $sheet->setCellValue('C' . $rowNumber, $row['order_date']);
            $sheet->setCellValue('D' . $rowNumber, $row['country']);
            $sheet->setCellValue('E' . $rowNumber, $row['channel']);
            $sheet->setCellValue('F' . $rowNumber, $row['payment_method']);
            $sheet->setCellValue('G' . $rowNumber, $row['payment_status']);
            $sheet->setCellValue('H' . $rowNumber, $row['shipping_status']);
            $sheet->setCellValue('I' . $rowNumber, $row['tracking_number']);
            $sheet->setCellValue('J' . $rowNumber, $row['order_total']);
            $sheet->setCellValue('K' . $rowNumber, $row['item_name']);
            $sheet->setCellValue('L' . $rowNumber, $row['variant_sku']);
            $sheet->setCellValue('M' . $rowNumber, $row['variant_id']);
            $sheet->setCellValue('N' . $rowNumber, $row['product_id']);
            $sheet->setCellValue('O' . $rowNumber, $row['color']);
            $sheet->setCellValue('P' . $rowNumber, $row['size']);
            $sheet->setCellValue('Q' . $rowNumber, $row['item_price']);
            $sheet->setCellValue('R' . $rowNumber, $row['qty']);
            $sheet->setCellValue('S' . $rowNumber, $row['item_total']);
            $sheet->setCellValue('T' . $rowNumber, $row['currency']);
            $sheet->setCellValue('U' . $rowNumber, $row['client_ip']);
            $sheet->setCellValue('V' . $rowNumber, $row['shipping_address']);
            $sheet->setCellValue('W' . $rowNumber, $row['shipping_address_ip']);
            $sheet->setCellValue('X' . $rowNumber, $row['billing_address']);
            $sheet->setCellValue('Y' . $rowNumber, $row['billing_address_ip']);
            $sheet->setCellValue('Z' . $rowNumber, $row['shipping_latitude']);
            $sheet->setCellValue('AA' . $rowNumber, $row['shipping_longitude']);
            $sheet->setCellValue('AB' . $rowNumber, $row['billing_latitude']);
            $sheet->setCellValue('AC' . $rowNumber, $row['billing_longitude']);
            $sheet->setCellValue('AD' . $rowNumber, $row['shipping_map_url']);
            $rowNumber++;
        }

        foreach (range('A', 'Z') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        foreach (['AA', 'AB', 'AC', 'AD'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        if ($rowNumber > 2) {
            $dataStyle = [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                    ],
                ],
            ];
            $sheet->getStyle('A2:AD' . ($rowNumber - 1))->applyFromArray($dataStyle);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'orders_export_' . date('Y-m-d_His') . '.xlsx';
        $tempPath = storage_path('app/temp/' . $filename);

        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Export orders to PDF
     */
    public function exportPdf(Request $request)
    {
        $query = $this->buildOrderListQuery($request, true, false);
        $orders = $query->get();
        $rows = $orders->flatMap(fn ($order) => $this->mapOrderItemsForExport($order))->values();

        $pdf = Pdf::loadView('orders.export', [
            'rows' => $rows,
            'generatedAt' => now()->format('Y-m-d H:i'),
        ]);

        $filename = 'orders_export_' . date('Y-m-d_His') . '.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function mapOrderItemsForExport(Order $order): array
    {
        $customerName = $order->user
            ? $order->user->name
            : trim(($order->shipping_first_name ?? '') . ' ' . ($order->shipping_last_name ?? ''));
        $orderBase = [
            'order_number' => $order->order_number ?? $order->id,
            'customer_name' => $customerName ?: '-',
            'order_date' => $order->created_at ? $order->created_at->format('Y-m-d H:i') : '',
            'country' => $order->country?->name ?? $order->shipping_country ?? $order->billing_country ?? '',
            'channel' => $order->sales_channel ?? ($order->channel ?? ''),
            'payment_method' => $order->payment_method ?? '',
            'payment_status' => $order->payment_status ?? '',
            'shipping_status' => $order->status ?? '',
            'tracking_number' => $order->tracking_number ?? '',
            'order_total' => $order->total ?? 0,
            'currency' => $order->currency ?? 'AED',
            'client_ip' => $order->client_ip ?? '',
            'shipping_address' => $this->formatOrderAddressForExport($order, 'shipping'),
            'shipping_address_ip' => $order->shipping_address_ip ?? '',
            'billing_address' => $this->formatOrderAddressForExport($order, 'billing'),
            'billing_address_ip' => $order->billing_address_ip ?? '',
            'shipping_latitude' => $order->shipping_latitude ?? '',
            'shipping_longitude' => $order->shipping_longitude ?? '',
            'billing_latitude' => $order->billing_latitude ?? '',
            'billing_longitude' => $order->billing_longitude ?? '',
            'shipping_map_url' => $this->buildShippingMapUrl($order),
        ];

        $items = ($order->items ?? collect())->sortBy('id')->values();
        if ($items->isEmpty()) {
            return [[
                ...$orderBase,
                'item_name' => '',
                'variant_sku' => '',
                'variant_id' => '',
                'product_id' => '',
                'color' => '',
                'size' => '',
                'item_price' => '',
                'qty' => '',
                'item_total' => '',
            ]];
        }

        return $items->map(function ($item) use ($orderBase) {
            $options = is_string($item->options) ? json_decode($item->options, true) : ($item->options ?? []);
            $color = $options['color'] ?? $options['Color'] ?? $options['colour'] ?? $options['Colour'] ?? null;
            $size = $options['size'] ?? $options['Size'] ?? null;

            $itemName = $item->variant?->name
                ?? $item->variant_name
                ?? $item->product?->name
                ?? $item->product_name
                ?? '';

            $qty = $item->quantity ?? 0;
            $price = $item->price ?? 0;

            return [
                ...$orderBase,
                'item_name' => $itemName,
                'variant_sku' => $item->variant?->sku ?? $item->sku ?? '',
                'variant_id' => $item->product_variant_id ?? $item->variant?->id ?? '',
                'product_id' => $item->product_id ?? $item->product?->id ?? '',
                'color' => $color ?? '',
                'size' => $size ?? '',
                'item_price' => $price,
                'qty' => $qty,
                'item_total' => $price * $qty,
                'currency' => $orderBase['currency'],
            ];
        })->toArray();
    }

    private function formatOrderAddressForExport(Order $order, string $type): string
    {
        $prefix = $type === 'billing' ? 'billing_' : 'shipping_';

        $parts = array_filter([
            trim(($order->{$prefix . 'first_name'} ?? '') . ' ' . ($order->{$prefix . 'last_name'} ?? '')),
            $order->{$prefix . 'phone'} ?? null,
            $order->{$prefix . 'email'} ?? null,
            $order->{$prefix . 'street'} ?? null,
            $order->{$prefix . 'apartment'} ?? null,
            $order->{$prefix . 'city'} ?? null,
            $order->{$prefix . 'state'} ?? null,
            $order->{$prefix . 'postal_code'} ?? null,
            $order->{$prefix . 'country'} ?? null,
        ], function ($value) {
            return is_string($value) ? trim($value) !== '' : !is_null($value);
        });

        return implode(', ', $parts);
    }

    private function buildShippingMapUrl(Order $order): string
    {
        $mapUrl = $this->buildMapUrl($order->shipping_latitude, $order->shipping_longitude);
        if ($mapUrl !== '') {
            return $mapUrl;
        }

        $addressQuery = $this->formatOrderAddressForExport($order, 'shipping');
        if ($addressQuery === '') {
            return '';
        }

        return 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($addressQuery);
    }

    private function buildMapUrl($latitude, $longitude): string
    {
        if ($latitude === null || $longitude === null || $latitude === '' || $longitude === '') {
            return '';
        }

        return sprintf('https://www.google.com/maps?q=%s,%s', $latitude, $longitude);
    }

    private function buildOrderListQuery(Request $request, bool $withItems = true, bool $applySort = true)
    {
        $useTrashed = $request->boolean('trashed') || $request->input('trashed') === '1';
        $query = $useTrashed ? Order::onlyTrashed() : Order::query();

        $relations = ['user', 'createdByUser', 'country'];
        if ($withItems) {
            $relations = array_merge($relations, ['items.product.images', 'items.variant']);
        }

        $query->with($relations)->withCount('items');

        if ($request->filled('search')) {
            $this->applyOrderSmartSearch($query, $request->search);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('payment_status') && $request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->has('payment_method') && $request->payment_method) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->has('shipping_status') && $request->shipping_status) {
            $status = $request->shipping_status;
            if ($status === 'out_for_delivery') {
                $status = 'out-for-delivery';
            }
            $query->where('status', $status);
        }

        if ($request->has('country_id') && $request->country_id) {
            $countryValue = $request->country_id;
            if (is_numeric($countryValue)) {
                $query->where('country_id', $countryValue);
            } else {
                $query->where(function ($cq) use ($countryValue) {
                    $cq->whereHas('country', function ($q) use ($countryValue) {
                        $q->where('name', 'like', "%{$countryValue}%");
                    })
                    ->orWhere('shipping_country', 'like', "%{$countryValue}%")
                    ->orWhere('billing_country', 'like', "%{$countryValue}%");
                });
            }
        }

        $channelValue = $request->input('sales_channel', $request->input('channel'));
        if (!empty($channelValue)) {
            $column = Schema::hasColumn('orders', 'sales_channel')
                ? 'sales_channel'
                : (Schema::hasColumn('orders', 'channel') ? 'channel' : null);
            if ($column) {
                $query->where($column, $channelValue);
            }
        }

        if ($request->filled('created_by_user_id')) {
            $query->where('created_by_user_id', $request->input('created_by_user_id'));
        }

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $ids = $request->input('ids');
        if (!empty($ids)) {
            $idList = is_array($ids) ? $ids : explode(',', $ids);
            $idList = array_values(array_filter($idList, fn ($id) => is_numeric($id)));
            if (!empty($idList)) {
                $query->whereIn('id', $idList);
            }
        }

        if ($applySort) {
            $sortBy = $request->input('sortBy', 'newest');
            switch ($sortBy) {
                case 'oldest':
                    $query->oldest();
                    break;
                case 'total_asc':
                    $query->orderBy('total', 'asc');
                    break;
                case 'total_desc':
                    $query->orderBy('total', 'desc');
                    break;
                default:
                    $query->latest();
            }
        } else {
            $query->orderByDesc('id');
        }

        return $query;
    }

    /**
     * Show single order details
     */
    public function show($id)
    {
        // Try to find by ID or order_number
        $order = Order::with([
            'user',
            'createdByUser',
            'country',
            'items.product.images',
            'items.variant.attributeValues.attribute',
            'invoice',
        ])->where('id', $id)
          ->orWhere('order_number', $id)
          ->first();

        if (!$order) {
            return $this->error('Order not found', 404);
        }

        return $this->success($this->transformOrderForDetail($order));
    }

    /**
     * Create order from admin panel (store order)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'consumer_id' => 'required|exists:users,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'shipping_address_id' => 'required|exists:addresses,id',
            'billing_address_id' => 'required|exists:addresses,id',
            'payment_method' => 'required|string|max:50',
            'coupon_code' => 'nullable|string|exists:coupons,code',
            'customer_notes' => 'nullable|string|max:1000',
        ]);

        $creator = $request->user();
        if (!$creator || (!$creator->isAdmin() && !$creator->isShopManager())) {
            return $this->error('You do not have permission to perform this action.', 403);
        }

        $customer = User::findOrFail($validated['consumer_id']);
        $shippingAddress = Address::where('id', $validated['shipping_address_id'])
            ->where('user_id', $customer->id)
            ->first();
        if (!$shippingAddress) {
            return $this->error('Shipping address not found for this customer.', 422);
        }
        $billingAddress = Address::where('id', $validated['billing_address_id'])
            ->where('user_id', $customer->id)
            ->first();
        if (!$billingAddress) {
            return $this->error('Billing address not found for this customer.', 422);
        }

        $countryId = $customer->country_id ?? $shippingAddress->country_id ?? $billingAddress->country_id;
        if (!$countryId) {
            return $this->error('Customer country is required to create order.', 422);
        }
        $country = Country::find($countryId);

        $prepared = $this->orderCalculationService->prepareItems($validated['items'], $customer);
        $itemsData = $prepared['items'];
        $subtotal = $prepared['subtotal'];
        $giftBoxDiscountTotal = $prepared['gift_box_discount_total'] ?? 0;

        $discountAmount = 0;
        $couponCode = null;
        $coupon = null;
        $ruleDiscountAmount = 0;
        $appliedDiscountRules = [];

        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', $validated['coupon_code'])->valid()->first();
            if ($coupon && $coupon->isValidForCountry($countryId)) {
                $discountAmount = $coupon->calculateDiscount($subtotal);
                $couponCode = $coupon->code;
            } else {
                return $this->error('Invalid or expired coupon code.', 422);
            }
        }

        $discountResult = null;
        if (!empty($itemsData)) {
            $cartItemsForEngine = collect($itemsData)->map(function ($item) {
                return [
                    'variant_id' => $item['variant']?->id,
                    'variant_sku' => $item['variant']?->sku ?? $item['product']->sku,
                    'product_id' => $item['product']->id,
                    'price' => $item['price'],
                    'qty' => $item['quantity'],
                    'category_ids' => $item['product']->categories->pluck('id')->toArray(),
                ];
            })->toArray();

            $discountContext = [
                'user_id' => $customer->id,
                'country_id' => $countryId,
            ];

            $discountResult = $this->offerEngineService->calculate($cartItemsForEngine, $discountContext);

            if ($discountResult->hasDiscounts()) {
                $ruleDiscountAmount = $discountResult->getTotalDiscount();
                $appliedDiscountRules = $discountResult->getAppliedRuleIds();
            }
        }

        $shippingCountryId = $shippingAddress->country_id ?? $countryId;
        $itemsQuantity = (int) collect($itemsData)->sum('quantity');
        $shippingResult = $this->shippingCalculator->calculateForCountry($shippingCountryId, $subtotal, $itemsQuantity);
        $shippingAmount = $shippingResult['shipping_amount'];
        $shippingMethod = $shippingResult['rate'] ? $shippingResult['rate']->name : null;
        $paymentFee = $this->generalSettingService->getPaymentFee($validated['payment_method'] ?? null);

        $taxAmount = 0;
        $totalDiscounts = $discountAmount + $ruleDiscountAmount + $giftBoxDiscountTotal;
        $total = $subtotal - $totalDiscounts + $shippingAmount + $taxAmount + $paymentFee;
        $clientIp = $this->resolveClientIp($request);

        DB::beginTransaction();
        try {
            $order = Order::create([
                'user_id' => $customer->id,
                'created_by_user_id' => $creator->id,
                'sales_channel' => 'store',
                'country_id' => $countryId,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'rule_discount_amount' => $ruleDiscountAmount,
                'applied_discount_rules' => !empty($appliedDiscountRules) ? $appliedDiscountRules : null,
                'gift_box_discount_amount' => $giftBoxDiscountTotal,
                'shipping_amount' => $shippingAmount,
                'shipping_method' => $shippingMethod,
                'payment_fee' => $paymentFee,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'currency' => $country?->currency ?? 'AED',
                'coupon_code' => $couponCode,
                'client_ip' => $clientIp,
                'customer_notes' => $validated['customer_notes'] ?? null,
                'is_guest' => false,
                'shipping_first_name' => $shippingAddress->first_name ?? $customer->name,
                'shipping_last_name' => $shippingAddress->last_name ?? '',
                'shipping_phone' => $shippingAddress->phone,
                'shipping_email' => $shippingAddress->email ?? $customer->email,
                'shipping_street' => $shippingAddress->street,
                'shipping_apartment' => $shippingAddress->apartment,
                'shipping_city' => $shippingAddress->city,
                'shipping_state' => $shippingAddress->state,
                'shipping_postal_code' => $shippingAddress->postal_code,
                'shipping_country' => $shippingAddress->country?->name ?? '',
                'shipping_address_ip' => $shippingAddress->ip_address ?: $clientIp,
                'shipping_latitude' => $shippingAddress->latitude,
                'shipping_longitude' => $shippingAddress->longitude,
                'billing_first_name' => $billingAddress->first_name ?? $shippingAddress->first_name,
                'billing_last_name' => $billingAddress->last_name ?? $shippingAddress->last_name,
                'billing_phone' => $billingAddress->phone ?? $shippingAddress->phone,
                'billing_email' => $billingAddress->email ?? $shippingAddress->email ?? $customer->email,
                'billing_street' => $billingAddress->street ?? $shippingAddress->street,
                'billing_apartment' => $billingAddress->apartment ?? $shippingAddress->apartment,
                'billing_city' => $billingAddress->city ?? $shippingAddress->city,
                'billing_state' => $billingAddress->state ?? $shippingAddress->state,
                'billing_postal_code' => $billingAddress->postal_code ?? $shippingAddress->postal_code,
                'billing_country' => $billingAddress->country?->name ?? $shippingAddress->country?->name ?? '',
                'billing_address_ip' => $billingAddress->ip_address ?: $shippingAddress->ip_address ?: $clientIp,
                'billing_latitude' => $billingAddress->latitude,
                'billing_longitude' => $billingAddress->longitude,
            ]);

            foreach ($itemsData as $itemData) {
                $options = [];
                if (!empty($itemData['color'])) {
                    $options['Color'] = $itemData['color'];
                }
                if (!empty($itemData['size'])) {
                    $options['Size'] = $itemData['size'];
                }

                $order->items()->create([
                    'product_id' => $itemData['product']->id,
                    'product_variant_id' => $itemData['variant']?->id,
                    'product_name' => $itemData['product']->name,
                    'variant_name' => $itemData['variant']?->variant_name,
                    'sku' => $itemData['variant']?->sku ?? $itemData['product']->sku,
                    'quantity' => $itemData['quantity'],
                    'price' => $itemData['price'],
                    'total' => $itemData['total'],
                    'options' => !empty($options) ? $options : null,
                ]);

                if ($itemData['product']->manage_stock) {
                    if ($itemData['variant']) {
                        $itemData['variant']->decrement('stock_quantity', $itemData['quantity']);
                    } else {
                        $itemData['product']->decrement('stock_quantity', $itemData['quantity']);
                    }
                }
            }

            if ($coupon) {
                $coupon->increment('usage_count');
            }

            if ($discountResult && $discountResult->hasDiscounts()) {
                $appliedRulesData = $discountResult->getAppliedRulesForRecording();
                DiscountRuleUsage::recordOrderUsages($order->id, $appliedRulesData, $customer->id);
            }

            $adminCart = Cart::where('user_id', $creator->id)->first();
            if ($adminCart) {
                $adminCart->items()->delete();
            }

            DB::commit();

            // Generate invoice and send email (outside transaction to avoid blocking)
            try {
                $invoice = $this->invoiceService->generateInvoice($order);
                $this->invoiceService->sendInvoiceEmail($invoice);
            } catch (\Exception $e) {
                \Log::error('Failed to generate/send invoice: ' . $e->getMessage());
            }

            $this->tryCreateAramexShipmentAndSaveTracking($order);
            $this->trySendOrderZapierWebhook($order);

            $order->refresh()->load([
                'user',
                'createdByUser',
                'country',
                'items.product.images',
                'items.variant.attributeValues.attribute',
                'invoice',
            ]);

            return $this->success($this->transformOrderForDetail($order), 'Order created successfully', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to create order. ' . $e->getMessage(), 500);
        }
    }

    public function duplicate(Request $request, $id)
    {
        $creator = $request->user();
        if (!$creator || (!$creator->isAdmin() && !$creator->isShopManager())) {
            return $this->error('You do not have permission to perform this action.', 403);
        }

        $order = Order::with('items')->findOrFail($id);

        DB::beginTransaction();
        try {
            $newOrder = $order->replicate([
                'order_number',
                'tracking_number',
                'carrier',
                'transaction_id',
                'shipped_at',
                'delivered_at',
                'created_at',
                'updated_at',
                'deleted_at',
            ]);

            $newOrder->order_number = null;
            $newOrder->status = 'pending';
            $newOrder->payment_status = 'pending';
            $newOrder->tracking_number = null;
            $newOrder->carrier = null;
            $newOrder->transaction_id = null;
            $newOrder->shipped_at = null;
            $newOrder->delivered_at = null;
            $newOrder->created_by_user_id = $creator->id;
            $newOrder->sales_channel = 'store';
            $newOrder->is_guest = false;
            $newOrder->save();

            foreach ($order->items as $item) {
                $payload = Arr::except($item->toArray(), ['id', 'order_id', 'created_at', 'updated_at']);
                $newOrder->items()->create($payload);
            }

            DB::commit();

            return $this->success(
                $this->transformOrderForDetail($newOrder->load(['user', 'createdByUser', 'country', 'items.product.images'])),
                'Order duplicated successfully',
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to duplicate order. ' . $e->getMessage(), 500);
        }
    }

    private function tryCreateAramexShipmentAndSaveTracking($order): void
    {
        try {
            logger()->info('Aramex shipment: start', [
                'order_id' => $order->id ?? null,
                'shipping_provider' => $order->shipping_provider ?? null,
                'existing_tracking' => $order->tracking_number ?? null,
            ]);

            if (!empty($order->shipping_provider) && $order->shipping_provider !== 'aramex') {
                logger()->info('Aramex shipment: skipped (provider not aramex)', [
                    'order_id' => $order->id ?? null,
                    'provider' => $order->shipping_provider,
                ]);
                return;
            }

            if (!empty($order->tracking_number)) {
                logger()->info('Aramex shipment: skipped (already has tracking)', [
                    'order_id' => $order->id ?? null,
                    'tracking_number' => $order->tracking_number,
                ]);
                return;
            }

            $service = app(\App\Services\AramexShipmentService::class);
            $resp = $service->createShipmentForOrder($order);

            if (!empty($order->tracking_number)) {
                logger()->info('Aramex shipment: AWB already saved', [
                    'order_id' => $order->id ?? null,
                    'awb' => $order->tracking_number,
                ]);
                return;
            }

            [$awb, $awbPath] = $this->extractAramexAwb($resp);
            $hasErrors = (bool) data_get($resp, 'HasErrors');

            if ($awb !== '') {
                $order->tracking_number = $awb;
                $order->save();

                logger()->info('Aramex shipment: AWB saved successfully', [
                    'order_id' => $order->id ?? null,
                    'awb' => $awb,
                    'awb_extracted_path' => $awbPath,
                ]);
            } else {
                logger()->warning('Aramex shipment: no AWB returned', [
                    'order_id' => $order->id ?? null,
                    'has_errors' => $hasErrors,
                    'awb_extracted_path' => $awbPath,
                    'response_snapshot' => $resp,
                ]);
            }
        } catch (\Throwable $e) {
            logger()->warning('Aramex shipment: exception', [
                'order_id' => $order->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function extractAramexAwb(array $resp): array
    {
        $processed = data_get($resp, 'Shipments.ProcessedShipment');
        if (is_array($processed)) {
            if (isset($processed[0])) {
                $awb = data_get($processed[0], 'ID');
                if ($awb) {
                    return [(string) $awb, 'Shipments.ProcessedShipment[0].ID'];
                }
            }
            $awb = data_get($processed, 'ID');
            if ($awb) {
                return [(string) $awb, 'Shipments.ProcessedShipment.ID'];
            }
        }

        $awb = data_get($resp, 'Shipments.ProcessedShipment.ID');
        if ($awb) {
            return [(string) $awb, 'Shipments.ProcessedShipment.ID'];
        }

        $awb = data_get($resp, 'ProcessedShipment.ID');
        if ($awb) {
            return [(string) $awb, 'ProcessedShipment.ID'];
        }

        $awb = data_get($resp, 'Shipments.0.ID');
        if ($awb) {
            return [(string) $awb, 'Shipments[0].ID'];
        }

        return ['', null];
    }

    private function trySendOrderZapierWebhook($order): void
    {
        try {
            app(ZapierWebhookService::class)->sendOrderCreated($order);
        } catch (\Throwable $e) {
            logger()->warning('Zapier webhook failed', [
                'order_id' => $order->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Update order (general update)
     */
    public function update(Request $request, $id)
    {
        $order = Order::with(['items.product', 'items.variant'])->findOrFail($id);

        $lockedStatuses = config('orders.lock_edit_on_status', []);
        $lockFields = [
            'items',
            'shipping_first_name', 'shipping_last_name', 'shipping_email', 'shipping_phone',
            'shipping_street', 'shipping_apartment', 'shipping_city', 'shipping_state',
            'shipping_postal_code', 'shipping_country',
            'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
            'billing_street', 'billing_apartment', 'billing_city', 'billing_state',
            'billing_postal_code', 'billing_country',
            'discount_amount', 'shipping_amount', 'tax_amount',
            'payment_method', 'payment_status', 'tracking_number', 'carrier', 'shipping_method',
            'customer_notes', 'admin_notes',
        ];

        if (!empty($lockedStatuses) && in_array($order->status, $lockedStatuses, true) && $request->hasAny($lockFields)) {
            return $this->error('This order is locked for editing.', 423);
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:pending,confirmed,processing,shipped,out-for-delivery,out_for_delivery,delivered,cancelled,refunded',
            'payment_status' => 'sometimes|in:pending,paid,failed,refunded',
            'payment_method' => 'sometimes|nullable|string|max:50',
            'tracking_number' => 'sometimes|nullable|string|max:255',
            'carrier' => 'sometimes|nullable|string|max:255',
            'shipping_method' => 'sometimes|nullable|string|max:255',
            'shipping_amount' => 'sometimes|numeric|min:0',
            'tax_amount' => 'sometimes|numeric|min:0',
            'discount_amount' => 'sometimes|numeric|min:0',
            'customer_notes' => 'sometimes|nullable|string|max:2000',
            'admin_notes' => 'sometimes|nullable|string|max:2000',
            'order_status_id' => 'sometimes|integer',
            'shipping_first_name' => 'sometimes|nullable|string|max:255',
            'shipping_last_name' => 'sometimes|nullable|string|max:255',
            'shipping_email' => 'sometimes|nullable|email|max:255',
            'shipping_phone' => 'sometimes|nullable|string|max:255',
            'shipping_street' => 'sometimes|nullable|string|max:255',
            'shipping_apartment' => 'sometimes|nullable|string|max:255',
            'shipping_city' => 'sometimes|nullable|string|max:255',
            'shipping_state' => 'sometimes|nullable|string|max:255',
            'shipping_postal_code' => 'sometimes|nullable|string|max:50',
            'shipping_country' => 'sometimes|nullable|string|max:255',
            'billing_first_name' => 'sometimes|nullable|string|max:255',
            'billing_last_name' => 'sometimes|nullable|string|max:255',
            'billing_email' => 'sometimes|nullable|email|max:255',
            'billing_phone' => 'sometimes|nullable|string|max:255',
            'billing_street' => 'sometimes|nullable|string|max:255',
            'billing_apartment' => 'sometimes|nullable|string|max:255',
            'billing_city' => 'sometimes|nullable|string|max:255',
            'billing_state' => 'sometimes|nullable|string|max:255',
            'billing_postal_code' => 'sometimes|nullable|string|max:50',
            'billing_country' => 'sometimes|nullable|string|max:255',
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required_with:items|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.price' => 'required_with:items|numeric|min:0',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'out_for_delivery') {
            $validated['status'] = 'out-for-delivery';
        }

        // Map order_status_id to status string if provided
        if (isset($validated['order_status_id'])) {
            $statusMap = [
                1 => 'pending',
                2 => 'confirmed',
                3 => 'processing',
                4 => 'shipped',
                5 => 'out-for-delivery',
                6 => 'delivered',
                7 => 'cancelled',
                8 => 'refunded',
            ];
            $validated['status'] = $statusMap[$validated['order_status_id']] ?? 'pending';
            unset($validated['order_status_id']);
        }

        DB::transaction(function () use (&$validated, $order) {
            $updateData = Arr::only($validated, [
                'status',
                'payment_status',
                'payment_method',
                'tracking_number',
                'carrier',
                'shipping_method',
                'shipping_amount',
                'tax_amount',
                'discount_amount',
                'customer_notes',
                'admin_notes',
                'shipping_first_name',
                'shipping_last_name',
                'shipping_email',
                'shipping_phone',
                'shipping_street',
                'shipping_apartment',
                'shipping_city',
                'shipping_state',
                'shipping_postal_code',
                'shipping_country',
                'billing_first_name',
                'billing_last_name',
                'billing_email',
                'billing_phone',
                'billing_street',
                'billing_apartment',
                'billing_city',
                'billing_state',
                'billing_postal_code',
                'billing_country',
            ]);

            $nonNullableFields = [
                'shipping_first_name',
                'shipping_last_name',
                'billing_first_name',
                'billing_last_name',
            ];

            foreach ($nonNullableFields as $field) {
                if (array_key_exists($field, $updateData) && $updateData[$field] === null) {
                    $updateData[$field] = $order->{$field} ?? '';
                }
            }

            // Handle status change with stock management
            if (isset($validated['status'])) {
                $oldStatus = $order->status;
                $newStatus = $validated['status'];

                // If cancelling, restore stock
                if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
                    foreach ($order->items as $item) {
                        if ($item->product && $item->product->manage_stock) {
                            if ($item->variant) {
                                $item->variant->increment('stock_quantity', $item->quantity);
                            } else {
                                $item->product->increment('stock_quantity', $item->quantity);
                            }
                        }
                    }
                }

                // If uncancelling, deduct stock again
                if ($oldStatus === 'cancelled' && $newStatus !== 'cancelled') {
                    foreach ($order->items as $item) {
                        if ($item->product && $item->product->manage_stock) {
                            if ($item->variant) {
                                $item->variant->decrement('stock_quantity', $item->quantity);
                            } else {
                                $item->product->decrement('stock_quantity', $item->quantity);
                            }
                        }
                    }
                }

                // Update timestamps based on status
                if ($newStatus === 'shipped' && !$order->shipped_at) {
                    $updateData['shipped_at'] = now();
                }
                if ($newStatus === 'delivered' && !$order->delivered_at) {
                    $updateData['delivered_at'] = now();

                    // Credit points to user when order is delivered
                    if ($order->user_id && $order->payment_status === 'paid') {
                        $pointsEarned = Point::calculatePointsFromOrder($order->total);
                        if ($pointsEarned > 0) {
                            $point = Point::getOrCreate($order->user_id);
                            $point->credit(
                                $pointsEarned,
                                'order_reward',
                                $order->id,
                                null,
                                $order->order_number ? ('order:' . $order->order_number) : ('order_id:' . $order->id)
                            );
                        }
                    }
                }
            }

            if (array_key_exists('items', $validated)) {
                $lineItems = [];
                $subtotal = 0.0;

                foreach ($validated['items'] as $entry) {
                    $product = Product::findOrFail($entry['product_id']);
                    $variant = null;

                    if (!empty($entry['variant_id'])) {
                        $variant = ProductVariant::where('id', $entry['variant_id'])
                            ->where('product_id', $product->id)
                            ->first();

                        if (!$variant) {
                            throw ValidationException::withMessages([
                                'items' => ['Selected variant does not belong to the product.'],
                            ]);
                        }
                    }

                    $quantity = max(1, (int) $entry['quantity']);
                    $price = max(0, (float) $entry['price']);
                    $total = round($price * $quantity, 2);
                    $subtotal += $total;

                    $lineItems[] = [
                        'product_id' => $product->id,
                        'product_variant_id' => $variant?->id,
                        'product_name' => $product->name,
                        'variant_name' => $variant?->name,
                        'sku' => $variant?->sku ?? $product->sku,
                        'quantity' => $quantity,
                        'price' => $price,
                        'total' => $total,
                        'options' => null,
                    ];
                }

                $order->items()->delete();
                foreach ($lineItems as $lineItem) {
                    $order->items()->create($lineItem);
                }

                $discount = array_key_exists('discount_amount', $validated) ? (float) $validated['discount_amount'] : (float) ($order->discount_amount ?? 0);
                $shipping = array_key_exists('shipping_amount', $validated) ? (float) $validated['shipping_amount'] : (float) ($order->shipping_amount ?? 0);
                $tax = array_key_exists('tax_amount', $validated) ? (float) $validated['tax_amount'] : (float) ($order->tax_amount ?? 0);
                $giftBoxDiscount = (float) ($order->gift_box_discount_amount ?? 0);
                $ruleDiscount = (float) ($order->rule_discount_amount ?? 0);
                $paymentFee = (float) ($order->payment_fee ?? 0);

                $updateData['subtotal'] = round($subtotal, 2);
                $updateData['total'] = max(0, round($subtotal - $discount - $giftBoxDiscount - $ruleDiscount + $shipping + $tax + $paymentFee, 2));
                $updateData['discount_amount'] = $discount;
                $updateData['shipping_amount'] = $shipping;
                $updateData['tax_amount'] = $tax;
            } elseif (
                array_key_exists('discount_amount', $validated)
                || array_key_exists('shipping_amount', $validated)
                || array_key_exists('tax_amount', $validated)
            ) {
                $subtotal = (float) ($order->subtotal ?? 0);
                $discount = array_key_exists('discount_amount', $validated) ? (float) $validated['discount_amount'] : (float) ($order->discount_amount ?? 0);
                $shipping = array_key_exists('shipping_amount', $validated) ? (float) $validated['shipping_amount'] : (float) ($order->shipping_amount ?? 0);
                $tax = array_key_exists('tax_amount', $validated) ? (float) $validated['tax_amount'] : (float) ($order->tax_amount ?? 0);
                $giftBoxDiscount = (float) ($order->gift_box_discount_amount ?? 0);
                $ruleDiscount = (float) ($order->rule_discount_amount ?? 0);
                $paymentFee = (float) ($order->payment_fee ?? 0);

                $updateData['total'] = max(0, round($subtotal - $discount - $giftBoxDiscount - $ruleDiscount + $shipping + $tax + $paymentFee, 2));
            }

            $order->update($updateData);
        });

        return $this->success($this->transformOrderForDetail($order->fresh()), 'Order updated successfully');
    }

    /**
     * Update order status
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:pending,confirmed,processing,shipped,out-for-delivery,delivered,cancelled,refunded',
            'order_status_id' => 'sometimes|integer',
        ]);

        // Map order_status_id to status string if provided
        if (isset($validated['order_status_id'])) {
            $statusMap = [
                1 => 'pending',
                2 => 'confirmed',
                3 => 'processing',
                4 => 'shipped',
                5 => 'out-for-delivery',
                6 => 'delivered',
                7 => 'cancelled',
                8 => 'refunded',
            ];
            $validated['status'] = $statusMap[$validated['order_status_id']] ?? $order->status;
        }

        if (!isset($validated['status'])) {
            return $this->error('Status is required', 422);
        }

        $oldStatus = $order->status;
        $newStatus = $validated['status'];

        // If cancelling, restore stock
        if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
            foreach ($order->items as $item) {
                if ($item->product && $item->product->manage_stock) {
                    if ($item->variant) {
                        $item->variant->increment('stock_quantity', $item->quantity);
                    } else {
                        $item->product->increment('stock_quantity', $item->quantity);
                    }
                }
            }
        }

        // If uncancelling, deduct stock again
        if ($oldStatus === 'cancelled' && $newStatus !== 'cancelled') {
            foreach ($order->items as $item) {
                if ($item->product && $item->product->manage_stock) {
                    if ($item->variant) {
                        $item->variant->decrement('stock_quantity', $item->quantity);
                    } else {
                        $item->product->decrement('stock_quantity', $item->quantity);
                    }
                }
            }
        }

        $updateData = ['status' => $newStatus];

        // Update timestamps based on status
        if ($newStatus === 'shipped' && !$order->shipped_at) {
            $updateData['shipped_at'] = now();
        }
        if ($newStatus === 'delivered' && !$order->delivered_at) {
            $updateData['delivered_at'] = now();

            // Credit points to user when order is delivered
            if ($order->user_id && $order->payment_status === 'paid') {
                $pointsEarned = Point::calculatePointsFromOrder($order->total);
                if ($pointsEarned > 0) {
                    $point = Point::getOrCreate($order->user_id);
                    $point->credit(
                        $pointsEarned,
                        'order_reward',
                        $order->id,
                        null,
                        $order->order_number ? ('order:' . $order->order_number) : ('order_id:' . $order->id)
                    );
                }
            }
        }

        $order->update($updateData);

        return $this->success($this->transformOrderForDetail($order->fresh()), 'Order status updated successfully');
    }

    /**
     * Update payment status
     */
    public function updatePaymentStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'payment_status' => 'required|in:pending,paid,failed,refunded',
            'transaction_id' => 'nullable|string|max:255',
        ]);

        $order->update([
            'payment_status' => $validated['payment_status'],
            'transaction_id' => $validated['transaction_id'] ?? $order->transaction_id,
        ]);

        return $this->success($this->transformOrderForDetail($order->fresh()), 'Payment status updated successfully');
    }

    /**
     * Update shipping info
     */
    public function updateShipping(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'tracking_number' => 'nullable|string|max:255',
            'carrier' => 'nullable|string|max:255',
            'shipping_method' => 'nullable|string|max:255',
        ]);

        $order->update($validated);

        return $this->success($this->transformOrderForDetail($order->fresh()), 'Shipping info updated successfully');
    }

    /**
     * Add admin note
     */
    public function addNote(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'admin_notes' => 'required|string|max:2000',
        ]);

        $currentNotes = $order->admin_notes ?? '';
        $newNote = '[' . now()->format('Y-m-d H:i') . '] ' . $validated['admin_notes'];

        $order->update([
            'admin_notes' => $currentNotes ? $currentNotes . "\n" . $newNote : $newNote,
        ]);

        return $this->success($this->transformOrderForDetail($order->fresh()), 'Note added successfully');
    }

    /**
     * Delete order (soft delete - move to trash)
     */
    public function destroy($id)
    {
        $order = Order::findOrFail($id);

        // Restore stock if order wasn't already cancelled
        if ($order->status !== 'cancelled') {
            foreach ($order->items as $item) {
                if ($item->product && $item->product->manage_stock) {
                    if ($item->variant) {
                        $item->variant->increment('stock_quantity', $item->quantity);
                    } else {
                        $item->product->increment('stock_quantity', $item->quantity);
                    }
                }
            }
        }

        // Soft delete the order (move to trash)
        $order->delete();

        return $this->success(null, 'Order moved to trash');
    }

    /**
     * Restore order from trash
     */
    public function restore($id)
    {
        $order = Order::withTrashed()->findOrFail($id);

        if (!$order->trashed()) {
            return $this->error('Order is not in trash', 400);
        }

        // Deduct stock again when restoring a previously trashed order
        if ($order->status !== 'cancelled') {
            foreach ($order->items as $item) {
                if ($item->product && $item->product->manage_stock) {
                    if ($item->variant) {
                        $item->variant->decrement('stock_quantity', $item->quantity);
                    } else {
                        $item->product->decrement('stock_quantity', $item->quantity);
                    }
                }
            }
        }

        $order->restore();

        return $this->success($this->transformOrderForList($order->fresh()), 'Order restored successfully');
    }

    /**
     * Permanently delete order from trash
     */
    public function forceDelete($id)
    {
        $order = Order::withTrashed()->findOrFail($id);

        if (!$order->trashed()) {
            return $this->error('Order must be in trash before permanent deletion', 400);
        }

        // Restore stock if order wasn't already cancelled
        if ($order->status !== 'cancelled') {
            foreach ($order->items as $item) {
                if ($item->product && $item->product->manage_stock) {
                    if ($item->variant) {
                        $item->variant->increment('stock_quantity', $item->quantity);
                    } else {
                        $item->product->increment('stock_quantity', $item->quantity);
                    }
                }
            }
        }

        // Delete related items first
        $order->items()->delete();

        // Permanently delete the order
        $order->forceDelete();

        return $this->success(null, 'Order permanently deleted');
    }

    /**
     * Get trashed orders
     */
    public function trashed(Request $request)
    {
        $query = Order::onlyTrashed()
            ->with(['user', 'createdByUser', 'country', 'items.product.images'])
            ->withCount('items');

        // Smart search
        if ($request->filled('search')) {
            $this->applyOrderSmartSearch($query, $request->search);
        }

        // Filter by payment status
        if ($request->has('payment_status') && $request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        // Filter by payment method
        if ($request->has('payment_method') && $request->payment_method) {
            $query->where('payment_method', $request->payment_method);
        }

        // Filter by shipping status (maps to order status)
        if ($request->has('shipping_status') && $request->shipping_status) {
            $status = $request->shipping_status;
            if ($status === 'out_for_delivery') {
                $status = 'out-for-delivery';
            }
            $query->where('status', $status);
        }

        // Filter by country
        if ($request->has('country_id') && $request->country_id) {
            $countryValue = $request->country_id;
            if (is_numeric($countryValue)) {
                $query->where('country_id', $countryValue);
            } else {
                $query->where(function ($cq) use ($countryValue) {
                    $cq->whereHas('country', function ($q) use ($countryValue) {
                        $q->where('name', 'like', "%{$countryValue}%");
                    })
                    ->orWhere('shipping_country', 'like', "%{$countryValue}%")
                    ->orWhere('billing_country', 'like', "%{$countryValue}%");
                });
            }
        }

        // Filter by channel
        $channelValue = $request->input('sales_channel', $request->input('channel'));
        if (!empty($channelValue)) {
            $column = Schema::hasColumn('orders', 'sales_channel')
                ? 'sales_channel'
                : (Schema::hasColumn('orders', 'channel') ? 'channel' : null);
            if ($column) {
                $query->where($column, $channelValue);
            }
        }

        // Filter by creator user
        if ($request->filled('created_by_user_id')) {
            $query->where('created_by_user_id', $request->input('created_by_user_id'));
        }

        $query->latest('deleted_at');

        $orders = $query->paginate($request->input('paginate', 15));

        $transformedOrders = $orders->getCollection()->map(function ($order) {
            $transformed = $this->transformOrderForList($order);
            $transformed['deleted_at'] = $order->deleted_at;
            return $transformed;
        });

        $orders->setCollection($transformedOrders);

        return $this->paginated($orders);
    }

    /**
     * Bulk delete orders
     */
    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:orders,id',
        ]);

        $orders = Order::whereIn('id', $validated['ids'])->get();

        foreach ($orders as $order) {
            // Restore stock if order wasn't cancelled
            if ($order->status !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product && $item->product->manage_stock) {
                        if ($item->variant) {
                            $item->variant->increment('stock_quantity', $item->quantity);
                        } else {
                            $item->product->increment('stock_quantity', $item->quantity);
                        }
                    }
                }
            }
            $order->delete();
        }

        return $this->success(null, count($validated['ids']) . ' orders moved to trash successfully');
    }

    /**
     * Get available order statuses
     */
    public function statuses()
    {
        $statuses = [
            ['id' => 1, 'name' => 'Pending', 'slug' => 'pending', 'sequence' => 1],
            ['id' => 2, 'name' => 'Confirmed', 'slug' => 'confirmed', 'sequence' => 2],
            ['id' => 3, 'name' => 'Processing', 'slug' => 'processing', 'sequence' => 3],
            ['id' => 4, 'name' => 'Shipped', 'slug' => 'shipped', 'sequence' => 4],
            ['id' => 5, 'name' => 'Out For Delivery', 'slug' => 'out-for-delivery', 'sequence' => 5],
            ['id' => 6, 'name' => 'Delivered', 'slug' => 'delivered', 'sequence' => 6],
            ['id' => 7, 'name' => 'Cancelled', 'slug' => 'cancelled', 'sequence' => 7],
            ['id' => 8, 'name' => 'Refunded', 'slug' => 'refunded', 'sequence' => 8],
        ];

        return $this->success($statuses);
    }

    /**
     * Export UAE pick list (SKU -> store allocation by priority) as CSV
     */
    public function exportOnlineRequest(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:orders,id',
        ]);

        $required = OrderItem::whereIn('order_id', $validated['ids'])
            ->whereNotNull('sku')
            ->selectRaw('sku, SUM(quantity) as required_qty')
            ->groupBy('sku')
            ->get();

        if ($required->isEmpty()) {
            return $this->error('No order items found for the selected orders.', 422);
        }

        $stores = DB::table('uae_store_priority')
            ->where('is_active', 1)
            ->orderBy('priority')
            ->get(['store_key', 'store_name']);

        if ($stores->isEmpty()) {
            return $this->error('No active UAE store priorities found.', 422);
        }

        $rows = [];

        foreach ($required as $item) {
            $sku = $item->sku;
            $remaining = (int) $item->required_qty;

            if ($remaining <= 0) {
                continue;
            }

            $stockRow = DB::table('uae_store_on_hand_raw')
                ->where('sku', $sku)
                ->first();

            if (!$stockRow) {
                continue;
            }

            $stockMap = (array) $stockRow;

            foreach ($stores as $store) {
                if ($remaining <= 0) {
                    break;
                }

                $storeKey = $store->store_key;
                $available = (int) ($stockMap[$storeKey] ?? 0);

                if ($available <= 0) {
                    continue;
                }

                $take = min($available, $remaining);
                $rows[] = [
                    'sku' => $sku,
                    'store_name' => $store->store_name,
                    'qty' => $take,
                ];
                $remaining -= $take;
            }
        }

        $escape = function ($value) {
            $value = (string) $value;
            if (strpbrk($value, ",\"\n\r") !== false) {
                $value = '"' . str_replace('"', '""', $value) . '"';
            }
            return $value;
        };

        $csv = "sku,store_name,qty\n";
        foreach ($rows as $row) {
            $csv .= $escape($row['sku']) . ',' . $escape($row['store_name']) . ',' . $row['qty'] . "\n";
        }

        $filename = 'uae_pick_list_' . date('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Get order statistics - OPTIMIZED: Single query instead of 20+ queries
     */
    public function statistics(Request $request)
    {
        $countryId = $request->input('country_id');
        $filterBy = strtolower((string) $request->input('filter_by', 'all_time'));
        $now = now();

        $baseOrderQuery = Order::query();
        if ($countryId) {
            $baseOrderQuery->where('country_id', $countryId);
        }

        $rangeStart = null;
        $rangeEnd = null;
        switch ($filterBy) {
            case 'today':
                $rangeStart = $now->copy()->startOfDay();
                $rangeEnd = $now->copy()->endOfDay();
                break;
            case 'last_week':
                $rangeStart = $now->copy()->subWeek()->startOfWeek();
                $rangeEnd = $now->copy()->subWeek()->endOfWeek();
                break;
            case 'last_month':
                $rangeStart = $now->copy()->subMonth()->startOfMonth();
                $rangeEnd = $now->copy()->subMonth()->endOfMonth();
                break;
            case 'this_year':
                $rangeStart = $now->copy()->startOfYear();
                $rangeEnd = $now->copy()->endOfDay();
                break;
            case 'all_time':
                break;
            default:
                $filterBy = 'all_time';
                break;
        }

        $filteredOrderQuery = clone $baseOrderQuery;
        if ($rangeStart && $rangeEnd) {
            $filteredOrderQuery->whereBetween('created_at', [$rangeStart, $rangeEnd]);
        }

        $result = $filteredOrderQuery
            ->selectRaw("
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
                SUM(CASE WHEN status = 'out-for-delivery' THEN 1 ELSE 0 END) as out_for_delivery,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded,
                SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) as total_revenue
            ")
            ->first();

        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd = $now->copy()->endOfMonth();

        $todayOrders = (clone $baseOrderQuery)
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();
        $todayRevenue = (clone $baseOrderQuery)
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->where('payment_status', 'paid')
            ->sum('total');

        $thisMonthOrders = (clone $baseOrderQuery)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->count();
        $thisMonthRevenue = (clone $baseOrderQuery)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->where('payment_status', 'paid')
            ->sum('total');

        $trashedCountQuery = Order::onlyTrashed();
        if ($countryId) {
            $trashedCountQuery->where('country_id', $countryId);
        }
        $trashedCount = $trashedCountQuery->count();

        $totalProducts = Product::count();
        $totalActiveProducts = Product::where('is_active', true)->count();
        $totalUsers = User::count();

        $totalStores = 0;
        if (Schema::hasTable('uae_store_priority')) {
            $totalStores = DB::table('uae_store_priority')->count();
        }

        $stats = [
            'total_orders' => (int) ($result->total_orders ?? 0),
            // For filter pills
            'total_pending_orders' => (int) ($result->pending ?? 0),
            'total_confirmed_orders' => (int) ($result->confirmed ?? 0),
            'total_processing_orders' => (int) ($result->processing ?? 0),
            'total_shipped_orders' => (int) ($result->shipped ?? 0),
            'total_out_of_delivery_orders' => (int) ($result->out_for_delivery ?? 0),
            'total_delivered_orders' => (int) ($result->delivered ?? 0),
            'total_cancelled_orders' => (int) ($result->cancelled ?? 0),
            'total_refunded_orders' => (int) ($result->refunded ?? 0),
            'total_trashed_orders' => (int) $trashedCount,
            // Dashboard statistics
            'total_revenue' => (float) ($result->total_revenue ?? 0),
            'today_orders' => (int) $todayOrders,
            'today_revenue' => (float) $todayRevenue,
            'this_month_orders' => (int) $thisMonthOrders,
            'this_month_revenue' => (float) $thisMonthRevenue,
            // Dashboard widget counts
            'total_products' => (int) $totalProducts,
            'total_active_products' => (int) $totalActiveProducts,
            'total_users' => (int) $totalUsers,
            'total_stores' => (int) $totalStores,
            // Request metadata
            'filter_by' => $filterBy,
            // Backward compatible keys
            'pending' => (int) ($result->pending ?? 0),
            'confirmed' => (int) ($result->confirmed ?? 0),
            'processing' => (int) ($result->processing ?? 0),
            'shipped' => (int) ($result->shipped ?? 0),
            'delivered' => (int) ($result->delivered ?? 0),
            'cancelled' => (int) ($result->cancelled ?? 0),
        ];

        return $this->success($stats);
    }

    /**
     * Get dashboard chart data
     */
    public function chart(Request $request)
    {
        $days = $request->input('days', 30);
        $startDate = now()->subDays($days);

        $ordersPerDay = Order::selectRaw('DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue')
            ->where('created_at', '>=', $startDate)
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return $this->success([
            'labels' => $ordersPerDay->pluck('date'),
            'orders' => $ordersPerDay->pluck('count'),
            'revenue' => $ordersPerDay->pluck('revenue'),
        ]);
    }

    /**
     * Transform order for list view
     */
    private function transformOrderForList($order)
    {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'invoice_number' => 'INV-' . $order->order_number,
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
            'status' => $order->status,
            'shipping_status' => $order->status,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'country_id' => $order->country_id,
            'sales_channel' => $order->sales_channel ?? ($order->channel ?? null),
            'created_by_user_id' => $order->created_by_user_id,
            'created_by_user' => $order->createdByUser ? [
                'id' => $order->createdByUser->id,
                'name' => $order->createdByUser->name,
                'email' => $order->createdByUser->email,
                'role' => $order->createdByUser->role,
            ] : null,
            'total' => $order->total,
            'subtotal' => $order->subtotal,
            'items_count' => $order->items_count,
            'tracking_number' => $order->tracking_number,
            'carrier' => $order->carrier,
            'consumer' => $order->user ? [
                'id' => $order->user->id,
                'name' => $order->user->name,
                'email' => $order->user->email,
            ] : [
                'id' => null,
                'name' => trim($order->shipping_first_name . ' ' . $order->shipping_last_name),
                'email' => $order->shipping_email,
            ],
            'order_status' => $this->getOrderStatusObject($order->status),
            'shipping_address' => [
                'street' => $order->shipping_street,
                'city' => $order->shipping_city,
                'state' => ['name' => $order->shipping_state],
                'country' => $order->country ? ['name' => $order->country->name] : ['name' => $order->shipping_country],
                'pincode' => $order->shipping_postal_code,
                'phone' => $order->shipping_phone,
            ],
              'products' => $order->items->map(function ($item) {
                  $sku = $item->variant?->sku ?? $item->sku ?? $item->product?->sku ?? null;
                  return [
                      'id' => $item->product_id,
                      'name' => $item->product ? $item->product->name : $item->product_name,
                      'sku' => $sku,
                      'product_thumbnail' => $item->product && $item->product->images->first()
                          ? ['original_url' => $item->product->images->first()->image_url]
                          : null,
                      'pivot' => [
                          'quantity' => $item->quantity,
                          'single_price' => $item->price,
                          'subtotal' => $item->price * $item->quantity,
                          'variation' => $item->variant ? [
                              'id' => $item->variant->id,
                              'name' => $item->variant->name ?? $item->product_name,
                              'sku' => $item->variant->sku,
                          ] : null,
                      ],
                    'weight' => $item->product ? $item->product->weight : 0,
                ];
            }),
        ];
    }

    /**
     * Transform order for detail view
     */
    private function transformOrderForDetail($order)
    {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'invoice_number' => 'INV-' . $order->order_number,
            'invoice_url' => '/api/admin/order/' . $order->id . '/invoice',
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
            'status' => $order->status,
            'shipping_status' => $order->status,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'transaction_id' => $order->transaction_id,
            'sales_channel' => $order->sales_channel ?? ($order->channel ?? null),
            'created_by_user_id' => $order->created_by_user_id,
            'created_by_user' => $order->createdByUser ? [
                'id' => $order->createdByUser->id,
                'name' => $order->createdByUser->name,
                'email' => $order->createdByUser->email,
                'role' => $order->createdByUser->role,
            ] : null,
            'amount' => $order->subtotal,
            'subtotal' => $order->subtotal,
            'discount_amount' => $order->discount_amount,
            'gift_box_discount_amount' => $order->gift_box_discount_amount ?? 0,
            'shipping_total' => $order->shipping_amount,
            'tax_total' => $order->tax_amount,
            'total' => $order->total,
            'coupon_code' => $order->coupon_code,
            'coupon_total_discount' => $order->discount_amount,
            'currency' => $order->currency ?? 'AED',
            'tracking_number' => $order->tracking_number,
            'carrier' => $order->carrier,
            'shipping_method' => $order->shipping_method,
            'shipped_at' => $order->shipped_at,
            'delivered_at' => $order->delivered_at,
            'customer_notes' => $order->customer_notes,
            'admin_notes' => $order->admin_notes,
            'is_guest' => $order->is_guest,
            'is_digital_only' => false,
            'consumer' => $order->user ? [
                'id' => $order->user->id,
                'name' => $order->user->name,
                'email' => $order->user->email,
                'phone' => $order->user->phone ?? $order->shipping_phone,
            ] : [
                'id' => null,
                'name' => trim($order->shipping_first_name . ' ' . $order->shipping_last_name),
                'email' => $order->shipping_email,
                'phone' => $order->shipping_phone,
            ],
            'order_status' => $this->getOrderStatusObject($order->status),
            'order_status_activities' => $this->getOrderStatusActivities($order),
            'billing_address' => [
                'first_name' => $order->billing_first_name ?? $order->shipping_first_name,
                'last_name' => $order->billing_last_name ?? $order->shipping_last_name,
                'street' => $order->billing_street ?? $order->shipping_street,
                'apartment' => $order->billing_apartment ?? $order->shipping_apartment,
                'city' => $order->billing_city ?? $order->shipping_city,
                'state' => ['name' => $order->billing_state ?? $order->shipping_state],
                'country' => $order->country ? ['name' => $order->country->name] : ['name' => $order->billing_country ?? $order->shipping_country],
                'pincode' => $order->billing_postal_code ?? $order->shipping_postal_code,
                'phone' => $order->billing_phone ?? $order->shipping_phone,
                'email' => $order->billing_email ?? $order->shipping_email,
            ],
            'shipping_address' => [
                'first_name' => $order->shipping_first_name,
                'last_name' => $order->shipping_last_name,
                'street' => $order->shipping_street,
                'apartment' => $order->shipping_apartment,
                'city' => $order->shipping_city,
                'state' => ['name' => $order->shipping_state],
                'country' => $order->country ? ['name' => $order->country->name] : ['name' => $order->shipping_country],
                'pincode' => $order->shipping_postal_code,
                'phone' => $order->shipping_phone,
                'email' => $order->shipping_email,
            ],
            'products' => $order->items->map(function ($item) {
                $options = is_string($item->options) ? json_decode($item->options, true) : ($item->options ?? []);
                $color = $options['color'] ?? $options['Color'] ?? $options['colour'] ?? $options['Colour'] ?? null;
                $size = $options['size'] ?? $options['Size'] ?? null;
                return [
                    'id' => $item->product_id,
                    'name' => $item->product ? $item->product->name : $item->product_name,
                    'slug' => $item->product ? $item->product->slug : null,
                    'sku' => $item->product ? $item->product->sku : null,
                    'product_thumbnail' => $item->product && $item->product->images->first()
                        ? ['original_url' => $item->product->images->first()->image_url]
                        : null,
                    'color' => $color,
                    'size' => $size,
                    'options' => $options,
                    'pivot' => [
                        'quantity' => $item->quantity,
                        'single_price' => $item->price,
                        'subtotal' => $item->price * $item->quantity,
                        'variation' => $item->variant ? [
                            'id' => $item->variant->id,
                            'name' => $item->variant->name ?? $item->product_name,
                            'sku' => $item->variant->sku,
                        ] : null,
                    ],
                    'weight' => $item->product ? $item->product->weight : 0,
                ];
            }),
            'sub_orders' => [], // For multi-vendor support in future
            'invoice' => $order->invoice ? [
                'id' => $order->invoice->id,
                'invoice_number' => $order->invoice->invoice_number,
                'status' => $order->invoice->status,
                'pdf_path' => $order->invoice->pdf_path,
                'sent_at' => $order->invoice->sent_at,
                'paid_at' => $order->invoice->paid_at,
                'created_at' => $order->invoice->created_at,
            ] : null,
        ];
    }

    /**
     * Get order status as object
     */
    private function getOrderStatusObject($status)
    {
        $statuses = [
            'pending' => ['id' => 1, 'name' => 'Pending', 'slug' => 'pending', 'sequence' => 1],
            'confirmed' => ['id' => 2, 'name' => 'Confirmed', 'slug' => 'confirmed', 'sequence' => 2],
            'processing' => ['id' => 3, 'name' => 'Processing', 'slug' => 'processing', 'sequence' => 3],
            'shipped' => ['id' => 4, 'name' => 'Shipped', 'slug' => 'shipped', 'sequence' => 4],
            'out-for-delivery' => ['id' => 5, 'name' => 'Out For Delivery', 'slug' => 'out-for-delivery', 'sequence' => 5],
            'delivered' => ['id' => 6, 'name' => 'Delivered', 'slug' => 'delivered', 'sequence' => 6],
            'cancelled' => ['id' => 7, 'name' => 'Cancelled', 'slug' => 'cancelled', 'sequence' => 7],
            'refunded' => ['id' => 8, 'name' => 'Refunded', 'slug' => 'refunded', 'sequence' => 8],
        ];

        return $statuses[$status] ?? $statuses['pending'];
    }

    /**
     * Get order status activities for tracking
     */
    private function getOrderStatusActivities($order)
    {
        $activities = [];

        // Add created activity
        $activities[] = [
            'status' => 'Pending',
            'changed_at' => $order->created_at,
        ];

        // Add shipped activity if shipped
        if ($order->shipped_at) {
            $activities[] = [
                'status' => 'Shipped',
                'changed_at' => $order->shipped_at,
            ];
        }

        // Add delivered activity if delivered
        if ($order->delivered_at) {
            $activities[] = [
                'status' => 'Delivered',
                'changed_at' => $order->delivered_at,
            ];
        }

        return $activities;
    }

    private function applyOrderSmartSearch($query, string $search): void
    {
        $search = trim($search);
        if ($search === '') {
            return;
        }

        $normalizedPhone = $this->normalizeUaePhoneCandidate($search);
        if ($normalizedPhone !== null) {
            $query->where('shipping_phone', $normalizedPhone);
            return;
        }

        $tokens = preg_split('/\s+/', $search) ?: [];
        $tokens = array_values(array_filter($tokens, fn ($token) => $token !== ''));

        $identifierTokens = [];
        $textTokens = [];
        $phoneTokens = [];
        $hasTransactionId = Schema::hasColumn('orders', 'transaction_id');

        foreach ($tokens as $token) {
            $normalized = trim($token);
            if ($normalized === '') {
                continue;
            }

            $phoneCandidate = $this->normalizeUaePhoneCandidate($normalized);
            if ($phoneCandidate !== null) {
                $phoneTokens[] = $phoneCandidate;
                continue;
            }

            $hasLetters = preg_match('/[A-Za-z]/', $normalized) === 1;
            $isDigitsOnly = !$hasLetters && ctype_digit($normalized);

            if ($isDigitsOnly && strlen($normalized) >= 6) {
                $identifierTokens[] = $normalized;
                continue;
            }

            $textTokens[] = $normalized;
        }

        foreach ($identifierTokens as $identifier) {
            $query->where(function ($q) use ($identifier, $hasTransactionId) {
                $q->where('tracking_number', $identifier)
                    ->orWhere('tracking_number', 'like', "{$identifier}%")
                    ->orWhere('order_number', $identifier)
                    ->orWhere('order_number', 'like', "{$identifier}%");

                if ($hasTransactionId) {
                    $q->orWhere('transaction_id', $identifier)
                        ->orWhere('transaction_id', 'like', "{$identifier}%");
                }
            });
        }

        foreach ($phoneTokens as $phone) {
            $query->where('shipping_phone', $phone);
        }

        if (!empty($textTokens)) {
            $this->applySmartSearch(
                $query,
                implode(' ', $textTokens),
                [
                    'order_number',
                    'transaction_id',
                    'tracking_number',
                    'shipping_first_name',
                    'shipping_last_name',
                    'shipping_email',
                    'shipping_city',
                    'billing_first_name',
                    'billing_last_name',
                    'billing_email',
                ],
                [
                    'user' => ['name', 'email'],
                    'items' => ['product_name', 'variant_name', 'sku'],
                    'items.product' => ['name', 'sku'],
                    'items.variant' => ['name', 'sku'],
                ],
                []
            );
        }
    }
}
