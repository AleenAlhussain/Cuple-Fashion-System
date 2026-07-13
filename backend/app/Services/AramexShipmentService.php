<?php

namespace App\Services;

use Carbon\Carbon;
use SoapClient;

class AramexShipmentService
{
    private SoapClient $client;

    public function __construct()
    {
        $shippingUrl = (string) config('aramex.shipping_url');
        $wsdl = rtrim($shippingUrl, '/') . '?wsdl';

        logger()->info('Aramex shipment: SoapClient init', [
            'shipping_url' => $shippingUrl,
            'wsdl' => $wsdl,
        ]);

        $this->client = new SoapClient($wsdl, [
            'trace' => true,
            'exceptions' => true,
            'cache_wsdl' => WSDL_CACHE_NONE,
            'connection_timeout' => 20,
            'stream_context' => stream_context_create([
                'http' => ['timeout' => 30],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]),
        ]);
    }

    private function cleanName(?string $first, ?string $last): string
    {
        $name = trim(($first ?? '') . ' ' . ($last ?? ''));
        if ($name === '') {
            return 'Customer';
        }

        // يسمح: حروف انجليزي + عربي (Unicode Arabic block) + مسافات
        $name = preg_replace('/[^\x{0600}-\x{06FF}A-Za-z\s]+/u', '', $name);

        // لو preg_replace رجع null لأي سبب
        if ($name === null) {
            return 'Customer';
        }

        $name = preg_replace('/\s+/u', ' ', trim($name));
        return $name !== '' ? $name : 'Customer';
    }


    private function cleanUaeMobile(?string $raw): string
    {
        $raw = (string) $raw;

        // digits فقط
        $digits = preg_replace('/\D+/', '', $raw);

        // شيل 00971 أو 971
        if (str_starts_with($digits, '00971'))
            $digits = substr($digits, 5);
        if (str_starts_with($digits, '971'))
            $digits = substr($digits, 3);

        // شيل 0 البداية (مثلاً 050...)
        if (str_starts_with($digits, '0'))
            $digits = ltrim($digits, '0');

        // بالنهاية نريد 9 أرقام تبدأ بـ 5 (مثلاً 507824998)
        if (strlen($digits) > 9)
            $digits = substr($digits, -9);

        if (strlen($digits) !== 9 || !str_starts_with($digits, '5')) {
            return '';
        }

        return $digits;
    }

    private function safeCity(?string $city): string
    {
        $city = trim((string) $city);
        return $city !== '' ? $city : 'Dubai';
    }

