<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\Point;
use App\Models\Setting;
use App\Models\UserNotification;
use App\Support\MediaUrl;
use App\Services\WhatsAppTemplateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use App\Notifications\ForgotPasswordOtp;
use App\Notifications\VerifyNewEmailCode;

class AuthController extends BaseController
{
    private const WHATSAPP_LOGIN_OTP_TTL_MINUTES = 10;
    private const WHATSAPP_LOGIN_OTP_MAX_ATTEMPTS = 5;
    private const WHATSAPP_LOGIN_OTP_RESEND_SECONDS = 30;

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,NULL,id,deleted_at,NULL',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|numeric',
            'country_code' => 'nullable|string|max:10',
            'country_id' => 'nullable|exists:countries,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'country_code' => $validated['country_code'] ?? '+971',
            'country_id' => $validated['country_id'] ?? null,
            'role' => 'customer',
            'is_active' => false,
        ]);

        $user->sendEmailVerificationNotification();
        $this->notifyUser($user->id, 'account_created', 'Account created', 'Your account has been created successfully.', '/account/dashboard');

        // Credit signup points to new user
        $signupPoints = Point::getSignupPoints();
        if ($signupPoints > 0) {
            $point = Point::getOrCreate($user->id);
            $point->credit($signupPoints, 'signup_bonus', null, null);
        }

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => (bool) $user->is_active,
                'email_verified' => $user->hasVerifiedEmail(),
            ],
            'verification' => [
                'sent' => true,
                'message' => 'Check your email to verify your account. If you don’t see it, check spam/junk.',
            ],
        ], 'Registration successful. Please verify your email to activate your account.', 201);

    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        // Eager load relationships upfront to avoid N+1
        $user = User::with(['country', 'addresses.country'])
            ->where('email', $validated['email'])
            ->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return $this->error('Your account has been deactivated.', 403);
        }

        // Legacy safety: some imported accounts are active but missing email_verified_at.
        // Allow those active users to log in by backfilling verification timestamp.
        if (!$user->hasVerifiedEmail()) {
            if ((bool) $user->is_active) {
                $user->forceFill(['email_verified_at' => now()])->save();
            } else {
                return $this->error('Please verify your email address before logging in.', 403);
            }
        }

        // Create new token (keep only the latest token to avoid token table bloat)
        // Delete old tokens in background to avoid blocking
        $user->tokens()->where('created_at', '<', now()->subDay())->delete();

        $token = $user->createToken('auth-token')->plainTextToken;

        // Update last login without triggering model events
        $user->timestamps = false;
        $user->last_login_at = now();
        $user->save();
        $user->timestamps = true;

        $user = $user->refresh()->load(['country', 'addresses.country', 'defaultShippingAddress', 'defaultBillingAddress']);
        $userData = $this->buildUserPayload($user);

        return $this->success([
            'user' => $userData,
            'token' => $token,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful');
    }

    public function sendWhatsAppLoginOtp(Request $request, WhatsAppTemplateService $whatsAppTemplateService)
    {
        $validated = $request->validate([
            'phone' => ['required'],
            'country_code' => ['nullable'],
        ]);

        $phoneContext = $this->normalizePhoneContext(
            $validated['country_code'] ?? null,
            $validated['phone']
        );

        if (!$phoneContext) {
            return $this->error('Please enter a valid WhatsApp number.', 422);
        }

        $user = $this->findUserByPhoneContext($phoneContext);
        if (!$user) {
            return $this->error('No account found with this mobile number.', 404);
        }

        $phoneContext = $this->resolveStoredPhoneContext($user, $phoneContext);

        if (!$user->is_active) {
            return $this->error('Your account has been deactivated.', 403);
        }

        $cacheKey = $this->whatsappOtpCacheKey($phoneContext['whatsapp_digits']);
        $cachedOtp = Cache::get($cacheKey);
        $expiresAt = $this->parseOtpExpiresAt($cachedOtp);

        if ($expiresAt && $expiresAt->isPast()) {
            Cache::forget($cacheKey);
            $cachedOtp = null;
            $expiresAt = null;
        }

        if (is_array($cachedOtp) && !empty($cachedOtp['sent_at'])) {
            try {
                $cooldownUntil = Carbon::parse($cachedOtp['sent_at'])->addSeconds(self::WHATSAPP_LOGIN_OTP_RESEND_SECONDS);
                if ($cooldownUntil->isFuture()) {
                    return $this->error('Please wait before requesting another code.', 429, [
                        'retry_after' => now()->diffInSeconds($cooldownUntil),
                    ]);
                }
            } catch (\Throwable $e) {
                // Ignore stale/bad cache payload and issue a new OTP.
            }
        }

        $configStatus = $whatsAppTemplateService->validateConfiguration();
        if (!$configStatus['ready']) {
            Log::warning('WhatsApp OTP send blocked: config incomplete', [
                'missing' => $configStatus['missing'] ?? [],
            ]);

            return $this->error('WhatsApp service is not configured. Please contact support.', 503, [
                'missing' => $configStatus['missing'] ?? [],
            ]);
        }

        $otp = $this->resolveWhatsAppOtpValue($cachedOtp, $expiresAt);

        try {
            $dispatch = $whatsAppTemplateService->sendOtpTemplate($phoneContext['whatsapp_digits'], $otp);
        } catch (\Throwable $e) {
            Log::error('WhatsApp OTP dispatch failed', [
                'user_id' => $user->id,
                'phone' => $phoneContext['whatsapp_digits'],
                'error' => $e->getMessage(),
            ]);

            return $this->error('Unable to send OTP via WhatsApp at the moment. Please try again later.', 500);
        }

        $issuedAt = now();
        $expiresAt = $expiresAt && $expiresAt->isFuture()
            ? $expiresAt
            : $issuedAt->copy()->addMinutes(self::WHATSAPP_LOGIN_OTP_TTL_MINUTES);

        Cache::put($cacheKey, [
            'user_id' => $user->id,
            'otp_hash' => Hash::make($otp),
            'otp_encrypted' => $this->encryptWhatsAppOtp($otp),
            'attempts' => 0,
            'sent_at' => $issuedAt->toISOString(),
            'expires_at' => $expiresAt->toISOString(),
            'phone' => $phoneContext['whatsapp_digits'],
            'country_code' => $phoneContext['country_code_digits'],
            'local_phone' => $phoneContext['local_digits'],
        ], $expiresAt);

        return $this->success([
            'phone' => $this->maskPhoneValue($phoneContext['whatsapp_digits']),
            'otp_timeout' => self::WHATSAPP_LOGIN_OTP_TTL_MINUTES,
            'resend_after' => self::WHATSAPP_LOGIN_OTP_RESEND_SECONDS,
            'message_id' => $dispatch['message_id'] ?? null,
        ], 'OTP sent via WhatsApp.');
    }

    public function verifyWhatsAppLoginOtp(Request $request)
    {
        $request->merge([
            'otp' => $this->normalizeOtpValue($request->input('otp')),
        ]);

        $validated = $request->validate([
            'phone' => ['required'],
            'country_code' => ['nullable'],
            'otp' => 'required|digits:6',
        ]);

        $phoneContext = $this->normalizePhoneContext(
            $validated['country_code'] ?? null,
            $validated['phone']
        );

        if (!$phoneContext) {
            return $this->error('Please enter a valid WhatsApp number.', 422);
        }

        $user = null;
        $resolvedPhoneContext = $phoneContext;

        $cacheKey = $this->whatsappOtpCacheKey($resolvedPhoneContext['whatsapp_digits']);
        $otpRecord = Cache::get($cacheKey);

        if (!is_array($otpRecord)) {
            $user = $this->findUserByPhoneContext($phoneContext);
            if ($user) {
                $resolvedPhoneContext = $this->resolveStoredPhoneContext($user, $phoneContext);
                $cacheKey = $this->whatsappOtpCacheKey($resolvedPhoneContext['whatsapp_digits']);
                $otpRecord = Cache::get($cacheKey);
            }
        }

        if (!is_array($otpRecord)) {
            return $this->error('Invalid or expired OTP.', 400);
        }

        $expiresAt = !empty($otpRecord['expires_at']) ? Carbon::parse($otpRecord['expires_at']) : null;
        if (!$expiresAt || $expiresAt->isPast()) {
            Cache::forget($cacheKey);
            return $this->error('OTP has expired.', 400);
        }

        $attempts = (int) ($otpRecord['attempts'] ?? 0);
        if ($attempts >= self::WHATSAPP_LOGIN_OTP_MAX_ATTEMPTS) {
            Cache::forget($cacheKey);
            return $this->error('Too many invalid OTP attempts. Please request a new code.', 429);
        }

        $isValid = Hash::check($validated['otp'], (string) ($otpRecord['otp_hash'] ?? ''));
        if (!$isValid) {
            $otpRecord['attempts'] = $attempts + 1;

            if ($otpRecord['attempts'] >= self::WHATSAPP_LOGIN_OTP_MAX_ATTEMPTS) {
                Cache::forget($cacheKey);
                return $this->error('Too many invalid OTP attempts. Please request a new code.', 429);
            }

            $ttlSeconds = now()->diffInSeconds($expiresAt, false);
            Cache::put($cacheKey, $otpRecord, now()->addSeconds(max(1, $ttlSeconds)));

            return $this->error('Invalid OTP.', 400);
        }

        if (!empty($otpRecord['user_id'])) {
            $user = User::with(['country', 'addresses.country'])->find($otpRecord['user_id']);
        }

        if (!$user) {
            $user = $this->findUserByPhoneContext($phoneContext);
        }

        if (!$user) {
            Cache::forget($cacheKey);
            return $this->error('User not found.', 404);
        }

        if (!$user->is_active) {
            Cache::forget($cacheKey);
            return $this->error('Your account has been deactivated.', 403);
        }

        if (!$user->hasVerifiedEmail()) {
            if ((bool) $user->is_active) {
                $user->forceFill(['email_verified_at' => now()])->save();
            } else {
                return $this->error('Please verify your email address before logging in.', 403);
            }
        }

        $user->tokens()->where('created_at', '<', now()->subDay())->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        $user->timestamps = false;
        $user->last_login_at = now();
        $user->save();
        $user->timestamps = true;

        Cache::forget($cacheKey);

        $user = $user->refresh()->load(['country', 'addresses.country', 'defaultShippingAddress', 'defaultBillingAddress']);
        $userData = $this->buildUserPayload($user);

        return $this->success([
            'user' => $userData,
            'token' => $token,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful');
    }

    public function sendResetLinkEmail(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
        ]);

        $user = User::where('email', $validated['email'])->first();
        if (!$user) {
            return $this->error('This email is not registered.', 404);
        }

        $mailConfig = $this->resolveRuntimeMailConfig();
        if (!$mailConfig['ready']) {
            \Log::error('Forgot password: mail not configured', ['missing' => $mailConfig['missing']]);
            return $this->error('Email service is not available. Please try again later.', 503);
        }

        $otp = random_int(100000, 999999);
        $resetTable = config('auth.passwords.' . config('auth.defaults.passwords') . '.table', 'password_resets');
        DB::table($resetTable)->updateOrInsert(
            ['email' => $validated['email']],
            ['token' => Hash::make($otp), 'created_at' => now()]
        );

        try {
            $user->notify(new ForgotPasswordOtp((string) $otp));
        } catch (\Throwable $e) {
            \Log::error('Forgot password OTP email send failed', [
                'email' => $validated['email'],
                'mailer' => $mailConfig['mailer'],
                'error' => $e->getMessage(),
            ]);
        }

        return $this->success([
            'email' => $validated['email'],
            'otp_timeout' => config('auth.passwords.' . config('auth.defaults.passwords') . '.expire', 60),
        ], 'OTP sent successfully.');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logged out successfully');
    }

    /**
     * Check if an email already exists in the system
     */
    public function checkEmail(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
        ]);

        $exists = User::where('email', $validated['email'])->exists();

        return $this->success([
            'exists' => $exists,
            'message' => $exists ? 'Email is already registered' : 'Email is available',
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user()->load(['country', 'addresses.country', 'defaultShippingAddress', 'defaultBillingAddress']);

        $userData = $this->buildUserPayload($user);

        return $this->success([
            'user' => $userData,
            'address' => $user->addresses,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $originalName = $user->name;
        $originalPhone = $user->phone;
        $originalCountryCode = $user->country_code;

        if ($user->pending_email && $user->pending_email_expires_at && $user->pending_email_expires_at->isPast()) {
            $user->forceFill([
                'pending_email' => null,
                'pending_email_code' => null,
                'pending_email_expires_at' => null,
                'pending_profile_update' => null,
            ])->save();
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id . ',id,deleted_at,NULL',
            'phone' => 'nullable|string|max:20',
            'country_code' => 'nullable|string|max:10',
            'country_id' => 'nullable|exists:countries,id',
            'avatar' => 'nullable|image|max:2048',
            'profile_image_id' => 'nullable|string',
        ]);

        $hasPendingVerification = $user->pending_email && $user->pending_email_expires_at && $user->pending_email_expires_at->isFuture();
        $emailChangeRequested = array_key_exists('email', $validated) && $validated['email'] !== $user->email;

        if ($hasPendingVerification && !$emailChangeRequested) {
            return $this->error('Email verification pending. Please verify the new email before updating your profile.', 409);
        }

        if ($emailChangeRequested) {
            $pendingData = $validated;
            unset($pendingData['email'], $pendingData['avatar']);
            if (array_key_exists('country_code', $pendingData) && $pendingData['country_code'] === null) {
                unset($pendingData['country_code']);
            }

            $code = (string) random_int(100000, 999999);

            $user->forceFill([
                'pending_email' => $validated['email'],
                'pending_email_code' => Hash::make($code),
                'pending_email_expires_at' => Carbon::now()->addMinutes(10),
                'pending_profile_update' => $pendingData,
            ])->save();

            Notification::route('mail', $validated['email'])->notify(new VerifyNewEmailCode($code));

            $refreshed = $user->refresh()->load('country');
            return $this->success($this->buildUserPayload($refreshed), 'Verification code sent to the new email. Please verify to apply changes.');
        }

        $payload = $validated;
        unset($payload['email'], $payload['profile_image_id']);
        if (array_key_exists('country_code', $payload) && $payload['country_code'] === null) {
            unset($payload['country_code']);
        }

        if (array_key_exists('profile_image_id', $validated)) {
            $attachmentId = $validated['profile_image_id'];
            if ($attachmentId === null || $attachmentId === '') {
                $payload['avatar'] = null;
            } else {
                $attachmentPath = $this->resolveAttachmentPath($attachmentId);
                if (!$attachmentPath) {
                    return $this->error('Invalid profile image selected.', 422);
                }
                $payload['avatar'] = $attachmentPath;
            }
        } elseif ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $payload['avatar'] = $request->file('avatar')->store('avatars', 'public');
        } elseif ($request->exists('avatar') && $request->input('avatar') === '') {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $payload['avatar'] = null;
        } else {
            unset($payload['avatar']);
        }

        if (!empty($payload)) {
            $user->update($payload);
        }

        $refreshed = $user->refresh()->load('country');
        $this->notifyProfileChanges($user, $originalName, $originalPhone, $originalCountryCode);

        return $this->success($this->buildUserPayload($refreshed), 'Profile updated successfully');
    }

    private function profileImageData(User $user): ?array
    {
        if (!$user->avatar) {
            return null;
        }

        $path = ltrim(str_replace('\\', '/', $user->avatar), '/');
        $url = MediaUrl::fromPath($path) ?? asset("storage/{$path}");

        return [
            'id' => $user->id,
            'path' => $user->avatar,
            'file_name' => pathinfo($user->avatar, PATHINFO_BASENAME),
            'original_url' => $url,
            'url' => $url,
        ];
    }

    private function buildUserPayload(User $user): array
    {
        $ordersCount = $user->orders()->count();
        $point = Point::getOrCreate($user->id);
        $data = $user->toArray();
        $data['orders_count'] = $ordersCount;
        $data['wallet'] = ['balance' => 0];
        $data['point'] = ['balance' => (float) $point->balance];
        $data['avatar_url'] = $user->avatar_url;
        $data['profile_image'] = $this->profileImageData($user);
        $data['pending_email'] = $user->pending_email;
        $data['pending_email_expires_at'] = $user->pending_email_expires_at;
        return $data;
    }

    private function resolveRuntimeMailConfig(): array
    {
        $defaults = config('mail', []);
        $mailers = $defaults['mailers'] ?? [];

        $direct = Setting::query()
            ->whereIn('key', [
                'mail_mailer',
                'mail_host',
                'mail_port',
                'mail_username',
                'mail_password',
                'mail_encryption',
                'mail_from_address',
                'mail_from_name',
            ])
            ->pluck('value', 'key')
            ->toArray();

        $valuesBlob = Setting::query()->where('key', 'values')->value('value');
        $values = $this->decodeSettingJson($valuesBlob);
        $emailConfig = is_array(data_get($values, 'values.email')) ? data_get($values, 'values.email') : [];
        $rootEmailConfig = is_array(data_get($values, 'email')) ? data_get($values, 'email') : [];

        $mailer = $this->firstNonEmpty(
            data_get($direct, 'mail_mailer'),
            data_get($values, 'mail_mailer'),
            data_get($rootEmailConfig, 'mail_mailer'),
            data_get($emailConfig, 'mail_mailer'),
            data_get($defaults, 'default')
        );

        if (!$mailer) {
            $mailer = 'log';
        }

        $host = $this->firstNonEmpty(
            data_get($direct, 'mail_host'),
            data_get($values, 'mail_host'),
            data_get($rootEmailConfig, 'mail_host'),
            data_get($emailConfig, 'mail_host'),
            data_get($mailers, 'smtp.host')
        );

        $portRaw = $this->firstNonEmpty(
            data_get($direct, 'mail_port'),
            data_get($values, 'mail_port'),
            data_get($rootEmailConfig, 'mail_port'),
            data_get($emailConfig, 'mail_port'),
            data_get($mailers, 'smtp.port')
        );
        $port = is_numeric($portRaw) ? (int) $portRaw : null;

        $username = $this->firstNonEmpty(
            data_get($direct, 'mail_username'),
            data_get($values, 'mail_username'),
            data_get($rootEmailConfig, 'mail_username'),
            data_get($emailConfig, 'mail_username'),
            data_get($mailers, 'smtp.username')
        );

        $password = $this->firstNonEmpty(
            data_get($direct, 'mail_password'),
            data_get($values, 'mail_password'),
            data_get($rootEmailConfig, 'mail_password'),
            data_get($emailConfig, 'mail_password'),
            data_get($mailers, 'smtp.password')
        );

        $encryption = $this->firstNonEmpty(
            data_get($direct, 'mail_encryption'),
            data_get($values, 'mail_encryption'),
            data_get($rootEmailConfig, 'mail_encryption'),
            data_get($emailConfig, 'mail_encryption'),
            data_get($mailers, 'smtp.encryption')
        );
        if (in_array(strtolower((string) $encryption), ['null', 'none', ''], true)) {
            $encryption = null;
        }

        $fromAddress = $this->firstNonEmpty(
            data_get($direct, 'mail_from_address'),
            data_get($values, 'mail_from_address'),
            data_get($rootEmailConfig, 'mail_from_address'),
            data_get($emailConfig, 'mail_from_address'),
            data_get($defaults, 'from.address')
        );

        $fromName = $this->firstNonEmpty(
            data_get($direct, 'mail_from_name'),
            data_get($values, 'mail_from_name'),
            data_get($rootEmailConfig, 'mail_from_name'),
            data_get($emailConfig, 'mail_from_name'),
            data_get($defaults, 'from.name')
        );

        Config::set('mail.default', $mailer);
        Config::set('mail.from.address', $fromAddress ?: data_get($defaults, 'from.address'));
        Config::set('mail.from.name', $fromName ?: data_get($defaults, 'from.name'));

        if ($mailer === 'smtp') {
            Config::set('mail.mailers.smtp.host', $host);
            Config::set('mail.mailers.smtp.port', $port ?: data_get($mailers, 'smtp.port'));
            Config::set('mail.mailers.smtp.username', $username);
            Config::set('mail.mailers.smtp.password', $password);
            Config::set('mail.mailers.smtp.encryption', $encryption);
            Config::set('mail.mailers.smtp.timeout', 5);
        }

        $missing = [];
        if (in_array($mailer, ['log', 'array'], true)) {
            $missing[] = "mail_mailer:$mailer";
        } elseif ($mailer === 'smtp') {
            if (!$host) {
                $missing[] = 'mail_host';
            }
            if (!$port) {
                $missing[] = 'mail_port';
            }
            if (!$username) {
                $missing[] = 'mail_username';
            }
            if (!$password) {
                $missing[] = 'mail_password';
            }
        }

        if (!$fromAddress) {
            $missing[] = 'mail_from_address';
        }

        return [
            'ready' => count($missing) === 0,
            'mailer' => $mailer,
            'missing' => $missing,
        ];
    }

    private function decodeSettingJson($value): array
    {
        $decoded = $value;

        for ($i = 0; $i < 3; $i++) {
            if (!is_string($decoded)) {
                break;
            }

            $decoded = json_decode($decoded, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return [];
            }
        }

        return is_array($decoded) ? $decoded : [];
    }

    private function firstNonEmpty(...$values): ?string
    {
        foreach ($values as $value) {
            if ($value === null) {
                continue;
            }

            $candidate = trim((string) $value);
            if ($candidate === '' || strtolower($candidate) === 'null') {
                continue;
            }

            return $candidate;
        }

        return null;
    }

    private function whatsappOtpCacheKey(string $whatsAppPhoneDigits): string
    {
        return 'auth:whatsapp_login_otp:' . $whatsAppPhoneDigits;
    }

    private function resolveWhatsAppOtpValue($cachedOtp, ?Carbon $expiresAt): string
    {
        if ($expiresAt && $expiresAt->isFuture() && is_array($cachedOtp)) {
            $existingOtp = $this->decryptWhatsAppOtp($cachedOtp['otp_encrypted'] ?? null);

            if ($this->isSixDigitOtp($existingOtp)) {
                return $existingOtp;
            }
        }

        return $this->generateSixDigitOtp();
    }

    private function parseOtpExpiresAt($cachedOtp): ?Carbon
    {
        if (!is_array($cachedOtp) || empty($cachedOtp['expires_at'])) {
            return null;
        }

        try {
            return Carbon::parse($cachedOtp['expires_at']);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function generateSixDigitOtp(): string
    {
        return (string) random_int(100000, 999999);
    }

    private function encryptWhatsAppOtp(string $otp): ?string
    {
        try {
            return Crypt::encryptString($otp);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function decryptWhatsAppOtp($encryptedOtp): ?string
    {
        if (!is_string($encryptedOtp) || trim($encryptedOtp) === '') {
            return null;
        }

        try {
            return Crypt::decryptString($encryptedOtp);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function isSixDigitOtp(?string $otp): bool
    {
        return is_string($otp) && preg_match('/^\d{6}$/', $otp) === 1;
    }

    private function normalizeOtpValue($value): string
    {
        $otp = trim((string) $value);

        if ($otp === '') {
            return '';
        }

        return strtr($otp, [
            '٠' => '0',
            '١' => '1',
            '٢' => '2',
            '٣' => '3',
            '٤' => '4',
            '٥' => '5',
            '٦' => '6',
            '٧' => '7',
            '٨' => '8',
            '٩' => '9',
            '۰' => '0',
            '۱' => '1',
            '۲' => '2',
            '۳' => '3',
            '۴' => '4',
            '۵' => '5',
            '۶' => '6',
            '۷' => '7',
            '۸' => '8',
            '۹' => '9',
        ]);
    }

    private function normalizePhoneContext(?string $countryCode, ?string $phone): ?array
    {
        $phoneDigits = $this->digitsOnly($phone);
        if ($phoneDigits === '') {
            return null;
        }

        if (str_starts_with($phoneDigits, '00')) {
            $phoneDigits = substr($phoneDigits, 2);
        }

        $countryCodeDigits = $this->digitsOnly($countryCode);

        $localDigits = $phoneDigits;
        if ($countryCodeDigits !== '' && str_starts_with($localDigits, $countryCodeDigits)) {
            $localDigits = substr($localDigits, strlen($countryCodeDigits));
        }

        $localDigits = ltrim($localDigits, '0');
        if ($localDigits === '') {
            $localDigits = ltrim($phoneDigits, '0');
        }

        if ($localDigits === '') {
            return null;
        }

        $whatsAppDigits = $countryCodeDigits !== ''
            ? $countryCodeDigits . $localDigits
            : $phoneDigits;

        $whatsAppDigits = ltrim($whatsAppDigits, '0');
        if ($whatsAppDigits === '') {
            return null;
        }

        return [
            'country_code_digits' => $countryCodeDigits,
            'local_digits' => $localDigits,
            'raw_digits' => $phoneDigits,
            'whatsapp_digits' => $whatsAppDigits,
        ];
    }

    private function findUserByPhoneContext(array $phoneContext): ?User
    {
        $phoneCandidates = $this->buildPhoneCandidates(
            $phoneContext['local_digits'] ?? '',
            $phoneContext['whatsapp_digits'] ?? '',
            $phoneContext['raw_digits'] ?? ''
        );

        if (empty($phoneCandidates)) {
            return null;
        }

        $countryCodeCandidates = $this->buildCountryCodeCandidates($phoneContext['country_code_digits'] ?? '');

        $query = User::with(['country', 'addresses.country'])
            ->whereIn('phone', $phoneCandidates);

        if (!empty($countryCodeCandidates)) {
            $query->where(function ($countryQuery) use ($countryCodeCandidates) {
                $countryQuery
                    ->whereIn('country_code', $countryCodeCandidates)
                    ->orWhereNull('country_code')
                    ->orWhere('country_code', '');
            });
        }

        $user = $query->first();
        if ($user) {
            return $user;
        }

        $suffixCandidates = $this->buildPhoneSuffixCandidates(
            $phoneContext['local_digits'] ?? '',
            $phoneContext['raw_digits'] ?? ''
        );

        if (empty($suffixCandidates)) {
            return null;
        }

        return User::with(['country', 'addresses.country'])
            ->where(function ($suffixQuery) use ($suffixCandidates) {
                foreach ($suffixCandidates as $suffixCandidate) {
                    $suffixQuery->orWhere('phone', 'like', '%' . $suffixCandidate);
                }
            })
            ->first();
    }

    private function buildPhoneCandidates(string $localDigits, string $whatsAppDigits, string $rawDigits = ''): array
    {
        $candidates = [
            $localDigits,
            $rawDigits,
            $whatsAppDigits,
            '+' . $localDigits,
            '+' . $rawDigits,
            '+' . $whatsAppDigits,
            '00' . $whatsAppDigits,
        ];

        return array_values(array_unique(array_filter($candidates, function ($value) {
            return is_string($value) && trim($value) !== '';
        })));
    }

    private function buildCountryCodeCandidates(string $countryCodeDigits): array
    {
        if ($countryCodeDigits === '') {
            return [];
        }

        return array_values(array_unique([
            $countryCodeDigits,
            '+' . $countryCodeDigits,
            '00' . $countryCodeDigits,
        ]));
    }

    private function buildPhoneSuffixCandidates(string $localDigits, string $rawDigits = ''): array
    {
        $normalizedRawDigits = ltrim($rawDigits, '0');

        $candidates = [
            $localDigits,
            $normalizedRawDigits,
        ];

        if ($this->looksLikeUaeLocalPhone($localDigits)) {
            $candidates[] = '971' . $localDigits;
            $candidates[] = '0' . $localDigits;
        }

        return array_values(array_unique(array_filter($candidates, function ($value) {
            return is_string($value) && trim($value) !== '';
        })));
    }

    private function looksLikeUaeLocalPhone(string $digits): bool
    {
        return (bool) preg_match('/^5\d{8}$/', $digits);
    }

    private function resolveStoredPhoneContext(User $user, array $fallbackPhoneContext): array
    {
        $storedPhoneContext = $this->normalizePhoneContext(
            $user->country_code,
            $user->phone
        );

        return $storedPhoneContext ?: $fallbackPhoneContext;
    }

    private function digitsOnly(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }

    private function maskPhoneValue(string $value): string
    {
        $digits = $this->digitsOnly($value);
        $length = strlen($digits);

        if ($length <= 1) {
            return $digits;
        }

        if ($length <= 4) {
            return str_repeat('*', $length - 1) . substr($digits, -1);
        }

        return str_repeat('*', $length - 4) . substr($digits, -4);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        $this->notifyUser($user->id, 'password_changed', 'Password changed', 'Your password was updated successfully.', '/account/dashboard');

        return $this->success(null, 'Password changed successfully');
    }

    public function verifyEmailChange(Request $request)
    {
        $user = $request->user();
        $originalEmail = $user->email;
        $originalPhone = $user->phone;
        $originalCountryCode = $user->country_code;
        $originalName = $user->name;

        $validated = $request->validate([
            'code' => 'required|digits:6',
        ]);

        if (!$user->pending_email || !$user->pending_email_code || !$user->pending_email_expires_at) {
            return $this->error('No pending email verification found.', 404);
        }

        if ($user->pending_email_expires_at->isPast()) {
            $user->forceFill([
                'pending_email' => null,
                'pending_email_code' => null,
                'pending_email_expires_at' => null,
                'pending_profile_update' => null,
            ])->save();

            return $this->error('Verification code expired. Please request a new code.', 422);
        }

        if (!Hash::check($validated['code'], $user->pending_email_code)) {
            return $this->error('Invalid verification code.', 422);
        }

        if (User::where('email', $user->pending_email)->where('id', '!=', $user->id)->exists()) {
            $user->forceFill([
                'pending_email' => null,
                'pending_email_code' => null,
                'pending_email_expires_at' => null,
                'pending_profile_update' => null,
            ])->save();

            return $this->error('Email is already in use. Please choose another email.', 409);
        }

        $pending = is_array($user->pending_profile_update) ? $user->pending_profile_update : [];
        if (array_key_exists('profile_image_id', $pending)) {
            $attachmentId = $pending['profile_image_id'];
            if ($attachmentId === null || $attachmentId === '') {
                $pending['avatar'] = null;
            } else {
                $attachmentPath = $this->resolveAttachmentPath($attachmentId);
                if (!$attachmentPath) {
                    return $this->error('Invalid profile image selected.', 422);
                }
                $pending['avatar'] = $attachmentPath;
            }
            unset($pending['profile_image_id']);
        }
        $pending['email'] = $user->pending_email;

        $user->fill($pending);
        $user->forceFill([
            'email_verified_at' => now(),
            'is_active' => true,
            'pending_email' => null,
            'pending_email_code' => null,
            'pending_email_expires_at' => null,
            'pending_profile_update' => null,
        ]);
        $user->save();

        $refreshed = $user->refresh()->load('country');
        if ($originalEmail !== $user->email) {
            $this->notifyUser($user->id, 'email_changed', 'Email updated', 'Your email address was updated successfully.', '/account/dashboard');
        }
        $this->notifyProfileChanges($user, $originalName, $originalPhone, $originalCountryCode);
        return $this->success($this->buildUserPayload($refreshed), 'Email verified and profile updated successfully.');
    }

    private function resolveAttachmentPath(?string $attachmentId): ?string
    {
        if (!$attachmentId) {
            return null;
        }

        $files = Storage::disk('public')->files('attachments');
        foreach ($files as $file) {
            if (md5($file) === $attachmentId) {
                return $file;
            }
        }

        return null;
    }

    public function resetPasswordWithToken(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $resetTable = config('auth.passwords.' . config('auth.defaults.passwords') . '.table', 'password_resets');
        $otpRecord = DB::table($resetTable)->where('email', $validated['email'])->first();

        if (!$otpRecord) {
            return $this->error('Invalid or expired OTP.', 400);
        }

        $expireMinutes = config('auth.passwords.' . config('auth.defaults.passwords') . '.expire', 60);
        if (Carbon::parse($otpRecord->created_at)->addMinutes($expireMinutes)->isPast()) {
            return $this->error('OTP has expired.', 400);
        }

        if (!Hash::check($validated['token'], $otpRecord->token)) {
            return $this->error('Invalid OTP.', 400);
        }

        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return $this->error('User not found.', 404);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        $this->notifyUser($user->id, 'password_changed', 'Password changed', 'Your password was updated successfully.', '/account/dashboard');

        DB::table($resetTable)->where('email', $validated['email'])->delete();

        return $this->success(null, 'Password has been reset successfully. You can now login with your new password.');
    }

    private function notifyProfileChanges(User $user, ?string $originalName, ?string $originalPhone, ?string $originalCountryCode): void
    {
        if ($originalName !== null && $originalName !== $user->name) {
            $this->notifyUser($user->id, 'profile_updated', 'Profile updated', 'Your profile details were updated successfully.', '/account/dashboard');
        }

        $phoneChanged = ($originalPhone !== null && $originalPhone !== $user->phone)
            || ($originalCountryCode !== null && $originalCountryCode !== $user->country_code);

        if ($phoneChanged) {
            $this->notifyUser($user->id, 'phone_changed', 'Mobile number updated', 'Your mobile number was updated successfully.', '/account/dashboard');
        }
    }

    private function notifyUser(int $userId, string $type, string $title, string $message, string $link): void
    {
        UserNotification::create([
            'user_id' => $userId,
            'type' => $type,
            'data' => [
                'title' => $title,
                'message' => $message,
                'status' => $type,
                'link' => $link,
            ],
        ]);
    }

    public function adminSelf(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return $this->success(null);
        }

        $payload = $this->buildUserPayload($user);
        if (isset($user->role)) {
            $payload['role'] = ['name' => $user->role];
        }

        return $this->success($payload);
    }

    // Admin login
    public function adminLogin(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])
            ->whereIn('role', User::ADMIN_PANEL_ROLES)
            ->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return $this->error('Your account has been deactivated.', 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('admin-token')->plainTextToken;

        $user->update(['last_login_at' => now()]);

        return $this->success([
            'user' => $user,
            'token' => $token,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful');
    }
}
