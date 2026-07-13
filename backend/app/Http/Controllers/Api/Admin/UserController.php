<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Address;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Http\Controllers\Api\Traits\SmartSearchable;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class UserController extends BaseController
{
    use SmartSearchable;

    private const MANAGEABLE_ROLES = User::MANAGEABLE_ROLES;
    public function index(Request $request)
    {
        $query = User::with([
                'country',
                'point:user_id,balance',
                'wallet:user_id,balance',
            ])
            ->withCount('orders');

        // Filter by role
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        // Smart search
        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            if ($search !== '') {
                $normalizedPhone = $this->normalizeUaePhoneCandidate($search);
                if ($normalizedPhone !== null) {
                    $query->where(function ($q) use ($normalizedPhone) {
                        $q->where('phone', $normalizedPhone)
                            ->orWhereHas('defaultBillingAddress', function ($aq) use ($normalizedPhone) {
                                $aq->where('phone', $normalizedPhone);
                            });
                    });
                } else {
                    $tokens = preg_split('/\s+/', $search) ?: [];
                    $tokens = array_values(array_filter($tokens, fn ($token) => $token !== ''));
                    $textTokens = [];
                    $phoneTokens = [];

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

                        $textTokens[] = $normalized;
                    }

                    foreach ($phoneTokens as $phone) {
                        $query->where(function ($q) use ($phone) {
                            $q->where('phone', $phone)
                                ->orWhereHas('defaultBillingAddress', function ($aq) use ($phone) {
                                    $aq->where('phone', $phone);
                                });
                        });
                    }

                    if (!empty($textTokens)) {
                        $this->applySmartSearch(
                            $query,
                            implode(' ', $textTokens),
                            ['name', 'email'],
                            []
                        );
                    }
                }
            }
        }

        // Filter by status (active/inactive)
        if ($request->has('status') && $request->status) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // Sort
        $sortBy = $request->input('sortBy', 'newest');
        switch ($sortBy) {
            case 'oldest':
                $query->oldest();
                break;
            case 'name_asc':
                $query->orderBy('name', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('name', 'desc');
                break;
            default:
                $query->latest();
        }

        $users = $query->paginate($request->input('paginate', 15));

        return $this->paginated($users);
    }

    public function show($id)
    {
        $user = User::with(['country', 'addresses', 'orders' => function ($q) {
            $q->latest()->limit(10);
        }])->findOrFail($id);

        return $this->success($user);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email',
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'country_code' => 'nullable|string|max:10',
            'country_id' => 'nullable|exists:countries,id',
            'role' => 'required|in:' . implode(',', self::MANAGEABLE_ROLES),
            'is_active' => 'nullable|boolean',
        ]);

        if (empty($validated['password'])) {
            $validated['password'] = Str::random(12);
        }
        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return $this->success($user, 'User created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'country_code' => 'nullable|string|max:10',
            'country_id' => 'nullable|exists:countries,id',
            'role' => 'sometimes|in:' . implode(',', self::MANAGEABLE_ROLES),
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return $this->success($user->fresh(), 'User updated successfully');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting own account
        $currentUser = request()->user();
        if ($currentUser && $currentUser->id === $user->id) {
            return $this->error('You cannot delete your own account.', 400);
        }

        $user->forceDelete();

        return $this->success(null, 'User deleted successfully');
    }

    public function toggleStatus($id)
    {
        $user = User::findOrFail($id);

        // Prevent deactivating own account (if authenticated)
        $currentUser = request()->user();
        if ($currentUser && $currentUser->id === $user->id) {
            return $this->error('You cannot deactivate your own account.', 400);
        }

        $user->update(['is_active' => !$user->is_active]);

        return $this->success($user->fresh(), 'User status updated successfully');
    }

    public function resetPassword(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Generate password reset token
        $token = app('auth.password.broker')->createToken($user);

        // Build reset URL for frontend
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        $resetUrl = "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($user->email);

        // Send email
        try {
            \Mail::to($user->email)->send(new \App\Mail\PasswordResetMail($user, $resetUrl));
            return $this->success(['email' => $user->email], 'Password reset link sent to ' . $user->email);
        } catch (\Exception $e) {
            \Log::error('Failed to send password reset email: ' . $e->getMessage());
            return $this->error('Failed to send email. Please check mail configuration.', 500);
        }
    }

    public function resetPasswordDirect(Request $request, $id)
    {
        \Log::info('resetPasswordDirect called', ['id' => $id, 'has_password' => $request->has('password')]);

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $user->password = Hash::make($validated['password']);
        $user->save();

        \Log::info('Password updated for user', ['email' => $user->email]);

        return $this->success($user->fresh(), 'Password reset successfully');
    }

    public function statistics()
    {
        $stats = [
            'total_users' => User::count(),
            'total_customers' => User::customers()->count(),
            'total_admins' => User::admins()->count(),
            'total_stock_keepers' => User::stockKeepers()->count(),
            'total_accounting_team' => User::accountingTeam()->count(),
            'active_users' => User::active()->count(),
            'new_users_today' => User::whereDate('created_at', today())->count(),
            'new_users_this_month' => User::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)->count(),
        ];

        return $this->success($stats);
    }

    /**
     * Get role counts for WooCommerce-style tabs
     */
    public function roleCounts()
    {
        $counts = [
            'all' => User::count(),
            'admin' => User::where('role', 'admin')->count(),
            'customer' => User::where('role', 'customer')->count(),
            'shop_manager' => User::where('role', 'shop_manager')->count(),
            'stock_keeper' => User::where('role', 'stock_keeper')->count(),
            'accounting_team' => User::where('role', 'accounting_team')->count(),
        ];

        return $this->success($counts);
    }

    public function export(Request $request)
    {
        $query = User::with('country');

        if ($request->has('role') && $request->role) {
            $query->where('role', $request->role);
        }

        if ($request->has('status') && $request->status) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('id', 'desc')->get();

        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, ['id', 'name', 'email', 'phone', 'country', 'role', 'status', 'created_at']);

        foreach ($users as $user) {
            fputcsv($handle, [
                $user->id,
                $user->name,
                $user->email,
                $user->phone,
                optional($user->country)->name,
                $user->role,
                $user->is_active ? 'active' : 'inactive',
                $user->created_at,
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="users_export.csv"',
        ]);
    }

    public function exportSelected(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $ids = array_values(array_unique($validated['ids']));
        $users = User::with('country')->whereIn('id', $ids)->get();

        $foundIds = $users->pluck('id')->all();
        $missingCount = count(array_diff($ids, $foundIds));

        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, ['id', 'name', 'email', 'phone', 'country', 'role', 'status', 'created_at']);

        foreach ($users as $user) {
            fputcsv($handle, [
                $user->id,
                $user->name,
                $user->email,
                $user->phone,
                optional($user->country)->name,
                $user->role,
                $user->is_active ? 'active' : 'inactive',
                $user->created_at,
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="users_export_selected.csv"',
            'X-Export-Missing-Count' => $missingCount,
        ]);
    }

    public function addresses(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $addresses = $this->getUserAddressesQuery($user)->get();

        $payload = $addresses->map(fn (Address $address) => $this->formatAddressForResponse($address, $user));

        return $this->success($payload);
    }

    public function exportAddresses(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $addresses = $this->getUserAddressesQuery($user)->get();
        $rows = $addresses
            ->map(fn (Address $address) => $this->formatAddressForExport($address, $user))
            ->filter()
            ->values()
            ->all();

        $format = strtolower($request->query('format', 'xlsx'));
        $baseFilename = "user_{$user->id}_addresses_" . now()->format('Y-m-d');

        if ($format === 'csv') {
            return $this->buildAddressCsvResponse($rows, "{$baseFilename}.csv");
        }

        return $this->buildAddressSpreadsheetResponse($rows, "{$baseFilename}.xlsx");
    }

    public function exportAllAddresses(Request $request)
    {
        $addresses = Address::with(['user', 'country', 'stateRelation', 'city'])
            ->whereHas('user')
            ->orderByDesc('created_at')
            ->get();

        $rows = $addresses
            ->map(fn (Address $address) => $this->formatAddressForExport($address, $address->user))
            ->filter()
            ->values()
            ->all();

        $format = strtolower($request->query('format', 'xlsx'));
        $baseFilename = "users_addresses_" . now()->format('Y-m-d');

        if ($format === 'csv') {
            return $this->buildAddressCsvResponse($rows, "{$baseFilename}.csv");
        }

        return $this->buildAddressSpreadsheetResponse($rows, "{$baseFilename}.xlsx");
    }

    private function formatAddressForResponse(Address $address, User $user): array
    {
        $countryName = $address->country?->name;
        $stateName = $address->stateRelation?->name ?? $address->state;
        $cityName = $address->city?->name ?? $address->city;

        return [
            'id' => $address->id,
            'title' => $address->title,
            'name' => $address->name ?? $user->name,
            'email' => $address->email ?? $user->email,
            'phone_code' => $address->country_code,
            'phone' => $address->phone ?? $user->phone,
            'country_id' => $address->country_id,
            'country_name' => $countryName,
            'state_id' => $address->state_id,
            'state_name' => $stateName,
            'city_id' => $address->city_id,
            'city_name' => $cityName,
            'address_line' => $address->address_line,
            'formatted_address' => $address->formatted_address,
            'latitude' => $address->latitude,
            'longitude' => $address->longitude,
            'is_default_shipping' => $address->is_default_shipping,
            'is_default_billing' => $address->is_default_billing,
            'created_at' => $address->created_at,
            'updated_at' => $address->updated_at,
        ];
    }

    private function formatAddressForExport(Address $address, ?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        $countryName = $address->country?->name;
        $stateName = $address->stateRelation?->name ?? $address->state;
        $cityName = $address->city?->name ?? $address->city;
        $phone = $address->phone ?? $user->phone;
        $code = $address->country_code ?? $user->country_code;
        $phoneLabel = implode(
            " ",
            array_filter(
                [
                    trim((string) ($code ?? "")),
                    trim((string) ($phone ?? "")),
                ],
                fn ($value) => $value !== ""
            )
        );
        $addressLine = $address->address_line ?? $address->formatted_address ?? "";

        return [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_email' => $user->email,
            'user_phone' => $phoneLabel,
            'address_id' => $address->id,
            'title' => $address->title,
            'country' => $countryName,
            'state' => $stateName,
            'city' => $cityName,
            'address_line' => $addressLine,
            'lat' => $address->latitude,
            'lng' => $address->longitude,
            'created_at' => $address->created_at,
        ];
    }

    private function buildAddressCsvResponse(array $rows, string $filename)
    {
        $headers = [
            "User ID",
            "User Name",
            "User Email",
            "User Phone",
            "Address ID",
            "Title",
            "Country",
            "State",
            "City",
            "Address Line",
            "Lat",
            "Lng",
            "Created At",
        ];

        $handle = fopen("php://temp", "r+");
        fputcsv($handle, $headers);

        foreach ($rows as $row) {
            fputcsv($handle, [
                $row["user_id"] ?? "",
                $row["user_name"] ?? "",
                $row["user_email"] ?? "",
                $row["user_phone"] ?? "",
                $row["address_id"] ?? "",
                $row["title"] ?? "",
                $row["country"] ?? "",
                $row["state"] ?? "",
                $row["city"] ?? "",
                $row["address_line"] ?? "",
                $row["lat"] ?? "",
                $row["lng"] ?? "",
                $row["created_at"] ?? "",
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            "Content-Type" => "text/csv",
            "Content-Disposition" => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function buildAddressSpreadsheetResponse(array $rows, string $filename)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle("Addresses");

        $headers = [
            "A1" => "User ID",
            "B1" => "User Name",
            "C1" => "User Email",
            "D1" => "User Phone",
            "E1" => "Address ID",
            "F1" => "Title",
            "G1" => "Country",
            "H1" => "State",
            "I1" => "City",
            "J1" => "Address Line",
            "K1" => "Lat",
            "L1" => "Lng",
            "M1" => "Created At",
        ];

        foreach ($headers as $cell => $text) {
            $sheet->setCellValue($cell, $text);
        }

        $headerStyle = [
            "font" => ["bold" => true],
            "fill" => ["fillType" => Fill::FILL_SOLID, "startColor" => ["rgb" => "1F4E78"]],
            "alignment" => ["horizontal" => Alignment::HORIZONTAL_CENTER],
            "borders" => ["allBorders" => ["borderStyle" => Border::BORDER_THIN]],
        ];
        $sheet->getStyle("A1:M1")->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(22);

        $rowNumber = 2;
        foreach ($rows as $row) {
            $sheet->setCellValue("A{$rowNumber}", $row["user_id"] ?? "");
            $sheet->setCellValue("B{$rowNumber}", $row["user_name"] ?? "");
            $sheet->setCellValue("C{$rowNumber}", $row["user_email"] ?? "");
            $sheet->setCellValue("D{$rowNumber}", $row["user_phone"] ?? "");
            $sheet->setCellValue("E{$rowNumber}", $row["address_id"] ?? "");
            $sheet->setCellValue("F{$rowNumber}", $row["title"] ?? "");
            $sheet->setCellValue("G{$rowNumber}", $row["country"] ?? "");
            $sheet->setCellValue("H{$rowNumber}", $row["state"] ?? "");
            $sheet->setCellValue("I{$rowNumber}", $row["city"] ?? "");
            $sheet->setCellValue("J{$rowNumber}", $row["address_line"] ?? "");
            $sheet->setCellValue("K{$rowNumber}", $row["lat"] ?? "");
            $sheet->setCellValue("L{$rowNumber}", $row["lng"] ?? "");
            $sheet->setCellValue("M{$rowNumber}", $row["created_at"] ?? "");
            $rowNumber++;
        }

        foreach (range("A", "M") as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        if ($rowNumber > 2) {
            $dataStyle = [
                "borders" => ["allBorders" => ["borderStyle" => Border::BORDER_THIN]],
            ];
            $sheet->getStyle("A2:M" . ($rowNumber - 1))->applyFromArray($dataStyle);
        }

        $writer = new Xlsx($spreadsheet);
        $tempPath = storage_path("app/temp/{$filename}");

        if (!file_exists(storage_path("app/temp"))) {
            mkdir(storage_path("app/temp"), 0755, true);
        }

        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            "Content-Type" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ])->deleteFileAfterSend(true);
    }

    private function getUserAddressesQuery(User $user)
    {
        return $user->addresses()
            ->with(['country', 'stateRelation', 'city'])
            ->orderByDesc('created_at');
    }

    /**
     * Bulk action for users
     */
    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
            'action' => 'required|in:delete,change_role,activate,deactivate,password_reset',
            'role' => 'required_if:action,change_role|in:' . implode(',', self::MANAGEABLE_ROLES),
        ]);

        $ids = $validated['ids'];
        $action = $validated['action'];

        // Get current user to prevent self-modification
        $currentUser = request()->user();

        switch ($action) {
            case 'delete':
                // Don't delete self
                $ids = array_filter($ids, fn($id) => !$currentUser || $id != $currentUser->id);
                User::whereIn('id', $ids)->forceDelete();
                break;

            case 'change_role':
                User::whereIn('id', $ids)->update(['role' => $validated['role']]);
                break;

            case 'activate':
                User::whereIn('id', $ids)->update(['is_active' => true]);
                break;

            case 'deactivate':
                // Don't deactivate self
                $ids = array_filter($ids, fn($id) => !$currentUser || $id != $currentUser->id);
                User::whereIn('id', $ids)->update(['is_active' => false]);
                break;

            case 'password_reset':
                $successCount = 0;
                $failCount = 0;
                $frontendUrl = config('app.frontend_url', 'http://localhost:3000');

                foreach ($ids as $id) {
                    $targetUser = User::find($id);
                    if (!$targetUser) {
                        $failCount++;
                        continue;
                    }

                    try {
                        $token = app('auth.password.broker')->createToken($targetUser);
                        $resetUrl = "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($targetUser->email);
                        \Mail::to($targetUser->email)->send(new \App\Mail\PasswordResetMail($targetUser, $resetUrl));
                        $successCount++;
                    } catch (\Exception $e) {
                        $failCount++;
                        \Log::error('Failed to send bulk password reset email: ' . $e->getMessage(), [
                            'user_id' => $id,
                            'email' => $targetUser->email ?? null,
                        ]);
                    }
                }

                if ($successCount === 0) {
                    return $this->error('Failed to send password reset emails. Please check mail configuration.', 500);
                }

                return $this->success([
                    'sent' => $successCount,
                    'failed' => $failCount,
                ], "Password reset links sent to {$successCount} user(s).");
        }

        return $this->success(null, 'Bulk action completed successfully');
    }
}
