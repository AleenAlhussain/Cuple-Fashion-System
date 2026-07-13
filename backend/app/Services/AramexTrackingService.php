<?php

namespace App\Services;

use SoapClient;

class AramexTrackingService
{
    private ?SoapClient $client = null;

    private function getClient(): SoapClient
    {
        if ($this->client === null) {
            if (!class_exists('SoapClient')) {
                throw new \RuntimeException('The PHP SOAP extension is required. Enable extension=soap in php.ini.');
            }

            $wsdl = rtrim((string) config('aramex.tracking_url'), '/') . '?wsdl';

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

        return $this->client;
    }

    public function track(array $awbs, bool $lastUpdateOnly = false): array
    {
        $awbs = array_values(array_filter(array_map('trim', $awbs)));
        if (count($awbs) === 0) {
            return [
                'HasErrors' => true,
                'Notifications' => [
                    'Notification' => [
                        ['Code' => 'LOCAL_VALIDATION', 'Message' => 'awb is required'],
                    ],
                ],
            ];
        }

        $payload = [
            'ClientInfo' => [
                'UserName' => (string) config('aramex.username'), // ✅ صحيح
                'Password' => (string) config('aramex.password'),
                'AccountNumber' => (string) config('aramex.account.number'),
                'AccountPin' => (string) config('aramex.account.pin'),
                'AccountEntity' => (string) config('aramex.account.entity'),
                'AccountCountryCode' => (string) config('aramex.account.country_code'),
                'Entity' => (string) config('aramex.account.entity'),
                'Version' => 'v1.0',
            ],
            'Transaction' => [
                'Reference1' => 'cuple-track',
            ],
            // ✅ مهم جدًا: الشكل الصحيح للـ tracking
            'Shipments' => ['string' => $awbs],
            'GetLastTrackingUpdateOnly' => $lastUpdateOnly,
        ];

        try {
            $res = $this->getClient()->__soapCall('TrackShipments', [$payload]);
            return json_decode(json_encode($res), true);
        } catch (\Throwable $e) {
            return [
                'HasErrors' => true,
                'Notifications' => [
                    'Notification' => [
                        ['Code' => 'EXCEPTION', 'Message' => $e->getMessage()],
                    ],
                ],
            ];
        }
    }
}