    /**
     * Create shipment for an order and return raw Aramex response (array)
     */
    public function createShipmentForOrder($order): array
    {
        if (!empty($order->tracking_number)) {
        logger()->info('Aramex shipment: skipped, order already has AWB', [
            'order_id' => $order->id,
            'tracking_number' => $order->tracking_number,
        ]);

        return [
            'HasErrors' => false,
            'Skipped' => true,
            'TrackingNumber' => $order->tracking_number,
        ];
        }
        $clientInfo = [
            'UserName' => (string) config('aramex.username'),
            'Password' => (string) config('aramex.password'),
            'AccountNumber' => (string) config('aramex.account.number'),
            'AccountPin' => (string) config('aramex.account.pin'),
            'AccountEntity' => (string) config('aramex.account.entity'),
            'AccountCountryCode' => (string) config('aramex.account.country_code'),
            'Entity' => (string) config('aramex.account.entity'),
            'Version' => 'v1.0',
        ];

        logger()->info('Aramex shipment: calling CreateShipments', [
            'order_id' => $order->id ?? null,
            'clientinfo_check' => [
                'UserName' => $clientInfo['UserName'] ? 'SET' : 'EMPTY',
                'AccountNumber' => $clientInfo['AccountNumber'] ? 'SET' : 'EMPTY',
                'AccountPin' => $clientInfo['AccountPin'] ? 'SET' : 'EMPTY',
                'AccountEntity' => $clientInfo['AccountEntity'] ? 'SET' : 'EMPTY',
                'AccountCountryCode' => $clientInfo['AccountCountryCode'] ? 'SET' : 'EMPTY',
                'Entity' => $clientInfo['Entity'] ? 'SET' : 'EMPTY',
            ],
        ]);

        // ====== Shipper (Warehouse) ======
        $shipper = [
            'Reference1' => 'Cuple',
            'AccountNumber' => (string) config('aramex.account.number'),
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

        // ====== Consignee (Customer) ======
        $consigneeName = $this->cleanName($order->shipping_first_name ?? null, $order->shipping_last_name ?? null);

        // فون: جرّب shipping_phone ثم billing_phone ثم phone عام
        $rawPhone = $order->shipping_phone ?? $order->billing_phone ?? $order->phone ?? null;
        $consigneePhone = $this->cleanUaeMobile($rawPhone);

        // لو ما في رقم صالح، لا ترسل CreateShipments أصلاً
        if ($consigneePhone === '') {
            logger()->warning('Aramex shipment: missing/invalid consignee phone', [
                'order_id' => $order->id ?? null,
                'raw_phone' => $rawPhone,
            ]);

            return [
                'HasErrors' => true,
                'Notifications' => [
                    'Notification' => [
                        [
                            'Code' => 'LOCAL_VALIDATION',
                            'Message' => 'Consignee phone is missing/invalid (UAE mobile required).',
                        ]
                    ]
                ],
            ];
        }

        $consigneeEmail = (string) ($order->shipping_email ?? $order->billing_email ?? $order->email ?? '');
        if ($consigneeEmail === '')
            $consigneeEmail = 'no-reply@cuple.shop';

        $consigneeLine1 = trim((string) ($order->shipping_street ?? ''));
        if ($consigneeLine1 === '')
            $consigneeLine1 = 'UAE Address';

        $consignee = [
            'Reference1' => (string) ($order->order_number ?? $order->id),
            'Name' => (string) $consigneeName,
            'AccountNumber' => (string) config('aramex.account.number'),
            'AccountEntity' => (string) config('aramex.account.entity'),
            'AccountCountryCode' => (string) config('aramex.account.country_code'),
            'PartyAddress' => [
                'Line1' => $consigneeLine1,
                'Line2' => (string) ($order->shipping_apartment ?? ''),
                'Line3' => '',
                'City' => $this->safeCity($order->shipping_city ?? null),
                'StateOrProvinceCode' => (string) ($order->shipping_state ?? 'Dubai'),
                'PostCode' => (string) ($order->shipping_postal_code ?? ''),
                'CountryCode' => 'AE',
            ],
            'Contact' => [
                'Department' => '',
                'PersonName' => $consigneeName,
                'Title' => '',
                'CompanyName' => (string) $consigneeName,
                'PhoneNumber1' => $consigneePhone,
                'PhoneNumber1Ext' => '',
                'PhoneNumber2' => '',
                'PhoneNumber2Ext' => '',
                'FaxNumber' => '',
                'CellPhone' => $consigneePhone,
                'EmailAddress' => $consigneeEmail,
                'Type' => '',
            ],
        ];

        // ====== Minimal Details (Required) ======
        $pieces = 1;
        $weightKg = 0.5; // لازم يكون > 0

        $currency = 'AED';
        $isCod = in_array((string) ($order->payment_method ?? ''), ['cod', 'cash_on_delivery'], true);

        $shipment = [
            'Reference1' => (string) ($order->order_number ?? $order->id),
            'Reference2' => null,
            'Reference3' => null,

            'Shipper' => $shipper,
            'Consignee' => $consignee,

            'ShippingDateTime' => Carbon::now()->format('Y-m-d\TH:i:sP'),
            'DueDate' => Carbon::now()->addDay()->format('Y-m-d\TH:i:sP'),

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

                'DescriptionOfGoods' => 'Cuple Order',
                'GoodsOriginCountry' => 'AE',
                'NumberOfPieces' => $pieces,

                // شائع للحسابات المحلية - لو رفضه Aramex نغيّره حسب عقدكم
                'ProductGroup' => 'DOM',
                'ProductType' => 'ONP',

                // COD = Collect / غيره = Prepaid
                'PaymentType' => 'P',
                'PaymentOptions' => '',

                // بعض الحسابات تتطلب Services لCOD
                'Services' => $isCod ? 'CODS' : '',

                // مبالغ (تساعد في ERR34 عند كثير حسابات)
                'CashOnDeliveryAmount' => [
                    'Value' => $isCod ? (float) ($order->total ?? 0) : 0,
                    'CurrencyCode' => $currency,
                ],
                'CustomsValueAmount' => [
                    'Value' => (float) ($order->total ?? 0),
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

        logger()->info('Aramex shipment payload check', [
            'order_id' => $order->id ?? null,
            'consignee_name' => data_get($consignee, 'Contact.PersonName'),
            'consignee_phone' => data_get($consignee, 'Contact.PhoneNumber1'),
            'consignee_city' => data_get($consignee, 'PartyAddress.City'),
            'line1' => data_get($consignee, 'PartyAddress.Line1'),
            'payment_type' => data_get($shipment, 'Details.PaymentType'),
            'services' => data_get($shipment, 'Details.Services'),
            'cod_value' => data_get($shipment, 'Details.CashOnDeliveryAmount.Value'),
        ]);

        // ====== Root params ======
        $params = [
            'ClientInfo' => $clientInfo,
            'Transaction' => [
                'Reference1' => 'cuple-create-shipment',
                'Reference2' => null,
                'Reference3' => null,
                'Reference4' => null,
                'Reference5' => null,
            ],
            'Shipments' => [
                'Shipment' => [$shipment],
            ],
            'LabelInfo' => [
                'ReportID' => 9201,
                'ReportType' => 'URL',
            ],
        ];

        $response = $this->client->__soapCall('CreateShipments', [$params]);

        $respArr = json_decode(json_encode($response), true);

        logger()->info('Aramex shipment: response received', [
            'order_id' => $order->id ?? null,
            'has_errors' => data_get($respArr, 'HasErrors'),
            'notifications' => data_get($respArr, 'Notifications'),
            'shipments' => data_get($respArr, 'Shipments'),
            'raw_keys' => array_keys((array) $respArr),
        ]);

        if (data_get($respArr, 'HasErrors')) {
            logger()->info('Aramex SOAP last request', [
                'order_id' => $order->id ?? null,
                'request' => $this->client->__getLastRequest(),
            ]);
            logger()->info('Aramex SOAP last response', [
                'order_id' => $order->id ?? null,
                'response' => $this->client->__getLastResponse(),
            ]);
        }
        $processed = data_get($respArr, 'Shipments.ProcessedShipment');
        if (is_array($processed) && isset($processed[0])) {
        $processed = $processed[0];
        }
        $awb = data_get($processed, 'ID');
        $hasErrors = (bool) data_get($respArr, 'HasErrors');
        $shipmentHasErrors = (bool) data_get($processed, 'HasErrors');
        if (!$hasErrors && !$shipmentHasErrors && $awb) {
            $order->tracking_number = $awb;
            $order->carrier = 'aramex';

            if (!$order->shipped_at) {
                $order->shipped_at = now();
            }

            if (!in_array($order->status, ['shipped', 'out-for-delivery', 'delivered'], true)) {
                $order->status = 'shipped';
            }

            // اختياري: حفظ رابط الليبل لو عندك عمود له
            // $order->aramex_label_url = data_get($processed, 'ShipmentLabel.LabelURL');

            $order->save();

            logger()->info('Aramex shipment: AWB saved to order', [
                'order_id' => $order->id,
                'awb' => $awb,
                'label_url' => data_get($processed, 'ShipmentLabel.LabelURL'),
            ]);
        }

        return $respArr;
    }
}
