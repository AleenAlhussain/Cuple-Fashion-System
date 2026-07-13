<?php

namespace App\Services;

use App\Models\Country;
use App\Models\ReturnRequest;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class AramexReturnService
{
    public function __construct()
    {
        $baseUrl = rtrim((string) config('aramex.base_url'), '/');
        $createPickupUrl = (string) config('aramex.create_pickup_url');
        $resolvedUrl = $this->resolveCreatePickupUrl($baseUrl, $createPickupUrl);

        logger()->info('Aramex return: CreatePickup init', [
            'base_url' => $baseUrl,
            'create_pickup_url' => $resolvedUrl,
        ]);
    }

    public function createReturnForRequest(ReturnRequest $returnRequest): array
    {
        $order = $returnRequest->order;
        if (!$order) {
            return [
                'has_errors' => true,
                'error_message' => 'Order not found for return request.',
            ];
        }

        $resolvedCountryCode = $this->resolveCountryCode($order);
        if ($resolvedCountryCode === '') {
            return [
                'has_errors' => true,
                'error_message' => 'Pickup country code is missing/invalid.',
            ];
        }

        $countryCode = $this->normalizeCountryCode($resolvedCountryCode);
        if ($countryCode === '') {
            return [
                'has_errors' => true,
                'error_message' => 'Pickup country code is missing/invalid.',
            ];
        }

        $isInternational = strtoupper($countryCode) !== 'AE';
        $productGroup = $isInternational ? 'EXP' : 'DOM';
        $productType = 'RTC';
        $paymentType = 'C';
        $paymentOptions = 'ARCC';

        $accountNumber = $this->getReturnAccountNumber();
        $clientInfo = [
            'UserName' => (string) config('aramex.username'),
            'Password' => (string) config('aramex.password'),
            'AccountNumber' => $accountNumber,
            'AccountPin' => (string) config('aramex.account.pin'),
            'AccountEntity' => (string) config('aramex.account.entity'),
            'AccountCountryCode' => (string) config('aramex.account.country_code'),
            'Entity' => (string) config('aramex.account.entity'),
            'Version' => 'v1.0',
        ];

        $shipper = $this->buildCustomerParty($order, $countryCode, $accountNumber);
        if ($shipper['invalid_phone'] ?? false) {
            return [
                'has_errors' => true,
                'error_message' => strtoupper($countryCode) === 'AE'
                    ? 'Invalid pickup contact phone. AE numbers must be 9 digits and start with 5.'
                    : 'Invalid pickup contact phone.',
            ];
        }
        if ($shipper['invalid_city'] ?? false) {
            return [
                'has_errors' => true,
                'error_message' => 'Pickup city is missing/invalid.',
            ];
        }

        $consignee = $this->buildWarehouseParty($accountNumber);

        $pieces = 1;
        $weightKg = 0.5;
        $currency = $order->currency ?: 'AED';

        $transactionRef = (string) ($order->order_number ?? $order->id ?? $returnRequest->id);
        $transaction = [
            'Reference1' => 'cuple-return-cir',
            'Reference2' => 'RR-' . $returnRequest->id,
            'Reference3' => 'ORDER-' . $transactionRef,
            'Reference4' => $isInternational ? 'INTL' : 'LOCAL',
            'Reference5' => 'RETURN',
        ];

        $paramsSnapshot = [
            'product_group' => $productGroup,
            'product_type' => $productType,
            'payment_type' => $paymentType,
            'payment_options' => $paymentOptions,
        ];

        if (!empty($returnRequest->return_awb_number) && !empty($returnRequest->return_pickup_reference)) {
            return [
                'has_errors' => false,
                'awb' => $returnRequest->return_awb_number,
                'label_url' => $returnRequest->return_label_url,
                'pickup_reference' => $returnRequest->return_pickup_reference,
                'pickup_date' => $returnRequest->return_pickup_date,
                'params' => $returnRequest->return_params ?? $paramsSnapshot,
                'is_international' => (bool) $returnRequest->return_is_international,
                'error_message' => null,
                'raw' => [
                    'shipment' => null,
                    'pickup' => null,
                ],
                'notifications' => [],
            ];
        }

        $shipmentResult = $this->createReturnShipment(
            $returnRequest,
            $clientInfo,
            $transaction,
            $shipper['party'],
            $consignee,
            $countryCode,
            $productGroup,
            $productType,
            $paymentType,
            $paymentOptions,
            $pieces,
            $weightKg,
            $currency
        );

        if ($shipmentResult['has_errors'] || empty($shipmentResult['awb'])) {
            return $shipmentResult;
        }

        $pickupResult = $this->createReturnPickup(
            $returnRequest,
            $order,
            $clientInfo,
            $transaction,
            $shipper['party'],
            $productGroup,
            $productType,
            $paymentType,
            $pieces,
            (string) $shipmentResult['awb'],
            (string) ($clientInfo['AccountEntity'] ?? 'DXB')
        );

        return [
            'has_errors' => $pickupResult['has_errors'] ?? false,
            'awb' => $shipmentResult['awb'] ?? null,
            'label_url' => $shipmentResult['label_url'] ?? null,
            'pickup_reference' => $pickupResult['pickup_reference'] ?? null,
            'pickup_date' => $pickupResult['pickup_date'] ?? null,
            'params' => $paramsSnapshot,
            'is_international' => $isInternational,
            'error_message' => $pickupResult['has_errors'] ? ($pickupResult['error_message'] ?? null) : null,
            'raw' => [
                'shipment' => $shipmentResult['raw'] ?? null,
                'pickup' => $pickupResult['raw'] ?? null,
            ],
            'notifications' => $pickupResult['notifications'] ?? ($shipmentResult['notifications'] ?? []),
        ];

        
    }

    public function schedulePickupForRequest(ReturnRequest $returnRequest): array
    {
        $order = $returnRequest->order;
        if (!$order) {
            return [
                'has_errors' => true,
                'error_message' => 'Order not found for return request.',
            ];
        }

        if (empty($returnRequest->return_awb_number)) {
            return [
                'has_errors' => true,
                'error_message' => 'Create AWB first.',
            ];
        }

        $resolvedCountryCode = $this->resolveCountryCode($order);
        if ($resolvedCountryCode === '') {
            return [
                'has_errors' => true,
                'error_message' => 'Pickup country code is missing/invalid.',
            ];
        }

        $countryCode = $this->normalizeCountryCode($resolvedCountryCode);
        if ($countryCode === '') {
            return [
                'has_errors' => true,
                'error_message' => 'Pickup country code is missing/invalid.',
            ];
        }

        $isInternational = strtoupper($countryCode) !== 'AE';
        $productGroup = $isInternational ? 'EXP' : 'DOM';
        $productType = 'RTC';
        $paymentType = 'C';
        $paymentOptions = 'ARCC';

        $accountNumber = $this->getReturnAccountNumber();
        $clientInfo = [
            'UserName' => (string) config('aramex.username'),
            'Password' => (string) config('aramex.password'),
            'AccountNumber' => $accountNumber,
            'AccountPin' => (string) config('aramex.account.pin'),
            'AccountEntity' => (string) config('aramex.account.entity'),
            'AccountCountryCode' => (string) config('aramex.account.country_code'),
            'Entity' => (string) config('aramex.account.entity'),
            'Version' => 'v1.0',
        ];

        $shipper = $this->buildCustomerParty($order, $countryCode, $accountNumber);
        if ($shipper['invalid_phone'] ?? false) {
            return [
                'has_errors' => true,
                'error_message' => strtoupper($countryCode) === 'AE'
                    ? 'Invalid pickup contact phone. AE numbers must be 9 digits and start with 5.'
                    : 'Invalid pickup contact phone.',
            ];
        }
        if ($shipper['invalid_city'] ?? false) {
            return [
                'has_errors' => true,
                'error_message' => 'Pickup city is missing/invalid.',
            ];
        }

        $transactionRef = (string) ($order->order_number ?? $order->id ?? $returnRequest->id);
        $transaction = [
            'Reference1' => 'cuple-return-cir',
            'Reference2' => 'RR-' . $returnRequest->id,
            'Reference3' => 'ORDER-' . $transactionRef,
            'Reference4' => $isInternational ? 'INTL' : 'LOCAL',
            'Reference5' => 'RETURN',
        ];

        $pieces = 1;

        $pickupResult = $this->createReturnPickup(
            $returnRequest,
            $order,
            $clientInfo,
            $transaction,
            $shipper['party'],
            $productGroup,
            $productType,
            $paymentType,
            $pieces,
            (string) $returnRequest->return_awb_number,
            (string) ($clientInfo['AccountEntity'] ?? 'DXB')
        );

        return [
            'has_errors' => $pickupResult['has_errors'] ?? false,
            'awb' => $returnRequest->return_awb_number,
            'label_url' => $returnRequest->return_label_url,
            'pickup_reference' => $pickupResult['pickup_reference'] ?? null,
            'pickup_date' => $pickupResult['pickup_date'] ?? null,
            'params' => [
                'product_group' => $productGroup,
                'product_type' => $productType,
                'payment_type' => $paymentType,
                'payment_options' => $paymentOptions,
            ],
            'is_international' => $isInternational,
            'error_message' => $pickupResult['has_errors'] ? ($pickupResult['error_message'] ?? null) : null,
            'raw' => [
                'shipment' => null,
                'pickup' => $pickupResult['raw'] ?? null,
            ],
            'notifications' => $pickupResult['notifications'] ?? [],
        ];
    }

    private function buildCustomerParty($order, string $countryCode, string $accountNumber): array
    {
        $countryCode = $this->normalizeCountryCode($countryCode);
        $name = $this->cleanName($order->shipping_first_name ?? null, $order->shipping_last_name ?? null);
        $rawPhone = $order->shipping_phone ?? $order->billing_phone ?? $order->phone ?? null;
        $phone = $this->cleanPhone($rawPhone, $countryCode);

        $email = (string) ($order->shipping_email ?? $order->billing_email ?? $order->email ?? '');
        if ($email === '') {
            $email = 'no-reply@cuple.shop';
        }

        $line1 = trim((string) ($order->shipping_street ?? ''));
        if ($line1 === '') {
            $line1 = 'Customer Address';
        }

        $city = trim((string) ($order->shipping_city ?? ''));
        $party = [
            'Reference1' => (string) ($order->order_number ?? $order->id),
            'AccountNumber' => $accountNumber,
            'PartyAddress' => [
                'Line1' => $line1,
                'Line2' => (string) ($order->shipping_apartment ?? ''),
                'Line3' => '',
                'City' => $city,
                'StateOrProvinceCode' => (string) ($order->shipping_state ?? ''),
                'PostCode' => (string) ($order->shipping_postal_code ?? ''),
                'CountryCode' => $countryCode ?: 'AE',
            ],
            'Contact' => [
                'Department' => '',
                'PersonName' => $name,
                'Title' => '',
                'CompanyName' => $name,
                'PhoneNumber1' => $phone,
                'PhoneNumber1Ext' => '',
                'PhoneNumber2' => '',
                'PhoneNumber2Ext' => '',
                'FaxNumber' => '',
                'CellPhone' => $phone,
                'EmailAddress' => $email,
                'Type' => '',
            ],
        ];

        return [
            'party' => $party,
            'invalid_phone' => $phone === '',
            'invalid_city' => $city === '',
        ];
    }

    private function buildWarehouseParty(string $accountNumber): array
    {
        return [
            'Reference1' => 'Cuple',
            'AccountNumber' => $accountNumber,
            'PartyAddress' => [
                'Line1' => 'Cuple Warehouse',
                'Line2' => '',
                'Line3' => '',
                'City' => 'Dubai',
                'StateOrProvinceCode' => 'Dubai',
                'PostCode' => '',
                'CountryCode' => 'AE',
            ],
            'Contact' => [
                'Department' => '',
                'PersonName' => 'Cuple Support',
                'Title' => '',
                'CompanyName' => 'Cuple',
                'PhoneNumber1' => '507824998',
                'PhoneNumber1Ext' => '',
                'PhoneNumber2' => '',
                'PhoneNumber2Ext' => '',
                'FaxNumber' => '',
                'CellPhone' => '507824998',
                'EmailAddress' => 'support@cuple.shop',
                'Type' => '',
            ],
        ];
    }

    private function cleanName(?string $first, ?string $last): string
    {
        $name = trim(($first ?? '') . ' ' . ($last ?? ''));
        if ($name === '') {
            return 'Customer';
        }

        $name = preg_replace('/[^\x{0600}-\x{06FF}A-Za-z\s]+/u', '', $name);
        if ($name === null) {
            return 'Customer';
        }

        $name = preg_replace('/\s+/u', ' ', trim($name));
        return $name !== '' ? $name : 'Customer';
    }

    private function cleanPhone(?string $raw, string $countryCode): string
    {
        $digits = preg_replace('/\D+/', '', (string) $raw);
        if ($digits === '') {
            return '';
        }

        if (strtoupper($countryCode) === 'AE') {
            return $this->cleanUaeMobile($digits);
        }

        if (strlen($digits) > 15) {
            $digits = substr($digits, -15);
        }

        return strlen($digits) >= 6 ? $digits : '';
    }

    private function cleanUaeMobile(string $digits): string
    {
        if (str_starts_with($digits, '00971')) {
            $digits = substr($digits, 5);
        }
        if (str_starts_with($digits, '971')) {
            $digits = substr($digits, 3);
        }
        if (str_starts_with($digits, '0')) {
            $digits = ltrim($digits, '0');
        }
        if (strlen($digits) > 9) {
            $digits = substr($digits, -9);
        }
        if (strlen($digits) !== 9 || !str_starts_with($digits, '5')) {
            return '';
        }

        return $digits;
    }

    private function resolveCountryCode($order): string
    {
        $code = strtoupper((string) ($order->country?->code ?? ''));
        if ($code !== '') {
            return $code;
        }

        $name = trim((string) ($order->shipping_country ?? ''));
        if ($name !== '') {
            $country = Country::where('name', $name)->first();
            if ($country?->code) {
                return strtoupper($country->code);
            }
        }

        if (stripos($name, 'united arab emirates') !== false || stripos($name, 'uae') !== false) {
            return 'AE';
        }

        return '';
    }

    private function normalizeCountryCode(string $code): string
    {
        $code = strtoupper(trim($code));
        if ($code === '') {
            return '';
        }
        if (strlen($code) === 2) {
            return $code;
        }

        if (stripos($code, 'UNITED ARAB EMIRATES') !== false || stripos($code, 'UAE') !== false) {
            return 'AE';
        }

        return '';
    }

    private function resolveCreatePickupUrl(string $baseUrl, string $overrideUrl): string
    {
        if ($overrideUrl !== '') {
            return $overrideUrl;
        }

        return rtrim($baseUrl, '/') . '/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreatePickup';
    }

    private function resolveCreateShipmentsUrl(string $baseUrl): string
    {
        return rtrim($baseUrl, '/') . '/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreateShipments';
    }

    private function createReturnShipment(
        ReturnRequest $returnRequest,
        array $clientInfo,
        array $transaction,
        array $shipper,
        array $consignee,
        string $countryCode,
        string $productGroup,
        string $productType,
        string $paymentType,
        string $paymentOptions,
        int $pieces,
        float $weightKg,
        string $currency
    ): array {
        if (!empty($returnRequest->return_awb_number)) {
            return [
                'has_errors' => false,
                'awb' => $returnRequest->return_awb_number,
                'label_url' => $returnRequest->return_label_url,
                'raw' => null,
            ];
        }

        $shipment = [
            'Reference1' => 'RETURN-' . ($returnRequest->order?->order_number ?? $returnRequest->order?->id ?? $returnRequest->id),
            'Reference2' => 'RR-' . $returnRequest->id,
            'Shipper' => $shipper,
            'Consignee' => $consignee,
            'ShippingDateTime' => $this->toWcfDate(Carbon::now()),
            'DueDate' => $this->toWcfDate(Carbon::now()->addDay()),
            'Details' => [
                'Dimensions' => [
                    'Length' => 10,
                    'Width' => 10,
                    'Height' => 10,
                    'Unit' => 'cm',
                ],
                'ActualWeight' => [
                    'Value' => $weightKg,
                    'Unit' => 'Kg',
                ],
                'ChargeableWeight' => [
                    'Value' => $weightKg,
                    'Unit' => 'Kg',
                ],
                'DescriptionOfGoods' => 'Return to warehouse',
                'GoodsOriginCountry' => $countryCode ?: 'AE',
                'NumberOfPieces' => $pieces,
                'ProductGroup' => $productGroup,
                'ProductType' => $productType,
                'PaymentType' => $paymentType,
                'PaymentOptions' => $paymentOptions,
                'CustomsValueAmount' => [
                    'Value' => (float) ($returnRequest->order?->total ?? 0),
                    'CurrencyCode' => $currency,
                ],
                'InsuranceAmount' => [
                    'Value' => 0,
                    'CurrencyCode' => $currency,
                ],
                'Items' => [
                    'ShipmentItem' => [
                        [
                            'PackageType' => 'Box',
                            'Quantity' => $pieces,
                            'Weight' => [
                                'Value' => $weightKg,
                                'Unit' => 'Kg',
                            ],
                            'Comments' => '',
                            'Reference' => '',
                        ],
                    ],
                ],
            ],
        ];

        $params = [
            'ClientInfo' => $clientInfo,
            'Transaction' => $transaction,
            'Shipments' => [$shipment],
            'LabelInfo' => [
                'ReportID' => 9201,
                'ReportType' => 'URL',
            ],
        ];

        try {
            logger()->info('Aramex return: create shipment request', [
                'return_request_id' => $returnRequest->id,
                'transaction' => $transaction,
                'shipment' => $shipment,
            ]);

            $baseUrl = rtrim((string) config('aramex.base_url'), '/');
            $url = $this->resolveCreateShipmentsUrl($baseUrl);

            logger()->info('Aramex return: CreateShipments URL', [
                'return_request_id' => $returnRequest->id,
                'url' => $url,
                'dates' => [
                    'ShippingDateTime' => data_get($shipment, 'ShippingDateTime'),
                    'DueDate' => data_get($shipment, 'DueDate'),
                ],
            ]);

            $payload = $this->encodeJson($params);
            if ($payload === null) {
                return [
                    'has_errors' => true,
                    'error_message' => 'Failed to serialize CreateShipments payload.',
                ];
            }

            $response = Http::timeout(30)
                ->acceptJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->withBody($payload, 'application/json')
                ->post($url);

            if (!$response->successful()) {
                $respArr = $response->json();
                if (!is_array($respArr)) {
                    $respArr = ['body' => $response->body()];
                }
                $notificationsRaw = data_get($respArr, 'Notifications', []);
                logger()->warning('Aramex return: CreateShipments failed', [
                    'return_request_id' => $returnRequest->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'notifications' => $notificationsRaw,
                ]);
                return [
                    'has_errors' => true,
                    'error_message' => $response->json('Message') ?? $response->body(),
                    'raw' => $respArr,
                    'notifications' => $notificationsRaw,
                ];
            }

            $respArr = $response->json();
            if (!is_array($respArr)) {
                $respArr = [];
            }
        } catch (\Throwable $e) {
            logger()->warning('Aramex return: CreateShipments exception', [
                'return_request_id' => $returnRequest->id,
                'message' => $e->getMessage(),
            ]);
            return [
                'has_errors' => true,
                'error_message' => $e->getMessage(),
            ];
        }

        $hasErrors = (bool) data_get($respArr, 'HasErrors');
        $processed = $this->extractProcessedShipment($respArr);
        $shipmentHasErrors = data_get($processed, 'HasErrors');
        $awb = data_get($processed, 'ID')
            ?? data_get($processed, 'ShipmentNumber')
            ?? data_get($processed, 'ShipmentID');
        $labelUrl = data_get($processed, 'ShipmentLabel.LabelURL')
            ?? data_get($respArr, 'ShipmentLabel.LabelURL');
        $notificationsRaw = data_get($respArr, 'Notifications', []);

        $finalHasErrors = false;
        if ($hasErrors && $shipmentHasErrors !== false) {
            $finalHasErrors = true;
        }
        if (!$awb) {
            $finalHasErrors = true;
        }

        if ($finalHasErrors) {
            logger()->warning('Aramex return: CreateShipments failed', [
                'return_request_id' => $returnRequest->id,
                'has_errors' => $hasErrors,
                'shipment_has_errors' => $shipmentHasErrors,
                'notifications' => $notificationsRaw,
                'response' => $respArr,
            ]);
        } else {
            logger()->info('Aramex return: CreateShipments success', [
                'return_request_id' => $returnRequest->id,
                'awb' => $awb,
                'label_url' => $labelUrl,
            ]);
        }

        return [
            'has_errors' => $finalHasErrors,
            'awb' => $awb,
            'label_url' => $labelUrl,
            'error_message' => $finalHasErrors ? $this->extractErrorMessage($respArr) : null,
            'raw' => $respArr,
            'notifications' => $notificationsRaw,
        ];
    }

    private function createReturnPickup(
        ReturnRequest $returnRequest,
        $order,
        array $clientInfo,
        array $transaction,
        array $shipper,
        string $productGroup,
        string $productType,
        string $paymentType,
        int $pieces,
        string $awb,
        string $originEntity
    ): array {
        if (trim($awb) === '') {
            return [
                'has_errors' => true,
                'error_message' => 'Missing return AWB for pickup.',
            ];
        }

        $pickupDate = Carbon::now()->addDay()->startOfDay();
        $maxAttempts = (int) (config('aramex.pickup_retry_attempts') ?? 5);
        if ($maxAttempts <= 0) {
            $maxAttempts = 5;
        }

        $baseUrl = rtrim((string) config('aramex.base_url'), '/');
        $createPickupUrl = (string) config('aramex.create_pickup_url');
        $url = $this->resolveCreatePickupUrl($baseUrl, $createPickupUrl);

        $attempt = 0;
        while ($attempt < $maxAttempts) {
            $attempt++;
            $pickup = $this->buildPickupPayload(
                $returnRequest,
                $order,
                $shipper,
                $productGroup,
                $productType,
                $paymentType,
                $pieces,
                $awb,
                $originEntity,
                $pickupDate
            );

            $params = [
                'ClientInfo' => $clientInfo,
                'Transaction' => $transaction,
                'Pickup' => $pickup,
            ];

            try {
                logger()->info('Aramex return: create pickup request', [
                    'return_request_id' => $returnRequest->id,
                    'url' => $url,
                    'attempt' => $attempt,
                    'candidate_pickup_date' => $pickupDate->toDateString(),
                    'country_code' => data_get($pickup, 'PickupAddress.CountryCode'),
                    'pickup_items' => data_get($pickup, 'PickupItems'),
                    'timestamps' => [
                        'PickupDate' => data_get($pickup, 'PickupDate'),
                        'ReadyTime' => data_get($pickup, 'ReadyTime'),
                        'LastPickupTime' => data_get($pickup, 'LastPickupTime'),
                        'ClosingTime' => data_get($pickup, 'ClosingTime'),
                    ],
                ]);

                $payload = $this->encodeJson($params);
                if ($payload === null) {
                    return [
                        'has_errors' => true,
                        'error_message' => 'Failed to serialize CreatePickup payload.',
                    ];
                }

                $response = Http::timeout(30)
                    ->acceptJson()
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                    ])
                    ->withBody($payload, 'application/json')
                    ->post($url);

                if (!$response->successful()) {
                    $respArr = $response->json();
                    if (!is_array($respArr)) {
                        $respArr = ['body' => $response->body()];
                    }
                    $notificationsRaw = data_get($respArr, 'Notifications', []);
                    logger()->warning('Aramex return: CreatePickup failed', [
                        'return_request_id' => $returnRequest->id,
                        'attempt' => $attempt,
                        'status' => $response->status(),
                        'body' => $response->body(),
                        'notifications' => $notificationsRaw,
                    ]);
                    return [
                        'has_errors' => true,
                        'error_message' => $response->json('Message') ?? $response->body(),
                        'raw' => $respArr,
                        'notifications' => $notificationsRaw,
                    ];
                }

                $respArr = $response->json();
                if (!is_array($respArr)) {
                    $respArr = [];
                }
            } catch (\Throwable $e) {
                logger()->warning('Aramex return: CreatePickup exception', [
                    'return_request_id' => $returnRequest->id,
                    'attempt' => $attempt,
                    'message' => $e->getMessage(),
                ]);
                return [
                    'has_errors' => true,
                    'error_message' => $e->getMessage(),
                    'raw' => null,
                    'notifications' => [],
                ];
            }

            $hasErrors = (bool) data_get($respArr, 'HasErrors');
            $pickupReference = $this->extractPickupReference($respArr);
            $notificationsRaw = data_get($respArr, 'Notifications', []);
            $notifications = $this->normalizeNotifications($notificationsRaw);
            $hasErr77 = $this->hasNotificationCode($notifications, 'ERR77');

            logger()->info('Aramex return: CreatePickup attempt result', [
                'return_request_id' => $returnRequest->id,
                'attempt' => $attempt,
                'candidate_pickup_date' => $pickupDate->toDateString(),
                'has_errors' => $hasErrors,
                'notifications' => $notificationsRaw,
                'pickup_reference' => $pickupReference,
            ]);

            if (!$hasErrors && $this->isValidPickupReference($pickupReference)) {
                return [
                    'has_errors' => false,
                    'pickup_reference' => $pickupReference,
                    'pickup_date' => $pickupDate->toDateString(),
                    'error_message' => null,
                    'raw' => $respArr,
                    'notifications' => $notificationsRaw,
                ];
            }

            if ($hasErrors && $hasErr77) {
                $pickupDate = $pickupDate->copy()->addDay()->startOfDay();
                continue;
            }

            logger()->warning('Aramex return: CreatePickup response has errors', [
                'return_request_id' => $returnRequest->id,
                'attempt' => $attempt,
                'has_errors' => $hasErrors,
                'notifications' => $notificationsRaw,
                'response' => $respArr,
            ]);

            if ($hasErrors && empty($notificationsRaw)) {
                logger()->warning('Aramex return: CreatePickup has errors but no notifications', [
                    'return_request_id' => $returnRequest->id,
                    'attempt' => $attempt,
                    'response_snippet' => substr((string) json_encode($respArr), 0, 500),
                ]);
            }

            return [
                'has_errors' => true,
                'pickup_reference' => $pickupReference,
                'error_message' => $hasErrors ? $this->extractErrorMessage($respArr) : 'Pickup reference missing/invalid.',
                'raw' => $respArr,
                'notifications' => $notificationsRaw,
            ];
        }

        logger()->warning('Aramex return: pickup_schedule_failed_after_retries', [
            'return_request_id' => $returnRequest->id,
            'attempts' => $maxAttempts,
        ]);

        return [
            'has_errors' => true,
            'error_message' => 'Failed to schedule return pickup after retries.',
            'raw' => null,
            'notifications' => [],
        ];
    }

    private function getReturnAccountNumber(): string
    {
        $values = $this->parseJson(Setting::get('values', '{}'));
        $refundSettings = $values['refund'] ?? [];
        $settingValue = $refundSettings['aramex_return_account_number'] ?? null;

        if (is_string($settingValue) && trim($settingValue) !== '') {
            return trim($settingValue);
        }

        $configReturn = (string) config('aramex.return_account_number');
        if (trim($configReturn) !== '') {
            return trim($configReturn);
        }

        return (string) config('aramex.account.number');
    }

    private function parseJson(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return [];
            }
            $decoded = json_decode($trimmed, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function extractProcessedShipment(array $respArr): array
    {
        $processed = data_get($respArr, 'Shipment')
            ?? data_get($respArr, 'ProcessedShipment')
            ?? data_get($respArr, 'Shipments.ProcessedShipment')
            ?? data_get($respArr, 'Shipments')
            ?? data_get($respArr, 'ProcessedShipments');

        if (is_array($processed) && isset($processed[0])) {
            return $processed[0];
        }

        return is_array($processed) ? $processed : [];
    }

    private function extractPickupReference(array $respArr): ?string
    {
        $reference = data_get($respArr, 'Pickup.GUID')
            ?? data_get($respArr, 'Pickup.ID')
            ?? data_get($respArr, 'ProcessedPickup.GUID')
            ?? data_get($respArr, 'ProcessedPickup.ID')
            ?? data_get($respArr, 'PickupReference');

        return $reference ? (string) $reference : null;
    }

    private function extractErrorMessage(array $respArr): ?string
    {
        $notifications = data_get($respArr, 'Notifications.Notification');
        if (is_array($notifications) && isset($notifications[0]['Message'])) {
            return (string) $notifications[0]['Message'];
        }
        if (is_array($notifications) && isset($notifications['Message'])) {
            return (string) $notifications['Message'];
        }

        return null;
    }

    private function toWcfDate(Carbon $date): string
    {
        return '/Date(' . ($date->getTimestamp() * 1000) . ')/';
    }

    private function encodeJson(array $payload): ?string
    {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return null;
        }

        return $json;
    }

    private function buildPickupPayload(
        ReturnRequest $returnRequest,
        $order,
        array $shipper,
        string $productGroup,
        string $productType,
        string $paymentType,
        int $pieces,
        string $awb,
        string $originEntity,
        Carbon $pickupDate
    ): array {
        $readyTime = $pickupDate->copy()->setTime(10, 0);
        $lastPickupTime = $pickupDate->copy()->setTime(18, 0);

        return [
            'Reference1' => 'RR-' . $returnRequest->id,
            'Reference2' => $order->order_number ?? (string) $order->id,
            'PickupLocation' => 'Customer Address',
            'PickupDate' => $this->toWcfDate($pickupDate),
            'ReadyTime' => $this->toWcfDate($readyTime),
            'LastPickupTime' => $this->toWcfDate($lastPickupTime),
            'ClosingTime' => $this->toWcfDate($lastPickupTime),
            'Status' => 'Ready',
            'Comments' => 'Return pickup - RR-' . $returnRequest->id . ' - Order-' . ($order->order_number ?? $order->id),
            'Vehicle' => null,
            'ExistingShipments' => [
                [
                    'Number' => $awb,
                    'OriginEntity' => $originEntity !== '' ? $originEntity : 'DXB',
                    'ProductGroup' => $productGroup,
                ],
            ],
            'PickupAddress' => $shipper['PartyAddress'],
            'PickupContact' => $shipper['Contact'],
            'PickupItems' => [
                [
                    'ProductGroup' => $productGroup,
                    'ProductType' => $productType,
                    'NumberOfPieces' => $pieces,
                    'NumberOfShipments' => 1,
                    'PackageType' => 'Box',
                    'Payment' => $paymentType,
                    'ShipmentWeight' => null,
                    'ShipmentVolume' => null,
                    'ShipmentDimensions' => null,
                    'CashAmount' => null,
                    'ExtraCharges' => null,
                    'Comments' => 'Return pickup',
                ],
            ],
        ];
    }

    private function normalizeNotifications($notifications): array
    {
        if (is_array($notifications) && isset($notifications['Notification'])) {
            $notifications = $notifications['Notification'];
        }

        if (is_array($notifications) && isset($notifications[0])) {
            return array_map(function ($item) {
                return [
                    'Code' => $item['Code'] ?? null,
                    'Message' => $item['Message'] ?? null,
                ];
            }, $notifications);
        }

        if (is_array($notifications)) {
            return [[
                'Code' => $notifications['Code'] ?? null,
                'Message' => $notifications['Message'] ?? null,
            ]];
        }

        return [];
    }

    private function hasNotificationCode(array $notifications, string $code): bool
    {
        foreach ($notifications as $notification) {
            if (isset($notification['Code']) && strtoupper((string) $notification['Code']) === strtoupper($code)) {
                return true;
            }
        }

        return false;
    }

    private function isValidPickupReference(?string $reference): bool
    {
        if ($reference === null) {
            return false;
        }

        $trimmed = trim($reference);
        if ($trimmed === '') {
            return false;
        }

        $normalized = preg_replace('/[^0-9A-Za-z]/', '', $trimmed);
        if ($normalized === '') {
            return false;
        }

        return !preg_match('/^0+$/', $normalized);
    }
}
