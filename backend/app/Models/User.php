<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmailContract
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, MustVerifyEmail;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_CUSTOMER = 'customer';
    public const ROLE_SHOP_MANAGER = 'shop_manager';
    public const ROLE_STOCK_KEEPER = 'stock_keeper';
    public const ROLE_ACCOUNTING_TEAM = 'accounting_team';

    public const ADMIN_PANEL_ROLES = [
        self::ROLE_ADMIN,
        self::ROLE_SHOP_MANAGER,
        self::ROLE_STOCK_KEEPER,
        self::ROLE_ACCOUNTING_TEAM,
    ];

    public const ORDER_ACCESS_ROLES = self::ADMIN_PANEL_ROLES;

    public const ORDERS_ONLY_PANEL_ROLES = [
        self::ROLE_STOCK_KEEPER,
        self::ROLE_ACCOUNTING_TEAM,
    ];

    public const MANAGEABLE_ROLES = [
        self::ROLE_ADMIN,
        self::ROLE_CUSTOMER,
        self::ROLE_SHOP_MANAGER,
        self::ROLE_STOCK_KEEPER,
        self::ROLE_ACCOUNTING_TEAM,
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'country_code',
        'country_id',
        'avatar',
        'role',
        'is_active',
        'last_login_at',
        'last_ip',
        'last_latitude',
        'last_longitude',
        'last_location_address',
        'last_location_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'pending_email_code',
        'pending_profile_update',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'last_latitude' => 'float',
            'last_longitude' => 'float',
            'last_location_at' => 'datetime',
            'pending_email_expires_at' => 'datetime',
            'pending_profile_update' => 'array',
        ];
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function defaultShippingAddress(): HasOne
    {
        return $this->hasOne(Address::class)->where('is_default_shipping', true);
    }

    public function defaultBillingAddress(): HasOne
    {
        return $this->hasOne(Address::class)->where('is_default_billing', true);
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function point(): HasOne
    {
        return $this->hasOne(Point::class);
    }

    public function pointTransactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAdmins($query)
    {
        return $query->where('role', self::ROLE_ADMIN);
    }

    public function scopeCustomers($query)
    {
        return $query->where('role', self::ROLE_CUSTOMER);
    }

    public function scopeShopManagers($query)
    {
        return $query->where('role', self::ROLE_SHOP_MANAGER);
    }

    public function scopeStockKeepers($query)
    {
        return $query->where('role', self::ROLE_STOCK_KEEPER);
    }

    public function scopeAccountingTeam($query)
    {
        return $query->where('role', self::ROLE_ACCOUNTING_TEAM);
    }

    // Helpers
    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isShopManager(): bool
    {
        return $this->role === self::ROLE_SHOP_MANAGER;
    }

    public function isStockKeeper(): bool
    {
        return $this->role === self::ROLE_STOCK_KEEPER;
    }

    public function isAccountingTeam(): bool
    {
        return $this->role === self::ROLE_ACCOUNTING_TEAM;
    }

    public function isCustomer(): bool
    {
        return $this->role === self::ROLE_CUSTOMER;
    }

    public function hasAdminPanelAccess(): bool
    {
        return in_array($this->role, self::ADMIN_PANEL_ROLES, true);
    }

    public function hasOrderAccess(): bool
    {
        return in_array($this->role, self::ORDER_ACCESS_ROLES, true);
    }

    public function isOrdersOnlyPanelRole(): bool
    {
        return in_array($this->role, self::ORDERS_ONLY_PANEL_ROLES, true);
    }

    public function getAvatarUrlAttribute()
    {
        return MediaUrl::fromPath($this->avatar);
    }

    public function getOrCreateCart(): Cart
    {
        return $this->cart ?? $this->cart()->create([
            'country_id' => $this->country_id,
        ]);
    }
}
