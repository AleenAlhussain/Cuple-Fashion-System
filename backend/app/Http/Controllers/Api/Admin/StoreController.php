<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class StoreController extends BaseController
{
    private const STORE_TABLE = 'uae_store_priority';

    public function index(Request $request)
    {
        if (!Schema::hasTable(self::STORE_TABLE)) {
            return response()->json([
                'success' => true,
                'data' => [],
                'total' => 0,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => (int) $request->input('paginate', 15),
            ]);
        }

        $storeCodeColumn = $this->resolveStoreCodeColumn();
        $statusColumn = $this->resolveStatusColumn();

        $query = DB::table(self::STORE_TABLE);

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search, $storeCodeColumn) {
                $q->where('store_name', 'like', '%' . $search . '%')
                    ->orWhere($storeCodeColumn, 'like', '%' . $search . '%');
            });
        }

        if ($request->has('status') && $statusColumn) {
            $query->where($statusColumn, $this->toBooleanInt($request->input('status')));
        }

        $allowedSortFields = ['id', 'store_name', $storeCodeColumn, 'priority', 'created_at'];
        $sortField = $request->input('field');
        $sortDirection = strtolower((string) $request->input('sort', 'asc')) === 'desc' ? 'desc' : 'asc';

        if ($sortField && in_array($sortField, $allowedSortFields, true)) {
            $query->orderBy($sortField, $sortDirection);
        } elseif (Schema::hasColumn(self::STORE_TABLE, 'priority')) {
            $query->orderBy('priority', 'asc');
        } else {
            $query->orderBy('id', 'asc');
        }

        $perPage = max(1, min((int) $request->input('paginate', 15), 200));
        $stores = $query->paginate($perPage);

        $rows = collect($stores->items())
            ->map(fn($row) => $this->transformRow($row, $storeCodeColumn, $statusColumn))
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'total' => $stores->total(),
            'current_page' => $stores->currentPage(),
            'last_page' => $stores->lastPage(),
            'per_page' => $stores->perPage(),
        ]);
    }

    public function show(int $id)
    {
        if (!Schema::hasTable(self::STORE_TABLE)) {
            return $this->error('Store not found', 404);
        }

        $storeCodeColumn = $this->resolveStoreCodeColumn();
        $statusColumn = $this->resolveStatusColumn();

        $store = DB::table(self::STORE_TABLE)->where('id', $id)->first();
        if (!$store) {
            return $this->error('Store not found', 404);
        }

        return $this->success(
            $this->transformRow($store, $storeCodeColumn, $statusColumn)
        );
    }

    public function updateStatus(int $id)
    {
        if (!Schema::hasTable(self::STORE_TABLE)) {
            return $this->error('Store not found', 404);
        }

        $statusColumn = $this->resolveStatusColumn();
        if (!$statusColumn) {
            return $this->error('Store status column is not available.', 422);
        }

        $store = DB::table(self::STORE_TABLE)->where('id', $id)->first();
        if (!$store) {
            return $this->error('Store not found', 404);
        }

        $nextStatus = !((bool) ($store->{$statusColumn} ?? false));
        $updatePayload = [$statusColumn => $nextStatus ? 1 : 0];

        if (Schema::hasColumn(self::STORE_TABLE, 'updated_at')) {
            $updatePayload['updated_at'] = now();
        }

        DB::table(self::STORE_TABLE)->where('id', $id)->update($updatePayload);

        return $this->success([
            'id' => $id,
            'is_active' => $nextStatus,
            'is_approved' => $nextStatus,
            'status' => $nextStatus,
        ], 'Store status updated');
    }

    private function resolveStoreCodeColumn(): string
    {
        if (Schema::hasColumn(self::STORE_TABLE, 'store_key')) {
            return 'store_key';
        }

        if (Schema::hasColumn(self::STORE_TABLE, 'store_code')) {
            return 'store_code';
        }

        return 'id';
    }

    private function resolveStatusColumn(): ?string
    {
        if (Schema::hasColumn(self::STORE_TABLE, 'is_active')) {
            return 'is_active';
        }

        if (Schema::hasColumn(self::STORE_TABLE, 'status')) {
            return 'status';
        }

        return null;
    }

    private function toBooleanInt($value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }

        $normalized = strtolower(trim((string) $value));
        return in_array($normalized, ['1', 'true', 'yes', 'on'], true) ? 1 : 0;
    }

    private function transformRow(object $row, string $storeCodeColumn, ?string $statusColumn): array
    {
        $storeCode = (string) ($row->{$storeCodeColumn} ?? $row->id);
        $storeName = trim((string) ($row->store_name ?? '')) ?: $storeCode;
        $isActive = $statusColumn ? (bool) ($row->{$statusColumn} ?? false) : true;

        return [
            'id' => (int) $row->id,
            'store_name' => $storeName,
            'name' => $storeName,
            'slug' => Str::slug($storeName),
            'store_code' => $storeCode,
            'store_key' => $storeCode,
            'priority' => (int) ($row->priority ?? 0),
            'is_active' => $isActive ? 1 : 0,
            'is_approved' => $isActive ? 1 : 0,
            'status' => $isActive ? 1 : 0,
            'store_logo' => null,
            'vendor' => ['name' => $storeName],
            'created_at' => $row->created_at ?? null,
            'updated_at' => $row->updated_at ?? null,
        ];
    }
}

