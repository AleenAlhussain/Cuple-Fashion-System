<?php

namespace App\Http\Controllers\Api;

use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeoController extends BaseController
{
    public function reverse(Request $request)
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'lang' => 'nullable|in:ar,en',
        ]);

        $lang = $validated['lang'] ?? $this->resolveLanguage($request);
        $endpoint = config('services.geo.reverse_url', 'https://nominatim.openstreetmap.org/reverse');
        $timeout = (int) config('services.geo.timeout', 10);

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders([
                    'User-Agent' => config('services.geo.user_agent', 'CupleShop/1.0 (support@cuple.shop)'),
                    'Referer' => config('services.geo.referer', config('app.url')),
                ])
                ->get($endpoint, [
                    'format' => 'jsonv2',
                    'lat' => $validated['lat'],
                    'lon' => $validated['lng'],
                    'addressdetails' => 1,
                    'accept-language' => $lang,
                    'email' => config('services.geo.email', 'support@cuple.shop'),
                ]);
        } catch (ConnectionException $exception) {
            return $this->error('Unable to resolve the location. Please try again later.', 503);
        } catch (RequestException $exception) {
            return $this->error('Unable to resolve the location. Please try again later.', 503);
        } catch (\Throwable $exception) {
            return $this->error('Unable to resolve the location. Please try again later.', 503);
        }

        if ($response->failed()) {
            return $this->error('Unable to resolve the location. Please try again later.', 503);
        }

        $payload = $response->json();
        $address = is_array($payload['address'] ?? null) ? $payload['address'] : [];
        $displayName = trim((string) ($payload['display_name'] ?? ''));

        $countryCode = $this->resolveCountryCode(
            $address['country_code'] ?? '',
            $address['country'] ?? ''
        );
        $country = $countryCode
            ? Country::whereRaw('LOWER(code) = ?', [$countryCode])->first()
            : null;

        $stateName = $this->firstNonEmpty([
            $address['state'] ?? '',
            $address['region'] ?? '',
            $address['province'] ?? '',
            $address['state_district'] ?? '',
            $address['county'] ?? '',
            $address['municipality'] ?? '',
        ]);

        $cityName = $this->firstNonEmpty([
            $address['city'] ?? '',
            $address['town'] ?? '',
            $address['village'] ?? '',
            $address['municipality'] ?? '',
            $address['suburb'] ?? '',
            $address['neighbourhood'] ?? '',
            $address['locality'] ?? '',
            $address['county'] ?? '',
        ]);

        $streetAddress = $this->buildStreetAddress($address, $displayName);
        $normalizedStateName = $this->resolveStateAlias($stateName);

        $state = null;
        if ($country && $normalizedStateName !== '') {
            $state = State::where('country_id', $country->id)
                ->whereRaw('LOWER(name) = ?', [$this->normalize($normalizedStateName)])
                ->first();
        }

        $city = null;
        if ($state && $cityName !== '') {
            $city = City::where('state_id', $state->id)
                ->whereRaw('LOWER(name) = ?', [$this->normalize($cityName)])
                ->first();
        }

        $resolvedStateName = $state?->name ?: $stateName;
        $resolvedCityName = $city?->name ?: $cityName;

        $result = [
            'country' => $country?->name ?: ($address['country'] ?? null),
            'country_code' => $countryCode ? strtoupper($countryCode) : null,
            'state' => $resolvedStateName ?: null,
            'city' => $resolvedCityName ?: null,
            'address' => $streetAddress,
            'formatted_address' => $displayName ?: null,
            'lat' => (float) $validated['lat'],
            'lng' => (float) $validated['lng'],
        ];

        if ($country) {
            $result['country_id'] = $country->id;
        }

        if ($state) {
            $result['state_id'] = $state->id;
        }
        if ($resolvedStateName) {
            $result['state_name'] = $resolvedStateName;
        }

        if ($city) {
            $result['city_id'] = $city->id;
        }
        if ($resolvedCityName) {
            $result['city_name'] = $resolvedCityName;
        }

        return $this->success($result);
    }

    private function resolveLanguage(Request $request): string
    {
        $requested = strtolower((string) $request->header('X-Locale', $request->header('Accept-Language', 'en')));
        return str_starts_with($requested, 'ar') ? 'ar' : 'en';
    }

    private function resolveCountryCode(?string $countryCode, ?string $countryName): string
    {
        $code = strtoupper(trim((string) $countryCode));
        if ($code !== '') {
            return $this->normalize($code);
        }

        $normalizedName = $this->normalize($countryName);
        $aliases = [
            'ae' => ['uae', 'united arab emirates', 'الإمارات العربية المتحدة', 'الامارات العربية المتحدة', 'الإمارات', 'الامارات'],
            'sa' => ['saudi arabia', 'ksa', 'المملكة العربية السعودية', 'السعودية'],
            'kw' => ['kuwait', 'الكويت'],
            'qa' => ['qatar', 'قطر'],
            'bh' => ['bahrain', 'البحرين'],
            'om' => ['oman', 'عمان'],
        ];

        foreach ($aliases as $resolvedCode => $names) {
            foreach ($names as $name) {
                if ($normalizedName === $this->normalize($name)) {
                    return $resolvedCode;
                }
            }
        }

        return '';
    }

    private function resolveStateAlias(?string $stateName): string
    {
        $raw = trim((string) $stateName);
        if ($raw === '') {
            return '';
        }

        $normalized = $this->normalize($raw);
        $aliases = [
            'Abu Dhabi' => ['abu dhabi', 'abudhabi', 'أبوظبي', 'ابوظبي', 'أبو ظبي', 'ابو ظبي'],
            'Dubai' => ['dubai', 'دبي'],
            'Sharjah' => ['sharjah', 'الشارقة'],
            'Ajman' => ['ajman', 'عجمان'],
            'Umm Al Quwain' => ['umm al quwain', 'umm al-quwain', 'ام القيوين', 'أم القيوين'],
            'Ras Al Khaimah' => ['ras al khaimah', 'ras al-khaimah', 'رأس الخيمة', 'راس الخيمة'],
            'Fujairah' => ['fujairah', 'الفجيرة'],
            'Riyadh' => ['riyadh', 'الرياض'],
            'Makkah' => ['makkah', 'mecca', 'مكة', 'مكة المكرمة'],
            'Madinah' => ['madinah', 'medina', 'المدينة', 'المدينة المنورة'],
            'Eastern Province' => ['eastern province', 'ash sharqiyah', 'المنطقة الشرقية', 'الشرقية'],
            'Asir' => ['asir', 'عسير'],
            'Tabuk' => ['tabuk', 'تبوك'],
            'Hail' => ['hail', 'حائل'],
            'Qassim' => ['qassim', 'القصيم'],
        ];

        foreach ($aliases as $canonical => $values) {
            foreach ($values as $value) {
                if ($normalized === $this->normalize($value)) {
                    return $canonical;
                }
            }
        }

        return $raw;
    }

    private function buildStreetAddress(array $address, string $displayName): ?string
    {
        $street = trim(implode(' ', array_filter([
            $address['house_number'] ?? null,
            $address['road'] ?? $address['pedestrian'] ?? $address['footway'] ?? null,
        ])));

        $area = $this->firstNonEmpty([
            $address['suburb'] ?? '',
            $address['neighbourhood'] ?? '',
            $address['residential'] ?? '',
            $address['quarter'] ?? '',
        ]);

        $segments = array_filter([$street, $area]);
        if (!empty($segments)) {
            return implode(', ', array_unique($segments));
        }

        if ($displayName !== '') {
            $parts = array_map('trim', explode(',', $displayName));
            return $parts[0] ?? $displayName;
        }

        return null;
    }

    private function firstNonEmpty(array $values): string
    {
        foreach ($values as $value) {
            $text = trim((string) $value);
            if ($text !== '') {
                return $text;
            }
        }

        return '';
    }

    private function normalize($value): string
    {
        return mb_strtolower(trim((string) $value));
    }
}
