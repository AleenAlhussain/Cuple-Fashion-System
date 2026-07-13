<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'group',
    ];

    public static function get($key, $default = null)
    {
        return Cache::remember("setting_{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

public static function set($key, $value, $group = 'general')
{
    Cache::forget("setting_{$key}");
    Cache::forget("settings_group_{$group}");
    Cache::forget('settings_all');

    return static::updateOrCreate(
        ['key' => $key],
        ['value' => $value, 'group' => $group]
    );
}

    public static function getGroup($group)
    {
        return Cache::remember("settings_group_{$group}", 3600, function () use ($group) {
            return static::where('group', $group)->pluck('value', 'key');
        });
    }

    public static function getAll()
    {
        return Cache::remember('settings_all', 3600, function () {
            return static::all()->pluck('value', 'key');
        });
    }
}
