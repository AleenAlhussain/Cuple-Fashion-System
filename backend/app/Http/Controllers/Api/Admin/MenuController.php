<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class MenuController extends BaseController
{
    private const STORAGE_PATH = 'app/menu/menu.json';
    private const LEGACY_STORAGE_PATH = '../admin/src/app/api/menu/menu.json';

    private const DEFAULT_LOCATIONS = [
        'primary' => null,
        'footer_useful' => null,
        'footer_help' => null,
    ];

    public function index(Request $request)
    {
        $storage = $this->loadStorage();
        $locationKey = $this->normalizeLocationKey($request->query('location'));

        if ($locationKey) {
            $menu = $this->menuForLocation($storage, $locationKey);

            if (!$menu) {
                return $this->success(null, "No menu assigned to the '{$locationKey}' location");
            }

            return $this->success($menu);
        }

        return $this->success([
            'current_page' => 1,
            'data' => $storage['menus'],
            'total' => count($storage['menus']),
            'locations' => $storage['locations'],
            'available_locations' => array_keys($storage['locations']),
        ]);
    }

    public function show(int $id)
    {
        $storage = $this->loadStorage();
        $index = $this->findMenuIndex($storage['menus'], $id);

        if ($index === null) {
            return $this->error('Menu not found', 404);
        }

        return $this->success($storage['menus'][$index]);
    }

    public function store(Request $request)
    {
        $storage = $this->loadStorage();
        $menuId = $storage['next_menu_id'];
        $menu = $this->createMenuEntry($request, $menuId);

        $storage['menus'][] = $menu;
        $storage['next_menu_id'] = $menuId + 1;
        $this->updateLocationAssignments($storage['locations'], $menu['locations'], $menuId);
        $storage['menus'] = $this->syncMenusWithLocations($storage['menus'], $storage['locations']);
        $this->saveStorage($storage);

        return $this->success($menu, 'Menu created successfully', 201);
    }

    public function update(Request $request, int $id)
    {
        $storage = $this->loadStorage();
        $index = $this->findMenuIndex($storage['menus'], $id);

        if ($index === null) {
            return $this->error('Menu not found', 404);
        }

        $this->updateMenuEntry($storage['menus'][$index], $request);
        $this->updateLocationAssignments($storage['locations'], $storage['menus'][$index]['locations'], $id);
        $storage['menus'][$index]['locations'] = array_values(array_unique($storage['menus'][$index]['locations']));
        $storage['menus'] = $this->syncMenusWithLocations($storage['menus'], $storage['locations']);
        $this->saveStorage($storage);

        return $this->success($storage['menus'][$index], 'Menu updated successfully');
    }

    public function destroy(int $id)
    {
        $storage = $this->loadStorage();
        $index = $this->findMenuIndex($storage['menus'], $id);

        if ($index === null) {
            return $this->error('Menu not found', 404);
        }

        array_splice($storage['menus'], $index, 1);
        foreach ($storage['locations'] as $key => $value) {
            if ($value === $id) {
                $storage['locations'][$key] = null;
            }
        }

        $storage['menus'] = $this->syncMenusWithLocations($storage['menus'], $storage['locations']);
        $this->saveStorage($storage);

        return $this->success(null, 'Menu deleted successfully');
    }

    public function locations()
    {
        $storage = $this->loadStorage();

        return $this->success([
            'locations' => $storage['locations'],
            'available_locations' => array_keys($storage['locations']),
        ]);
    }

    public function updateLocations(Request $request)
    {
        $storage = $this->loadStorage();
        $newMap = $this->normalizeLocationMap($request->input('locations', []));

        $storage['locations'] = $newMap;
        $storage['menus'] = $this->syncMenusWithLocations($storage['menus'], $storage['locations']);

        $this->saveStorage($storage);

        return $this->success($storage['locations'], 'Menu locations updated');
    }

    private function getStoragePath(): string
    {
        return storage_path(self::STORAGE_PATH);
    }

    private function getLegacyStoragePath(): string
    {
        return base_path(self::LEGACY_STORAGE_PATH);
    }

    private function getReadableStoragePath(): string
    {
        $path = $this->getStoragePath();
        if (File::exists($path)) {
            return $path;
        }

        $legacyPath = $this->getLegacyStoragePath();
        if (File::exists($legacyPath)) {
            return $legacyPath;
        }

        return $path;
    }

    private function loadStorage(): array
    {
        $path = $this->getReadableStoragePath();

        if (!File::exists($path)) {
            return $this->createDefaultStorage();
        }

        $payload = json_decode(File::get($path), true) ?? [];

        $payload['menus'] = isset($payload['menus']) && is_array($payload['menus']) ? $payload['menus'] : [];
        $payload['menus'] = $this->normalizeMenuList($payload['menus']);
        $payload['locations'] = $this->ensureLocationMap($payload['locations'] ?? []);
        $payload['next_menu_id'] = max(1, (int) ($payload['next_menu_id'] ?? 1));
        $payload['meta'] = array_merge($this->createDefaultStorage()['meta'], $payload['meta'] ?? []);

        return $payload;
    }

    private function saveStorage(array $payload): void
    {
        $payload['meta'] = $payload['meta'] ?? [];
        $payload['meta']['created_at'] = $payload['meta']['created_at'] ?? now()->toDateTimeString();
        $payload['meta']['updated_at'] = now()->toDateTimeString();

        $path = $this->getStoragePath();
        if (!File::isDirectory(dirname($path))) {
            File::makeDirectory(dirname($path), 0755, true);
        }
        File::put($path, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private function createDefaultStorage(): array
    {
        return [
            'next_menu_id' => 1,
            'menus' => [],
            'locations' => self::DEFAULT_LOCATIONS,
            'meta' => [
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ],
        ];
    }

    private function findMenuIndex(array $menus, int $id): ?int
    {
        foreach ($menus as $index => $menu) {
            if (($menu['id'] ?? null) === $id) {
                return $index;
            }
        }

        return null;
    }

    private function createMenuEntry(Request $request, int $id): array
    {
        $name = $request->input('name', 'Menu ' . $id);
        $nameAr = $request->input('name_ar', null);
        $slugSource = trim((string) ($name ?: $nameAr ?: ('menu-' . $id)));
        $settings = array_merge($this->defaultSettings(), $request->input('settings', []));

        return [
            'id' => $id,
            'name' => $name,
            'name_ar' => $nameAr ?: null,
            'slug' => Str::slug($slugSource),
            'items' => $this->itemsFromRequest($request),
            'settings' => $settings,
            'locations' => $this->filterLocationList($request->input('locations', [])),
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ];
    }

    private function updateMenuEntry(array &$menu, Request $request): void
    {
        if ($request->filled('name')) {
            $menu['name'] = $request->input('name');
            $menu['slug'] = Str::slug($menu['name']);
        }

        if ($request->has('name_ar')) {
            $nameAr = trim((string) $request->input('name_ar', ''));
            $menu['name_ar'] = $nameAr !== '' ? $nameAr : null;
        }

        if ($request->has('items')) {
            $menu['items'] = $this->itemsFromRequest($request);
        }

        if ($request->has('settings')) {
            $menu['settings'] = array_merge($this->defaultSettings(), $menu['settings'] ?? [], $request->input('settings', []));
        }

        if ($request->has('locations')) {
            $menu['locations'] = $this->filterLocationList($request->input('locations', []));
        }

        $menu['updated_at'] = now()->toDateTimeString();
    }

    private function updateLocationAssignments(array &$locations, array $selected, int $menuId): void
    {
        $selected = $this->filterLocationList($selected);

        foreach ($locations as $key => &$value) {
            if (in_array($key, $selected, true)) {
                $value = $menuId;
            } elseif ($value === $menuId) {
                $value = null;
            }
        }
    }

    private function ensureLocationMap(array $input): array
    {
        $map = [];
        foreach (array_keys(self::DEFAULT_LOCATIONS) as $key) {
            $map[$key] = isset($input[$key]) && $input[$key] ? (int) $input[$key] : null;
        }
        return $map;
    }

    private function normalizeLocationMap(array $input): array
    {
        $map = $this->ensureLocationMap($input);
        return $map;
    }

    private function filterLocationList($values): array
    {
        if (!is_array($values)) {
            return [];
        }

        $normalized = [];
        $allowed = array_keys(self::DEFAULT_LOCATIONS);

        foreach ($values as $value) {
            $key = $this->normalizeLocationKey($value);
            if ($key && in_array($key, $allowed, true)) {
                $normalized[] = $key;
            }
        }

        return array_values(array_unique($normalized));
    }

    private function normalizeLocationKey(?string $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $key = strtolower(trim($value));
        return array_key_exists($key, self::DEFAULT_LOCATIONS) ? $key : null;
    }

    private function itemsFromRequest(Request $request): array
    {
        $items = $request->input('items', []);
        return is_array($items) ? $this->normalizeMenuItems($items) : [];
    }

    private function normalizeMenuList(array $menus): array
    {
        return array_map(function ($menu) {
            return $this->normalizeMenuEntry($menu);
        }, $menus);
    }

    private function normalizeMenuEntry(array $menu): array
    {
        $menu['id'] = isset($menu['id']) ? (int) $menu['id'] : 0;
        $menu['name'] = isset($menu['name']) ? (string) $menu['name'] : ('Menu ' . $menu['id']);
        $menu['name_ar'] = isset($menu['name_ar']) && trim((string) $menu['name_ar']) !== ''
            ? (string) $menu['name_ar']
            : null;
        $menu['slug'] = isset($menu['slug']) && trim((string) $menu['slug']) !== ''
            ? (string) $menu['slug']
            : Str::slug($menu['name'] ?: ('menu-' . $menu['id']));
        $menu['items'] = $this->normalizeMenuItems($menu['items'] ?? []);
        $menu['settings'] = array_merge($this->defaultSettings(), $menu['settings'] ?? []);
        $menu['locations'] = $this->filterLocationList($menu['locations'] ?? []);

        return $menu;
    }

    private function normalizeMenuItems(array $items): array
    {
        $normalized = [];

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $title = isset($item['title']) && trim((string) $item['title']) !== ''
                ? (string) $item['title']
                : ((isset($item['name']) && trim((string) $item['name']) !== '') ? (string) $item['name'] : 'Untitled');

            $normalized[] = [
                'id' => isset($item['id']) ? (string) $item['id'] : 'menu-' . uniqid(),
                'title' => $title,
                'title_ar' => isset($item['title_ar']) && trim((string) $item['title_ar']) !== ''
                    ? (string) $item['title_ar']
                    : (isset($item['name_ar']) ? (string) $item['name_ar'] : ''),
                'path' => isset($item['path']) && trim((string) $item['path']) !== '' ? (string) $item['path'] : '#',
                'link_type' => isset($item['link_type']) && trim((string) $item['link_type']) !== ''
                    ? (string) $item['link_type']
                    : 'link',
                'target_blank' => !empty($item['target_blank']),
                'badge_text' => isset($item['badge_text']) ? $item['badge_text'] : '',
                'badge_color' => isset($item['badge_color']) && trim((string) $item['badge_color']) !== ''
                    ? (string) $item['badge_color']
                    : 'bg-danger',
                'mega_menu' => isset($item['mega_menu']) ? (int) $item['mega_menu'] : 0,
                'mega_menu_type' => isset($item['mega_menu_type']) && trim((string) $item['mega_menu_type']) !== ''
                    ? (string) $item['mega_menu_type']
                    : 'simple',
                'child' => $this->normalizeMenuItems(isset($item['child']) && is_array($item['child']) ? $item['child'] : []),
            ];
        }

        return $normalized;
    }

    private function defaultSettings(): array
    {
        return [
            'auto_add_new_top_level_pages' => false,
        ];
    }

    private function syncMenusWithLocations(array $menus, array $locations): array
    {
        foreach ($menus as &$menu) {
            $menu['locations'] = [];
        }

        foreach ($locations as $location => $menuId) {
            if (!$menuId) {
                continue;
            }

            foreach ($menus as &$menu) {
                if (($menu['id'] ?? null) === $menuId) {
                    $menu['locations'][] = $location;
                    break;
                }
            }
        }

        return $menus;
    }

    private function menuForLocation(array $storage, string $locationKey): ?array
    {
        $menuId = $storage['locations'][$locationKey] ?? null;

        if (!$menuId) {
            return null;
        }

        foreach ($storage['menus'] as $menu) {
            if (($menu['id'] ?? null) === $menuId) {
                $menu['location'] = $locationKey;
                return $menu;
            }
        }

        return null;
    }
}
